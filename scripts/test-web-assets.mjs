import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { NodeIO } from '../tools/models/node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../tools/models/node_modules/@gltf-transform/extensions/dist/index.js';
import { MeshoptDecoder } from '../tools/models/node_modules/meshoptimizer/index.js';
import { groups as curatedGroups, tendons as curatedTendons } from '../tools/models/selection.mjs';
import { loadSupplemental, meshData, sourceFile } from '../tools/models/supplemental.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(path)=>readFile(resolve(root,path));
const json=async(path)=>JSON.parse(await read(path));
const catalog=await json('models/web/catalog.json');
const manifest=await json('models/manifest.json');
const originalSkin=await json('models/skin.json');
const supplemental=await loadSupplemental();
const byId=new Map([...manifest.structures,...supplemental.structures].map((s)=>[s.id,s]));
const expectedGroups='trapezius sternocleidomastoid levator-scapulae deltoid supraspinatus infraspinatus teres-minor subscapularis latissimus-dorsi rhomboids pectoralis-major serratus-anterior rectus-abdominis external-oblique internal-oblique erector-spinae quadratus-lumborum biceps-brachii brachialis triceps-brachii brachioradialis wrist-flexors wrist-extensors gluteus-maximus gluteus-medius gluteus-minimus iliopsoas piriformis hip-adductors rectus-femoris vastus-lateralis vastus-medialis vastus-intermedius biceps-femoris semitendinosus semimembranosus gastrocnemius soleus tibialis-anterior fibularis'.split(' ');
assert.deepEqual(catalog.groups.map((g)=>g.id),expectedGroups);
assert.equal(catalog.version,1);
assert.equal(catalog.coordinateSystem,'bodyparts3d-v1');
assert.deepEqual(catalog.regions.map((r)=>r.id),['neck','shoulder','torso','arm','hip','thigh','leg']);
assert.equal(catalog.source.license,'CC BY 4.0');
assert.match(catalog.source.attribution,/Database Center for Life Science/);
assert.deepEqual(catalog.groups,curatedGroups);
assert.deepEqual(catalog.tendons,curatedTendons);
assert.ok(catalog.groups.every((g)=>g.structureIds.length>0&&!g.missing),'All 40 muscle groups need real geometry');
assert.equal(supplemental.structures.length,8);
assert.match(supplemental.license,/BY-SA/);
assert.equal(catalog.supplementalSources[0].sourceUrl,supplemental.sourceUrl);
assert.equal(catalog.supplementalSources[0].archiveETag,supplemental.archiveETag);
assert.ok(supplemental.archiveSha256||supplemental.archiveETag,'Source needs full archive hash or server ETag');
const crcTable=Array.from({length:256},(_,i)=>{let value=i;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
for(const s of supplemental.structures){const bytes=await read(s.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),s.sha256);assert.equal(bytes.length,s.originalEntry.size);let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);assert.equal((crc^0xffffffff)>>>0,s.originalEntry.crc);assert.equal(s.supplemental,true);assert.match(s.id,/^BP3D3_FMA[0-9]+$/);}
const expectedIds=new Set([...curatedGroups,...curatedTendons].flatMap((g)=>g.structureIds));
const individualNames={FJ1532:'肩胛提肌',FJ1422:'髂肌',FJ1431:'腰大肌',FJ1428:'梨状肌',FJ1409:'腓骨短肌',FJ1410:'腓骨长肌',FJ1411:'第三腓骨肌',FJ1472:'尺侧腕伸肌（来源网格1）',FJ1517:'尺侧腕伸肌（来源网格2）'};
for(const [id,name] of Object.entries(individualNames)){assert.equal(catalog.structures[id].name.zh,`右侧${name}`);assert.equal(catalog.structures[`${id}M`].name.zh,`左侧${name}`);}
for(const id of ['FJ1472','FJ1517'])assert.match(catalog.structures[id].name.en,/source mesh [12]/);
for(const side of ['left','right']){const labels=Object.values(catalog.structures).filter((s)=>s.side===side).map((s)=>s.name.zh);assert.equal(new Set(labels).size,labels.length,'Individual labels must not collapse distinct source meshes');}
assert.deepEqual(Object.keys(catalog.structures).sort(),[...expectedIds].sort());
assert.deepEqual((await readdir(resolve(root,'models/web/structures'))).sort(),[...expectedIds].map((id)=>`${id}.glb`).sort());
for(const group of [...catalog.groups,...catalog.tendons]) {
  assert.ok(group.name.zh&&group.name.en);
  if(!group.structureIds.length) assert.ok(group.missing.zh&&group.missing.en,`${group.id}: missing source must be explicit`);
}
for(const id of catalog.initialStructureIds) {
  const s=catalog.structures[id];assert.equal(s.layer,'superficial');assert.ok(!['FJ1480','FJ1480M','FJ1444','FJ1444M'].includes(id),'Covered muscle heads must not be initial');
  assert.ok(!catalog.groups.some((g)=>['wrist-flexors','wrist-extensors','supraspinatus','infraspinatus','subscapularis','teres-minor','iliopsoas','piriformis','vastus-intermedius','erector-spinae'].includes(g.id)&&g.structureIds.includes(id)),`${id}: initial load must use major superficial muscles`);
}
const sourceIntegrity=await json('tools/models/source-integrity.json');
assert.equal(manifest.structures.length,617);
for(const s of manifest.structures)assert.equal(createHash('sha256').update(await read(`models/${s.file}`)).digest('hex'),s.sha256,`Manifest mesh SHA mismatch: ${s.id}`);
assert.equal(Object.keys(sourceIntegrity).length,620);
for(const [file,sha256] of Object.entries(sourceIntegrity)) assert.equal(createHash('sha256').update(await read(file)).digest('hex'),sha256,`Original asset changed: ${file}`);
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const worldPoints=(node)=>{
  const p=node.getMesh().listPrimitives()[0].getAttribute('POSITION'), matrix=node.getWorldMatrix(), points=[];
  for(let i=0;i<p.getCount();i++) {const [x,y,z]=p.getElement(i,[]);points.push(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]);}
  return points;
};
const bounds=(points)=>{const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<points.length;i++){min[i%3]=Math.min(min[i%3],points[i]);max[i%3]=Math.max(max[i%3],points[i]);}return{min,max};};
const nearBounds=(a,b,tolerance)=>{for(const edge of ['min','max'])for(let axis=0;axis<3;axis++)assert.ok(Math.abs(a[edge][axis]-b[edge][axis])<tolerance,`Bounds drift on ${edge}/${axis}: ${a[edge][axis]} vs ${b[edge][axis]}`);};
const inspectGlb=async(path,id)=>{
  const bytes=await read(path);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const payload=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  assert.ok(payload.extensionsRequired.includes('EXT_meshopt_compression'),`${id}: actual Meshopt must be required`);
  assert.ok(payload.bufferViews.some((v)=>v.extensions?.EXT_meshopt_compression?.byteLength>0));
  assert.ok(payload.buffers.every((b)=>!b.uri));assert.ok(!payload.images?.length);assert.ok(!payload.animations?.length);
  const doc=await io.readBinary(bytes);
  const node=doc.getRoot().listNodes().find((n)=>n.getName()===id&&n.getMesh());assert.ok(node,`${id}: stable mesh node name`);
  assert.equal(node.getExtras().coordinateSystem,'bodyparts3d-v1');
  const primitive=node.getMesh().listPrimitives()[0];
  const position=primitive.getAttribute('POSITION');const normal=primitive.getAttribute('NORMAL');const indices=primitive.getIndices();
  assert.ok(indices&&indices.getCount()%3===0);assert.equal(normal.getCount(),position.getCount());
  for(const i of indices.getArray())assert.ok(i>=0&&i<position.getCount(),`${id}: index out of range`);
  for(let i=0;i<normal.getCount();i++) {const n=normal.getElement(i,[]);assert.ok(n.every(Number.isFinite));const magnitude=Math.hypot(...n);assert.ok(magnitude<0.01||Math.abs(magnitude-1)<0.02,`${id}: normal normalization`);}
  return{bytes:bytes.length,gzipBytes:gzipSync(bytes,{level:6}).byteLength,triangles:indices.getCount()/3,points:worldPoints(node)};
};
let structureGlbBytes=0,initialGeometryBytes=0,initialGzipBytes=0,selectedStructureJsonBytes=0,selectedStructureJsonGzipBytes=0,allStructureGzipBytes=0;
for(const [id,s] of Object.entries(catalog.structures)) {
  const source=byId.get(id);assert.ok(source);assert.ok(['muscle','tendon'].includes(source.kind));
  assert.ok(!/digitor|pollic|halluc|lumbrical|interosse|palpebr|orbicul|masseter/.test(source.nameEn),`${id}: fine face/hand/foot muscle excluded`);
  assert.equal(s.id,id);assert.equal(s.asset,`/models/web/structures/${id}.glb`);assert.equal(s.kind,source.kind);assert.equal(s.side,source.side);assert.ok(s.name.zh&&s.name.en);
  const sourceMesh=await meshData(source);nearBounds(s.bounds,bounds(sourceMesh.positions),1e-8);
  const result=await inspectGlb(s.asset.slice(1),id);assert.equal(result.triangles,sourceMesh.indices.length/3);nearBounds(bounds(result.points),s.bounds,0.0003);
  allStructureGzipBytes+=result.gzipBytes;
  if(!source.supplemental){selectedStructureJsonGzipBytes+=gzipSync(await read(sourceFile(source)),{level:6}).length;selectedStructureJsonBytes+=(await stat(resolve(root,sourceFile(source)))).size;}
  else {assert.equal(s.source,supplemental.id);const meanX=sourceMesh.positions.filter((_,i)=>i%3===0).reduce((a,b)=>a+b,0)/(sourceMesh.positions.length/3);assert.ok(source.side==='right'?meanX<0:meanX>0,`${id}: supplemental centroid laterality must match original reference frame`);if(source.conceptId==='FMA13358'||source.conceptId==='FMA13359'||source.conceptId==='FMA22348'||source.conceptId==='FMA22349')assert.ok(s.bounds.max[2]<0,'Back muscles must remain posterior');if(source.conceptId==='FMA13377'||source.conceptId==='FMA13378')assert.ok(s.bounds.min[2]>0,'Rectus abdominis must remain anterior');const skinBounds=bounds(originalSkin.positions);for(let axis=0;axis<3;axis++){assert.ok(s.bounds.min[axis]>=skinBounds.min[axis]-0.02&&s.bounds.max[axis]<=skinBounds.max[axis]+0.02,'Supplemental muscle must align with the existing body bounds');}}
  structureGlbBytes+=result.bytes;
  if(catalog.initialStructureIds.includes(id)){initialGeometryBytes+=result.bytes;initialGzipBytes+=result.gzipBytes;}
}
const body=await inspectGlb(catalog.assets.body.url.slice(1),'body');
const skin=await inspectGlb(catalog.assets.skin.url.slice(1),'skin');
assert.ok(body.triangles<=12000&&body.triangles>5000);assert.ok(body.triangles<skin.triangles/10);
assert.equal(skin.triangles,originalSkin.indices.length/3);
nearBounds(bounds(skin.points),bounds(originalSkin.positions),0.0003);
nearBounds(bounds(body.points),bounds(originalSkin.positions),0.01);
// 全身20个高度截面都必须保留，防止只留下躯干。 / Preserve all 20 body height bands, not only the torso.
const profile=(points)=>{const ranges=Array.from({length:20},()=>[Infinity,-Infinity]);const originalBounds=bounds(originalSkin.positions);for(let i=0;i<points.length;i+=3){const bin=Math.min(19,Math.max(0,Math.floor((points[i+1]-originalBounds.min[1])/(originalBounds.max[1]-originalBounds.min[1])*20)));ranges[bin][0]=Math.min(ranges[bin][0],points[i]);ranges[bin][1]=Math.max(ranges[bin][1],points[i]);}return ranges;};
const fullProfile=profile(originalSkin.positions),lowProfile=profile(body.points);
for(let i=0;i<20;i++)for(let edge=0;edge<2;edge++)assert.ok(Number.isFinite(lowProfile[i][edge])&&Math.abs(lowProfile[i][edge]-fullProfile[i][edge])<0.035,`Whole body silhouette missing in band ${i}`);
for(const [key,actual] of [['body',body],['skin',skin]]){assert.equal(catalog.assets[key].bytes,actual.bytes);assert.equal(catalog.assets[key].triangles,actual.triangles);}
let legacyMeshBytes=0,legacyMeshGzipBytes=0;
for(const s of manifest.structures){const bytes=await read(`models/${s.file}`);legacyMeshBytes+=bytes.length;legacyMeshGzipBytes+=gzipSync(bytes,{level:6}).length;}
const skinBytes=await read('models/skin.json');
const stats=catalog.stats;
assert.equal(stats.legacyStructureCount,617);assert.equal(stats.selectedStructureCount,expectedIds.size);assert.equal(stats.initialStructureCount,catalog.initialStructureIds.length);
assert.equal(stats.legacyMeshBytes,legacyMeshBytes);assert.equal(stats.legacyMeshGzipBytes,legacyMeshGzipBytes);assert.equal(stats.legacySkinBytes,skinBytes.length);assert.equal(stats.legacySkinGzipBytes,gzipSync(skinBytes,{level:6}).length);
assert.equal(stats.legacyGeometryBytes,legacyMeshBytes+skinBytes.length);assert.equal(stats.selectedStructureJsonBytes,selectedStructureJsonBytes);assert.equal(stats.structureGlbBytes,structureGlbBytes);assert.equal(stats.bodyBytes,body.bytes);assert.equal(stats.skinBytes,skin.bytes);
assert.equal(stats.initialGeometryBytes,initialGeometryBytes+body.bytes);assert.equal(stats.initialGzipBytes,initialGzipBytes+body.gzipBytes);assert.equal(stats.allGeometryBytes,structureGlbBytes+body.bytes+skin.bytes);
assert.equal(stats.selectedStructureJsonGzipBytes,selectedStructureJsonGzipBytes);assert.equal(stats.allGeometryGzipBytes,allStructureGzipBytes+body.gzipBytes+skin.gzipBytes);
assert.equal(stats.supplementalStructureCount,8);assert.equal(stats.supplementalObjBytes,(await Promise.all(supplemental.structures.map(async(s)=>(await read(s.file)).length))).reduce((a,b)=>a+b,0));
assert.equal(stats.supplementalObjGzipBytes,(await Promise.all(supplemental.structures.map(async(s)=>gzipSync(await read(s.file),{level:6}).length))).reduce((a,b)=>a+b,0));
assert.equal(stats.geometryReductionPercent,Math.round((1-stats.allGeometryBytes/stats.legacyGeometryBytes)*10000)/100);
console.log(`网页资源验收通过 / Web assets passed: ${catalog.groups.length} groups, ${expectedIds.size} structures, body ${body.triangles} triangles, initial ${stats.initialGeometryBytes} B (${stats.initialGzipBytes} B gzip).`);
