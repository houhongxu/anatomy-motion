#!/usr/bin/env python3
"""部署唯一预览并完整回滚 / Deploy the single preview with complete rollback."""
import argparse
import copy
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMESPACE = "anatomy-motion"
APP = "anatomy-motion-preview"
IMAGE_REPOSITORY = "ghcr.io/houhongxu/anatomy-motion"
SELECTION = "preview-selection"
STATE = "preview-state"
ROLLBACK = "preview-rollback"
SHA_RE = re.compile(r"[0-9a-f]{40}")
DIGEST_RE = re.compile(r"sha256:[0-9a-f]{64}")

class DeployError(RuntimeError):
    pass

class Kubectl:
    def call(self, *args, payload=None, request_timeout="15s"):
        result = subprocess.run(
            ["kubectl", "--namespace", NAMESPACE, "--request-timeout=" + request_timeout, *args],
            input=json.dumps(payload) if payload is not None else None,
            text=True, capture_output=True,
        )
        if result.returncode:
            # kubectl errors contain no kubeconfig/token content; keep diagnostics bounded.
            raise DeployError("kubectl " + " ".join(args[:3]) + ": " + result.stderr.strip()[-1800:])
        return result.stdout

    def get(self, kind, name):
        result = self.call("get", kind, name, "--ignore-not-found", "-o", "json")
        return json.loads(result) if result.strip() else None

    def update_configmap(self, name, data, expected_version=None):
        current = self.get("configmap", name)
        if current is None:
            raise DeployError("Required precreated ConfigMap is missing: " + name)
        if name not in {STATE, ROLLBACK}:
            raise DeployError("Refusing to modify authority or unrelated ConfigMap.")
        if expected_version is not None and current["metadata"].get("resourceVersion") != expected_version:
            raise DeployError("Preview state changed concurrently; refusing stale update.")
        current["data"] = {key: str(value) for key, value in data.items()}
        # replace retains resourceVersion: concurrent writes fail before silently clobbering state.
        result = self.call("replace", "-f", "-", "-o", "json", payload=current)
        return json.loads(result)

    def apply(self, resources):
        self.call("apply", "-f", "-", payload={"apiVersion": "v1", "kind": "List", "items": resources})

    def restore(self, snapshot):
        if snapshot["existed"]:
            patch = [
                {"op": "replace", "path": "/spec/template", "value": snapshot["template"]},
                {"op": "replace", "path": "/spec/strategy", "value": snapshot["strategy"]},
                {"op": "replace", "path": "/spec/replicas", "value": snapshot["replicas"]},
            ]
            self.call("patch", "deployment", APP, "--type=json", "-p", json.dumps(patch))
            self.rollout()
        elif self.get("deployment", APP) is not None:
            self.call("scale", "deployment/" + APP, "--replicas=0")

    def rollout(self):
        self.call("rollout", "status", "deployment/" + APP, "--timeout=180s", request_timeout="190s")

def positive_integer(value, field):
    value = str(value)
    if not re.fullmatch(r"[1-9][0-9]*", value):
        raise DeployError(field + " must be a positive integer.")
    return int(value)

def validate_inputs(sha, pr, run_id, image, repository):
    if not SHA_RE.fullmatch(sha):
        raise DeployError("SHA must be exactly 40 lowercase hexadecimal characters.")
    positive_integer(pr, "PR")
    positive_integer(run_id, "Run ID")
    if repository != "houhongxu/anatomy-motion":
        raise DeployError("Unexpected repository.")
    if image != IMAGE_REPOSITORY + ":sha-" + sha:
        prefix = IMAGE_REPOSITORY + "@"
        if not image.startswith(prefix) or not DIGEST_RE.fullmatch(image[len(prefix):]):
            raise DeployError("Image must be the matching full-SHA tag or an immutable repository digest.")

def read_pull_request(repository, pr):
    result = subprocess.run(
        ["gh", "api", "repos/" + repository + "/pulls/" + str(pr)],
        text=True, capture_output=True,
    )
    if result.returncode:
        raise DeployError("Cannot revalidate pull request: " + result.stderr.strip()[-1000:])
    return json.loads(result.stdout)

def verify_pr(pr_data, repository, sha):
    if (
        pr_data.get("state") != "open"
        or pr_data.get("head", {}).get("sha") != sha
        or pr_data.get("head", {}).get("repo", {}).get("full_name") != repository
        or pr_data.get("base", {}).get("repo", {}).get("full_name") != repository
        or "deploy-preview" not in {label.get("name") for label in pr_data.get("labels", [])}
    ):
        raise DeployError("PR is stale, closed, unlabelled, or from another repository.")

def verify_authority(client, repository, pr, sha, pr_reader):
    selected = client.get("configmap", SELECTION)
    if selected is None or selected.get("data", {}).get("pr") != str(pr):
        raise DeployError("The live preview-selection ConfigMap no longer selects this PR.")
    verify_pr(pr_reader(repository, pr), repository, sha)

def require_healthy_previous(deployment):
    replicas = deployment["spec"].get("replicas", 1)
    if replicas == 0:
        return
    generation = deployment.get("metadata", {}).get("generation")
    status = deployment.get("status", {})
    if (
        not isinstance(generation, int)
        or status.get("observedGeneration", 0) < generation
        or any(status.get(field, 0) != replicas for field in ("readyReplicas", "updatedReplicas", "availableReplicas"))
    ):
        raise DeployError("Existing Deployment is not fully healthy; refusing to overwrite recovery evidence.")

def snapshot_of(deployment, sha, pr, run_id):
    snapshot = {
        "version": 1, "existed": deployment is not None,
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "attempt": {"sha": sha, "pr": int(pr), "runId": int(run_id)},
    }
    if deployment is not None:
        require_healthy_previous(deployment)
        spec = deployment["spec"]
        snapshot.update({
            "deploymentUid": deployment.get("metadata", {}).get("uid"),
            "template": copy.deepcopy(spec["template"]),
            "replicas": spec.get("replicas", 1),
            "strategy": copy.deepcopy(spec.get("strategy", {"type": "RollingUpdate"})),
        })
    return snapshot

def render_resources(image):
    resources = json.loads((ROOT / "deploy/preview.yaml").read_text())["items"]
    allowed = {
        ("PersistentVolumeClaim", "anatomy-motion-data"),
        ("Deployment", APP), ("Service", APP), ("Ingress", APP),
    }
    actual = {(r["kind"], r["metadata"]["name"]) for r in resources}
    if actual != allowed or len(resources) != len(allowed):
        raise DeployError("Unexpected application resource set.")
    for resource in resources:
        if resource["metadata"].get("namespace") != NAMESPACE:
            raise DeployError("Refusing a resource outside the application namespace.")
        if resource["kind"] == "Deployment":
            resource["spec"]["template"]["spec"]["containers"][0]["image"] = image
    return resources

def deploy(client, *, sha, pr, run_id, image, repository="houhongxu/anatomy-motion", pr_reader=read_pull_request):
    validate_inputs(sha, pr, run_id, image, repository)
    pr, run_id = int(pr), int(run_id)
    verify_authority(client, repository, pr, sha, pr_reader)
    state_object = client.get("configmap", STATE)
    rollback_object = client.get("configmap", ROLLBACK)
    if state_object is None or rollback_object is None:
        raise DeployError("Bootstrap preview-state and preview-rollback before deployment.")
    state = dict(state_object.get("data", {}))
    high = state.get("highestRunId", "0")
    if not re.fullmatch(r"[0-9]+", high):
        raise DeployError("Stored highestRunId is invalid.")
    if run_id < int(high):
        raise DeployError("A newer run already owns the preview; refusing an older run.")
    if run_id == int(high) and state.get("attemptSha") not in {None, sha}:
        raise DeployError("The same run ID cannot represent a different SHA.")

    previous = client.get("deployment", APP)
    snapshot = snapshot_of(previous, sha, pr, run_id)
    # Fail closed if saving recovery evidence fails, before any workload mutation.
    state.update(highestRunId=str(run_id), attemptSha=sha, attemptPr=str(pr), status="pending")
    claimed = client.update_configmap(STATE, state, expected_version=state_object["metadata"]["resourceVersion"])
    workload_touched = False
    try:
        client.update_configmap(ROLLBACK, {"snapshot.json": json.dumps(snapshot, separators=(",", ":"))})
        verify_authority(client, repository, pr, sha, pr_reader)
        resources = render_resources(image)
        workload_touched = True
        client.apply(resources)
        client.rollout()
        state.update(
            status="ready", successfulSha=sha, successfulPr=str(pr),
            successfulRunId=str(run_id), successfulImage=image,
        )
        client.update_configmap(STATE, state, expected_version=claimed["metadata"]["resourceVersion"])
    except Exception as original:
        live = client.get("configmap", STATE)
        if live is None or live.get("data", {}).get("highestRunId") != str(run_id):
            raise DeployError("A newer run owns the preview; skipping stale recovery.") from original
        rollback_error = None
        try:
            if workload_touched:
                client.restore(snapshot)
        except Exception as error:
            rollback_error = error
        state["status"] = "rollback-failed" if rollback_error else ("rolled-back" if workload_touched else "rejected")
        try:
            client.update_configmap(STATE, state, expected_version=live["metadata"]["resourceVersion"])
        except Exception as error:
            if rollback_error is None:
                rollback_error = error
        if rollback_error:
            raise DeployError(f"Deployment failed: {original}. Recovery needs attention: {rollback_error}") from original
        raise DeployError(f"Deployment failed and recovery completed: {original}") from original
    return {"namespace": NAMESPACE, "deployment": APP, "pr": pr, "sha": sha, "runId": run_id, "image": image}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--pr", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--repository", default="houhongxu/anatomy-motion")
    args = parser.parse_args()
    print(json.dumps(deploy(Kubectl(), sha=args.sha, pr=args.pr, run_id=args.run_id, image=args.image, repository=args.repository)))
if __name__ == "__main__":
    try:
        main()
    except (DeployError, json.JSONDecodeError, OSError) as error:
        print("Preview deployment failed / 预览部署失败: " + str(error), file=sys.stderr)
        raise SystemExit(1)
