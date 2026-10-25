#!/usr/bin/env python3
"""验证并准备官方网页构建 / Verify and prepare the official web build."""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "houhongxu/anatomy-motion"

def validate_metadata(metadata):
    for field in ("sourceSha", "sourceTree"):
        if not re.fullmatch(r"[a-f0-9]{40}", metadata.get(field, "")):
            raise ValueError("Invalid " + field)
    if not re.fullmatch(r"[a-f0-9]{64}", metadata.get("sha256", "")):
        raise ValueError("Invalid artifact SHA256")
    if metadata.get("tag") != "web-" + metadata["sourceSha"]:
        raise ValueError("Artifact tag must name its full source SHA")
    if metadata.get("asset") != "web-desktop.tar.gz":
        raise ValueError("Unexpected web artifact name")

def verify_creator_tree(metadata, runner=subprocess.run):
    for revision in ("HEAD:creator", metadata["sourceSha"] + ":creator"):
        result = runner(["git", "rev-parse", revision], cwd=ROOT, text=True, capture_output=True)
        if result.returncode or result.stdout.strip() != metadata["sourceTree"]:
            raise ValueError("Creator tree differs from the verified official web build: " + revision)

def extract_bundle(archive, output, expected_sha256):
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != expected_sha256:
        raise ValueError("Downloaded web artifact SHA256 does not match metadata")
    if output.exists():
        raise ValueError("Refusing to overwrite an existing web output directory")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:gz") as bundle, tempfile.TemporaryDirectory(prefix="verified-web-", dir=output.parent) as work:
        staging = Path(work) / "web"
        staging.mkdir()
        members = bundle.getmembers()
        if len(members) > 10000 or sum(m.size for m in members) > 1024 ** 3:
            raise ValueError("Web artifact exceeds expected extraction bounds")
        seen = set()
        for member in members:
            path = PurePosixPath(member.name)
            if path.is_absolute() or ".." in path.parts or "\\" in member.name:
                raise ValueError("Unsafe artifact path: " + member.name)
            if not (member.isdir() or member.isfile()):
                raise ValueError("Artifact links and special files are forbidden: " + member.name)
            normalized = str(path)
            if normalized in seen:
                raise ValueError("Duplicate artifact path: " + member.name)
            seen.add(normalized)
            target = staging.joinpath(*path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(member) as source, target.open("xb") as destination:
                    shutil.copyfileobj(source, destination)
        if not (staging / "index.html").is_file():
            raise ValueError("Web bundle must contain index.html at its root")
        os.replace(staging, output)
    return {"sha256": digest, "files": len([p for p in output.rglob("*") if p.is_file()])}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata", default="deploy/web-build.json")
    args = parser.parse_args()
    metadata = json.loads((ROOT / args.metadata).read_text())
    validate_metadata(metadata)
    verify_creator_tree(metadata)
    output = ROOT / ".build/web"
    with tempfile.TemporaryDirectory(prefix="anatomy-web-download-") as download:
        result = subprocess.run([
            "gh", "release", "download", metadata["tag"], "--repo", REPOSITORY,
            "--pattern", metadata["asset"], "--dir", download,
        ], text=True, capture_output=True)
        if result.returncode:
            raise ValueError("Cannot download official web artifact: " + result.stderr[-1000:])
        print(json.dumps(extract_bundle(Path(download)/metadata["asset"], output, metadata["sha256"])))
if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, tarfile.TarError) as error:
        raise SystemExit("Web artifact rejected / 网页构建被拒绝: " + str(error))
