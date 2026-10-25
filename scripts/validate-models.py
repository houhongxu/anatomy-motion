#!/usr/bin/env python3
"""校验结构索引及网格完整性 / Validate catalog and mesh integrity."""
import hashlib,json,math
from pathlib import Path
from collections import Counter
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'shared/anatomy-manifest.json').read_text())
assert manifest==json.loads((root/'models/manifest.json').read_text()),'Catalog copies differ'
ids=set(); counts=Counter(); total=0
for item in manifest['structures']:
    assert item['id'] not in ids,'Duplicate structure'
    ids.add(item['id']);counts[item['kind']]+=1
    assert item['side'] in ['left','right','midline']
    assert item['layer'] in ['superficial','deep','support']
    path=(root/'models'/item['file']).resolve()
    assert path.is_relative_to(root/'models'),'Unsafe asset path'
    raw=path.read_bytes();assert hashlib.sha256(raw).hexdigest()==item['sha256'],'Asset digest mismatch'
    mesh=json.loads(raw);p,n,i=mesh['positions'],mesh['normals'],mesh['indices']
    assert p and i and len(p)%3==0 and len(i)%3==0 and len(n)==len(p)
    assert all(math.isfinite(v) for v in p+n)
    assert all(isinstance(v,int) and 0<=v<len(p)//3 for v in i)
    assert all(abs(v)<3 for v in p),'Unexpected scale'
    assert all(abs(math.sqrt(sum(x*x for x in n[j:j+3]))-1)<0.001 or sum(x*x for x in n[j:j+3])==0 for j in range(0,len(n),3))
    assert item['triangles']==len(i)//3
    total+=len(i)//3
assert counts['muscle']>0 and counts['tendon']>0 and counts['bone']>0
print(f'Validated {len(ids)} structures, {total} triangles; {dict(counts)}')
