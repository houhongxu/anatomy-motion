#!/usr/bin/env bash
# 获取官方数据并验证 / Fetch and verify official data.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache
base=https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST
for name in isa_parts_list_e.txt isa_element_parts.txt isa_inclusion_relation_list.txt; do
  curl -fL --retry 4 --retry-all-errors --connect-timeout 20 "$base/$name" -o ".cache/$name"
done
curl -fL -C - --retry 6 --retry-all-errors --connect-timeout 20 "$base/isa_BP3D_4.0_obj_99.zip" -o .cache/bodyparts3d-complete.zip
python3 - <<'PY'
import hashlib,json
from pathlib import Path
path=Path('shared/anatomy-manifest.json')
if path.exists():
 expected=json.loads(path.read_text())['sourceArchiveSha256']
 actual=hashlib.sha256(Path('.cache/bodyparts3d-complete.zip').read_bytes()).hexdigest()
 if expected!=actual: raise SystemExit('Source archive digest changed; review before regenerating. / 源文件哈希变化，请先审核。')
PY
python3 scripts/prepare-models.py
python3 scripts/validate-models.py
