"""预览部署边界测试 / Preview deployment boundary tests (offline, standard library)."""
import copy
import hashlib
import importlib.util
import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[2]

def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

deploy = load_module("deploy_preview", "scripts/deploy-preview.py")
web = load_module("prepare_web", "deploy/prepare-web.py")
SHA = "a"*40
IMAGE = deploy.IMAGE_REPOSITORY + "@sha256:" + "b"*64

def pr_data():
    return {
        "state": "open", "head": {"sha": SHA, "repo": {"full_name": "houhongxu/anatomy-motion"}},
        "base": {"repo": {"full_name": "houhongxu/anatomy-motion"}},
        "labels": [{"name": "deploy-preview"}],
    }

def old_deployment():
    return {
        "metadata": {"name": deploy.APP, "uid": "existing-uid", "generation": 5},
        "status": {"observedGeneration":5,"readyReplicas":2,"updatedReplicas":2,"availableReplicas":2},
        "spec": {
            "replicas": 2, "strategy": {"type": "RollingUpdate", "rollingUpdate": {"maxSurge": 0, "maxUnavailable": 1}},
            "template": {
                "metadata": {"labels": {"app": "legacy"}, "annotations": {"healthy": "saved"}},
                "spec": {
                    "nodeSelector": {"kubernetes.io/hostname": "old-node", "role": "heavy-worker"},
                    "tolerations": [{"key": "legacy", "operator": "Exists", "effect": "NoSchedule"}],
                    "containers": [{"name": "app", "image": "old-image", "env": [{"name": "OLD", "value": "preserve"}]}],
                },
            },
        },
    }

class FakeKubectl:
    def __init__(self, previous=True):
        self.objects = {
            ("configmap",deploy.SELECTION): {"metadata":{"resourceVersion":"1"},"data":{"pr":"7"}},
            ("configmap",deploy.STATE): {"metadata":{"resourceVersion":"1"},"data":{"highestRunId":"10","successfulSha":"old","status":"ready"}},
            ("configmap",deploy.ROLLBACK): {"metadata":{"resourceVersion":"1"},"data":{}},
        }
        if previous:
            self.objects[("deployment",deploy.APP)] = old_deployment()
        self.actions = []
        self.failed_rollouts = 0
        self.fail_snapshot = False
        self.selection_reads = 0
        self.change_selection = False
        self.concurrent_claim = False

    def get(self, kind, name):
        if name == deploy.SELECTION:
            self.selection_reads += 1
            if self.change_selection and self.selection_reads > 1:
                return {"data":{"pr":"999"}}
        return copy.deepcopy(self.objects.get((kind,name)))

    def update_configmap(self, name, data, expected_version=None):
        current = self.objects[("configmap",name)]
        if self.concurrent_claim and name == deploy.STATE:
            current["metadata"]["resourceVersion"] = "99"
            current["data"]["highestRunId"] = "99"
        if expected_version is not None and current["metadata"]["resourceVersion"] != expected_version:
            raise deploy.DeployError("Concurrent state change")
        if self.fail_snapshot and name == deploy.ROLLBACK:
            raise deploy.DeployError("Snapshot write failed")
        self.actions.append(("configmap",name))
        current["data"] = copy.deepcopy(data)
        current["metadata"]["resourceVersion"] = str(int(current["metadata"]["resourceVersion"])+1)
        return copy.deepcopy(current)

    def apply(self, resources):
        self.actions.append(("apply",))
        for resource in resources:
            kind = {"Deployment":"deployment","PersistentVolumeClaim":"pvc"}.get(resource["kind"],resource["kind"].lower())
            self.objects[(kind,resource["metadata"]["name"])] = copy.deepcopy(resource)

    def rollout(self):
        self.actions.append(("rollout",))
        if self.failed_rollouts:
            self.failed_rollouts -= 1
            raise deploy.DeployError("Rollout timed out")

    def restore(self, snapshot):
        self.actions.append(("restore",))
        current = self.objects.get(("deployment",deploy.APP))
        if snapshot["existed"]:
            current["spec"]["template"] = copy.deepcopy(snapshot["template"])
            current["spec"]["strategy"] = copy.deepcopy(snapshot["strategy"])
            current["spec"]["replicas"] = snapshot["replicas"]
            self.rollout()
        elif current is not None:
            current["spec"]["replicas"] = 0
            self.actions.append(("scale-zero",))

class DeployTests(unittest.TestCase):
    def run_deploy(self, client, **overrides):
        kwargs = {"sha":SHA,"pr":"7","run_id":"11","image":IMAGE,"pr_reader":lambda *_:pr_data()}
        kwargs.update(overrides)
        return deploy.deploy(client, **kwargs)

    def test_reject_malformed_identifiers_and_image(self):
        for change in [
            {"sha":"a"*7}, {"pr":"0"}, {"pr":"7; touch /tmp/x"}, {"run_id":"-1"},
            {"image":"ghcr.io/other/app@sha256:"+"b"*64},
            {"image":deploy.IMAGE_REPOSITORY+":sha-"+"c"*40},
        ]:
            with self.subTest(change=change), self.assertRaises(deploy.DeployError):
                self.run_deploy(FakeKubectl(), **change)

    def test_accept_matching_full_sha_tag(self):
        self.run_deploy(FakeKubectl(),image=deploy.IMAGE_REPOSITORY+":sha-"+SHA)

    def test_lower_run_does_not_write_anything(self):
        client = FakeKubectl()
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client,run_id="9")
        self.assertEqual(client.actions,[])

    def test_same_run_cannot_represent_different_sha(self):
        client = FakeKubectl()
        client.objects[("configmap",deploy.STATE)]["data"].update(attemptSha="c"*40)
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client,run_id="10")
        self.assertEqual(client.actions,[])

    def test_selection_must_match(self):
        client = FakeKubectl()
        client.objects[("configmap",deploy.SELECTION)]["data"]["pr"] = "8"
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        self.assertEqual(client.actions,[])

    def test_live_pr_identity_and_label_are_rechecked(self):
        for change in ["head","repo","label","state"]:
            data = pr_data()
            if change == "head": data["head"]["sha"] = "c"*40
            if change == "repo": data["head"]["repo"]["full_name"] = "fork/app"
            if change == "label": data["labels"] = []
            if change == "state": data["state"] = "closed"
            with self.subTest(change=change), self.assertRaises(deploy.DeployError):
                self.run_deploy(FakeKubectl(),pr_reader=lambda *_:data)

    def test_missing_bootstrap_fails_before_mutation(self):
        client = FakeKubectl()
        del client.objects[("configmap",deploy.ROLLBACK)]
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        self.assertEqual(client.actions,[])

    def test_snapshot_saved_before_workload_and_success_records_provenance(self):
        client = FakeKubectl()
        result = self.run_deploy(client)
        snapshot = json.loads(client.objects[("configmap",deploy.ROLLBACK)]["data"]["snapshot.json"])
        self.assertEqual(snapshot["template"],old_deployment()["spec"]["template"])
        self.assertEqual(snapshot["strategy"],old_deployment()["spec"]["strategy"])
        self.assertEqual(snapshot["replicas"],2)
        self.assertLess(client.actions.index(("configmap",deploy.ROLLBACK)),client.actions.index(("apply",)))
        state = client.objects[("configmap",deploy.STATE)]["data"]
        self.assertEqual((state["successfulSha"],state["successfulPr"],state["successfulRunId"]),(SHA,"7","11"))
        self.assertEqual(state["successfulImage"],IMAGE)
        self.assertEqual(result["runId"],11)

    def test_failed_rollout_restores_complete_pod_template_strategy_replicas(self):
        client = FakeKubectl()
        client.failed_rollouts = 1
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        restored = client.objects[("deployment",deploy.APP)]["spec"]
        self.assertEqual(restored["template"],old_deployment()["spec"]["template"])
        self.assertEqual(restored["strategy"],old_deployment()["spec"]["strategy"])
        self.assertEqual(restored["replicas"],2)
        state = client.objects[("configmap",deploy.STATE)]["data"]
        self.assertEqual(state["highestRunId"],"11")
        self.assertEqual(state["successfulSha"],"old")
        self.assertEqual(state["status"],"rolled-back")

    def test_real_kubectl_restore_uses_exact_replace_patch_and_full_rollout_budget(self):
        client = deploy.Kubectl()
        client.call = Mock(return_value="")
        snapshot = deploy.snapshot_of(old_deployment(),SHA,7,11)
        client.restore(snapshot)
        patch_call = client.call.call_args_list[0]
        patch = json.loads(patch_call.args[-1])
        self.assertEqual({p["path"]:p["value"] for p in patch},{
            "/spec/template":old_deployment()["spec"]["template"],
            "/spec/strategy":old_deployment()["spec"]["strategy"],
            "/spec/replicas":2,
        })
        self.assertEqual(client.call.call_args_list[1].kwargs["request_timeout"],"190s")

    def test_unhealthy_existing_deployment_cannot_replace_recovery_snapshot(self):
        for field in ["readyReplicas","updatedReplicas","availableReplicas","observedGeneration"]:
            client = FakeKubectl()
            client.objects[("deployment",deploy.APP)]["status"][field] = 0
            with self.subTest(field=field), self.assertRaises(deploy.DeployError):
                self.run_deploy(client)
            self.assertEqual(client.actions,[])

    def test_zero_replica_failed_first_attempt_can_retry(self):
        client = FakeKubectl()
        client.objects[("deployment",deploy.APP)]["spec"]["replicas"] = 0
        client.objects[("deployment",deploy.APP)]["status"] = {}
        self.run_deploy(client)

    def test_first_failure_scales_zero_and_keeps_pvc(self):
        client = FakeKubectl(previous=False)
        client.failed_rollouts = 1
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        self.assertEqual(client.objects[("deployment",deploy.APP)]["spec"]["replicas"],0)
        self.assertIn(("pvc","anatomy-motion-data"),client.objects)
        self.assertIn(("scale-zero",),client.actions)
        self.assertFalse(any(action[0]=="delete" for action in client.actions))

    def test_unsaved_snapshot_never_mutates_workload(self):
        client = FakeKubectl()
        client.fail_snapshot = True
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        self.assertFalse(any(a[0] in {"apply","restore","scale-zero"} for a in client.actions))

    def test_changed_selection_before_apply_rejects_without_workload_mutation(self):
        client = FakeKubectl()
        client.change_selection = True
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        self.assertNotIn(("apply",),client.actions)
        self.assertNotIn(("restore",),client.actions)

    def test_concurrent_state_claim_cannot_lower_highest_run(self):
        client = FakeKubectl()
        client.concurrent_claim = True
        with self.assertRaises(deploy.DeployError):
            self.run_deploy(client)
        self.assertEqual(client.objects[("configmap",deploy.STATE)]["data"]["highestRunId"],"99")
        self.assertNotIn(("apply",),client.actions)

class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.resources = deploy.render_resources(IMAGE)
        self.by_kind = {r["kind"]:r for r in self.resources}

    def test_single_recreate_pinned_nonroot_persistent_workload(self):
        deployment = self.by_kind["Deployment"]
        spec = deployment["spec"]
        pod = spec["template"]["spec"]
        container = pod["containers"][0]
        self.assertEqual(spec["replicas"],1)
        self.assertEqual(spec["strategy"],{"type":"Recreate"})
        self.assertEqual(pod["nodeSelector"],{"kubernetes.io/hostname":"vm-12-8-ubuntu"})
        self.assertIn({"key":"node-role","operator":"Equal","value":"control-plane","effect":"NoSchedule"},pod["tolerations"])
        self.assertFalse(pod["automountServiceAccountToken"])
        self.assertNotIn("imagePullSecrets",pod)
        self.assertEqual(pod["securityContext"]["runAsUser"],1000)
        self.assertEqual(pod["securityContext"]["fsGroup"],1000)
        self.assertEqual(container["securityContext"]["capabilities"]["drop"],["ALL"])
        self.assertFalse(container["securityContext"]["allowPrivilegeEscalation"])
        self.assertEqual(container["resources"]["limits"]["memory"],"768Mi")
        self.assertEqual(container["image"],IMAGE)
        self.assertEqual(pod["volumes"][0]["persistentVolumeClaim"]["claimName"],"anatomy-motion-data")
        self.assertEqual(self.by_kind["PersistentVolumeClaim"]["spec"]["storageClassName"],"local-path")
        for probe in ["readinessProbe","livenessProbe"]:
            self.assertEqual(container[probe]["httpGet"]["path"],"/api/health")

    def test_tls_host_origin_and_service_agree(self):
        ingress = self.by_kind["Ingress"]
        host = ingress["spec"]["rules"][0]["host"]
        self.assertEqual(ingress["spec"]["tls"][0]["hosts"],[host])
        self.assertEqual(ingress["metadata"]["annotations"]["traefik.ingress.kubernetes.io/router.tls.certresolver"],"zeropress")
        env = {e["name"]:e["value"] for e in self.by_kind["Deployment"]["spec"]["template"]["spec"]["containers"][0]["env"]}
        self.assertEqual(env["APP_ORIGIN"],"https://"+host)
        self.assertEqual(env["DATABASE_PATH"],"/data/anatomy.sqlite")
        self.assertEqual(env["WEB_ROOT"],"/app/web")

    def test_rbac_denies_secrets_delete_and_selector_write(self):
        objects = json.loads((ROOT/"deploy/rbac.yaml").read_text())["items"]
        role = next(o for o in objects if o["kind"]=="Role")
        for rule in role["rules"]:
            self.assertNotIn("secrets",rule["resources"])
            self.assertNotIn("delete",rule["verbs"])
            self.assertNotIn("*",rule["resources"])
            if "configmaps" in rule["resources"] and any(v!="get" for v in rule["verbs"]):
                self.assertEqual(set(rule["resourceNames"]),{deploy.STATE,deploy.ROLLBACK})
                self.assertNotIn("create",rule["verbs"])

    def test_namespace_restricted_policy_and_safe_bootstrap(self):
        namespace = json.loads((ROOT/"deploy/namespace.yaml").read_text())
        for mode in ["enforce","audit","warn"]:
            self.assertEqual(namespace["metadata"]["labels"]["pod-security.kubernetes.io/"+mode],"restricted")
            self.assertEqual(namespace["metadata"]["labels"]["pod-security.kubernetes.io/"+mode+"-version"],"v1.36")
        bootstrap = json.loads((ROOT/"deploy/bootstrap.yaml").read_text())["items"]
        self.assertEqual({x["metadata"]["name"] for x in bootstrap},{deploy.SELECTION,deploy.STATE,deploy.ROLLBACK})
        self.assertEqual(next(x for x in bootstrap if x["metadata"]["name"]==deploy.SELECTION)["data"]["pr"],"0")

    def test_container_keeps_code_and_model_license_texts(self):
        docker = (ROOT/"Dockerfile").read_text()
        self.assertEqual(docker.count("FROM node:22-bookworm-slim"),2)
        self.assertIn("LICENSE ./LICENSE",docker)
        self.assertIn("CC-BY-4.0.txt ./models/LICENSE-CC-BY-4.0.txt",docker)
        self.assertTrue((ROOT/"deploy/licenses/CC-BY-4.0.txt").read_text().startswith("Attribution 4.0 International"))

    def test_workflow_guards_head_sha_digest_tunnel_and_no_cleanup(self):
        text = (ROOT/".github/workflows/preview.yml").read_text()
        for required in ["head.repo.full_name == github.repository","vars.PREVIEW_PR_NUMBER","if: vars.PREVIEW_DEPLOY_ENABLED == 'true'","deploy-preview","cancel-in-progress: false","github.event.pull_request.head.sha","steps.image.outputs.digest","StrictHostKeyChecking=yes","127.0.0.1:16443:127.0.0.1:6443","trap cleanup EXIT","sha256sum --check","v1.36.2"]:
            self.assertIn(required,text)
        self.assertNotIn("StrictHostKeyChecking=no",text)
        self.assertNotIn("pull_request_target",text)
        self.assertNotIn("closed]",text)
        self.assertNotIn("kubectl delete",text)

class WebArtifactTests(unittest.TestCase):
    def make_tar(self, directory, members):
        archive = directory/"web.tar.gz"
        with tarfile.open(archive,"w:gz") as bundle:
            for name,kind,body in members:
                info = tarfile.TarInfo(name)
                if kind == "file":
                    encoded = body.encode()
                    info.size = len(encoded)
                    bundle.addfile(info,io.BytesIO(encoded))
                else:
                    info.type = kind
                    info.linkname = "../outside"
                    bundle.addfile(info)
        return archive,hashlib.sha256(archive.read_bytes()).hexdigest()

    def test_accept_verified_bundle_and_reject_digest_mismatch(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            archive,digest = self.make_tar(directory,[("./index.html","file","hello"),("./assets/a.js","file","code")])
            self.assertEqual(web.extract_bundle(archive,directory/"web",digest)["files"],2)
            self.assertEqual((directory/"web/index.html").read_text(),"hello")
            with self.assertRaises(ValueError):
                web.extract_bundle(archive,directory/"wrong","0"*64)

    def test_reject_traversal_absolute_links_and_duplicates(self):
        cases = [
            [("../escape","file","x")], [("/absolute","file","x")],
            [("link",tarfile.SYMTYPE,"")], [("hardlink",tarfile.LNKTYPE,"")],
            [("index.html","file","x"),("./index.html","file","y")],
            [("safe\\unsafe","file","x")],
        ]
        for members in cases:
            with self.subTest(members=members), tempfile.TemporaryDirectory() as temp:
                directory = Path(temp)
                archive,digest = self.make_tar(directory,members)
                with self.assertRaises(ValueError):
                    web.extract_bundle(archive,directory/"web",digest)
                self.assertFalse((directory/"web").exists())

    def test_reject_stale_creator_tree_and_malformed_metadata(self):
        metadata = json.loads((ROOT/"deploy/web-build.json").read_text())
        web.validate_metadata(metadata)
        result = Mock(returncode=0,stdout="c"*40+"\n")
        with self.assertRaises(ValueError):
            web.verify_creator_tree(metadata,runner=Mock(return_value=result))
        bad = dict(metadata,tag="latest")
        with self.assertRaises(ValueError):
            web.validate_metadata(bad)

if __name__=="__main__":
    unittest.main()
