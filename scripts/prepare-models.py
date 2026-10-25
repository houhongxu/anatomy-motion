#!/usr/bin/env python3
"""提取真实 BodyParts3D 网格 / Extract real BodyParts3D meshes."""
import csv, hashlib, json, math, zipfile
from collections import defaultdict, Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache'
OUT=ROOT/'models'

def read_table(name):
    return list(csv.DictReader((CACHE/name).open(encoding='utf-8-sig'), delimiter='\t'))

def obj_geometry(text):
    vertices=[]; indices=[]
    for line in text.splitlines():
        fields=line.split()
        if not fields: continue
        if fields[0]=='v': vertices.append(tuple(map(float,fields[1:4])))
        elif fields[0]=='f':
            face=[]
            for item in fields[1:]:
                i=int(item.split('/')[0]); face.append(i-1 if i>0 else len(vertices)+i)
            for i in range(1,len(face)-1): indices.extend([face[0],face[i],face[i+1]])
    if not vertices or not indices: raise ValueError('Empty OBJ mesh')
    if min(indices)<0 or max(indices)>=len(vertices): raise ValueError('Invalid OBJ index')
    return vertices,indices

def main():
    source=CACHE/'bodyparts3d-complete.zip'
    archive=zipfile.ZipFile(source)
    paths={Path(p).stem:p for p in archive.namelist() if p.endswith('.obj')}
    elements=defaultdict(set); names={}; candidates=defaultdict(list)
    for row in read_table('isa_element_parts.txt'):
        cid=row['concept id']; fid=row['element file id']
        elements[cid].add(fid); names[cid]=row['name']
    for cid,ids in elements.items():
        for fid in ids: candidates[fid].append(cid)
    tendons=set(elements['FMA9721'])
    for cid,name in names.items():
        if 'tendon' in name and 'sheath' not in name: tendons.update(elements[cid])
    groups={'muscle':elements['FMA5022']-tendons, 'tendon':tendons, 'bone':elements['FMA5018']-tendons}
    meshes={}; metadata=[]
    superficial=('trapezius','deltoid','pectoralis major','latissimus dorsi','biceps brachii','triceps brachii','brachioradialis','external oblique','rectus abdominis','gluteus maximus','sartorius','rectus femoris','vastus lateralis','vastus medialis','gastrocnemius','tibialis anterior','sternocleidomastoid','platysma','frontalis','occipitalis','orbicularis','masseter')
    missing=[]
    for kind,ids in groups.items():
        for fid in sorted(ids):
            if fid not in paths: missing.append(fid); continue
            # Prefer the narrowest labelled, sided concept over aggregate organs.
            choices=sorted(candidates[fid],key=lambda c:(len(elements[c]),0 if any(s in names[c] for s in ['right','left']) else 1,len(names[c])))
            cid=choices[0]; name=names[cid]
            side='right' if 'right' in name else 'left' if 'left' in name else 'midline'
            meshes[fid]=obj_geometry(archive.read(paths[fid]).decode())
            metadata.append({'id':fid,'conceptId':cid,'name':name,'nameEn':name,'kind':kind,'side':side,'layer':'support' if kind=='bone' else ('superficial' if any(s in name for s in superficial) else 'deep'),'file':f'meshes/{fid}.json','source':'BodyParts3D 4.0','sourceElement':fid,'sourceMirrored':fid.endswith('M'),'componentOfCompound':len(elements[cid])>1})
    coords=[v for verts,_ in meshes.values() for v in verts]
    low=[min(v[i] for v in coords) for i in range(3)]; high=[max(v[i] for v in coords) for i in range(3)]
    center=[(a+b)/2 for a,b in zip(low,high)]; scale=1.7/(high[2]-low[2])
    (OUT/'meshes').mkdir(parents=True,exist_ok=True)
    for item in metadata:
        verts,indices=meshes[item['id']]
        vertices=[((v[0]-center[0])*scale,(v[2]-center[2])*scale,-(v[1]-center[1])*scale) for v in verts]
        if item['side']=='midline' and item['kind']!='bone':
            lateral=sum(v[0] for v in vertices)/len(vertices)
            if abs(lateral)>0.003 and (min(v[0] for v in vertices)>=-0.002 or max(v[0] for v in vertices)<=0.002):
                item['side']='right' if lateral<0 else 'left'
                item['sideSource']='inferred from source mesh centroid; requires anatomical review'
        normals=[[0.,0.,0.] for _ in vertices]
        for a,b,c in zip(indices[::3],indices[1::3],indices[2::3]):
            u=[vertices[b][i]-vertices[a][i] for i in range(3)]; v=[vertices[c][i]-vertices[a][i] for i in range(3)]
            n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            for idx in (a,b,c):
                for i in range(3): normals[idx][i]+=n[i]
        normals=[[x/(math.sqrt(sum(y*y for y in n)) or 1) for x in n] for n in normals]
        data={'positions':[round(x,7) for v in vertices for x in v],'normals':[round(x,6) for n in normals for x in n],'indices':indices}
        target=OUT/item['file']; target.write_text(json.dumps(data,separators=(',',':')))
        item['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
        item['triangles']=len(indices)//3
    unique=[]; by_hash={}
    for item in metadata:
        if item['sha256'] in by_hash and by_hash[item['sha256']]['kind']==item['kind']:
            by_hash[item['sha256']].setdefault('sourceAliases',[]).append(item['id'])
            (OUT/item['file']).unlink()
        else:
            unique.append(item);by_hash[item['sha256']]=item
    metadata=unique
    manifest={'version':1,'source':'BodyParts3D 4.0','license':'CC BY 4.0','attribution':'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International','sourceUrl':'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html','sourceArchiveSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'coordinateTransform':{'sourceCenter':center,'scale':scale,'mapping':'(x,z,-y)'},'layerNotice':'显示分组为项目维护的近似分类，不代表临床解剖层次认证。 Display groups are approximate editorial categories, not clinically certified anatomical layers.','missingSourceElements':missing,'structures':metadata}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    (ROOT/'shared').mkdir(exist_ok=True)
    (ROOT/'shared'/'anatomy-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    print('Imported:',dict(Counter(x['kind'] for x in metadata)),'missing:',len(missing),'triangles:',sum(x['triangles'] for x in metadata))
    print('Archive SHA256:',manifest['sourceArchiveSha256'])
if __name__=='__main__': main()
