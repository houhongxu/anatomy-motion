import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { Document, NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, simplify, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { groups, regions, tendons, initialGroupIds, initialExcludedStructureIds } from './selection.mjs';
import { loadSupplemental, meshData, sourceFile } from './supplemental.mjs';
import { catalogName } from './names.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const sourcePath = (p) => resolve(root, p);
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const bounds = (positions) => {
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<positions.length;i++) { const axis=i%3; min[axis]=Math.min(min[axis],positions[i]); max[axis]=Math.max(max[axis],positions[i]); }
  return {min,max};
};
export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder':MeshoptEncoder, 'meshopt.decoder':MeshoptDecoder,
});
const load = async (p) => JSON.parse(await readFile(sourcePath(p),'utf8'));
const rounded = (n) => Math.round(n*100)/100;
const byteSize = async (p) => (await stat(sourcePath(p))).size;
const gzipSize = async (p) => gzipSync(await readFile(sourcePath(p)),{level:6}).byteLength;
const geometry = (id, data, kind, name, copyright) => {
  const doc=new Document().setLogger(new Logger(Logger.Verbosity.ERROR)); const buffer=doc.createBuffer();
  doc.getRoot().getAsset().copyright=copyright||'BodyParts3D © The Database Center for Life Science; CC BY 4.0';
  const primitive=doc.createPrimitive()
    .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(data.positions)).setBuffer(buffer))
    .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array(data.normals)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(data.indices)).setBuffer(buffer))
    .setMaterial(doc.createMaterial(kind).setBaseColorFactor(kind==='tendon'?[0.89,0.79,0.53,1]:kind==='skin'?[0.69,0.56,0.47,1]:[0.71,0.21,0.22,1]).setRoughnessFactor(0.8).setDoubleSided(true));
  const mesh=doc.createMesh(id).addPrimitive(primitive);
  const node=doc.createNode(id).setMesh(mesh).setExtras({structureId:id,name,coordinateSystem:'bodyparts3d-v1'});
  doc.createScene('bodyparts3d-v1').addChild(node); return doc;
};
const exportGlb = async (doc, relative) => {
  await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high'}));
  await io.write(sourcePath(relative),doc);
  return {url:`/${relative}`,bytes:await byteSize(relative),triangles:doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0)};
};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
await mkdir(sourcePath('models/web/structures'),{recursive:true});
const manifest=await load('models/manifest.json');
const supplemental=await loadSupplemental();
const originals=new Map([...manifest.structures,...supplemental.structures].map((s)=>[s.id,s]));
const selected=new Map();
for(const group of groups) for(const id of group.structureIds) {
  if(selected.has(id)) throw new Error(`Duplicate selected structure ${id}`);
  const source=originals.get(id);
  if(!source || source.kind!=='muscle') throw new Error(`Invalid muscle ${id}`);
  selected.set(id,{source,region:group.region,layer:group.layer});
}
for(const tendon of tendons) for(const id of tendon.structureIds) selected.set(id,{source:originals.get(id),region:'leg',layer:'superficial'});
const structures={}; let structureGlbBytes=0,selectedStructureJsonBytes=0;
for(const [id,{source,region,layer}] of selected) {
  const data=await meshData(source);
  const name={zh:source.nameZh||`${source.side==='left'?'左侧':'右侧'}${groups.find((g)=>g.structureIds.includes(id))?.name.zh||'跟腱'}`,en:source.nameEn};
  const asset=await exportGlb(geometry(id,data,source.kind,name,source.supplemental?supplemental.attribution:undefined),`models/web/structures/${id}.glb`);
  structures[id]={id,name:catalogName(source),kind:source.kind,side:source.side,region,layer,asset:asset.url,bounds:bounds(data.positions),...(source.supplemental?{source:supplemental.id}:{})};
  structureGlbBytes+=asset.bytes;if(!source.supplemental)selectedStructureJsonBytes+=await byteSize(sourceFile(source));
}
const skinData=await load('models/skin.json');
const skin=await exportGlb(geometry('skin',skinData,'skin',{zh:'完整皮肤',en:'Full skin'}),'models/web/skin.glb');
const bodyDoc=geometry('body',skinData,'skin',{zh:'低模全身轮廓',en:'Low-poly full body silhouette'});
// 先焊接再简化，保持原坐标、四肢与全身轮廓。 / Weld before simplifying; retain original coordinates and full-body silhouette.
await bodyDoc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:10000/skin.triangles,error:0.01,lockBorder:true}));
const lowPrimitive=bodyDoc.getRoot().listMeshes()[0].listPrimitives()[0];
const lowPositions=lowPrimitive.getAttribute('POSITION').getArray();
const lowIndices=lowPrimitive.getIndices().getArray();
const lowNormals=new Float32Array(lowPositions.length);
for(let i=0;i<lowIndices.length;i+=3) {
  const [a,b,c]=[lowIndices[i]*3,lowIndices[i+1]*3,lowIndices[i+2]*3];
  const u=[0,1,2].map((k)=>lowPositions[b+k]-lowPositions[a+k]);
  const v=[0,1,2].map((k)=>lowPositions[c+k]-lowPositions[a+k]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  for(const vertex of [a,b,c]) for(let k=0;k<3;k++) lowNormals[vertex+k]+=n[k];
}
for(let i=0;i<lowNormals.length;i+=3) {const length=Math.hypot(...lowNormals.subarray(i,i+3))||1;for(let k=0;k<3;k++) lowNormals[i+k]/=length;}
lowPrimitive.getAttribute('NORMAL').setArray(lowNormals);
const body=await exportGlb(bodyDoc,'models/web/body.glb');
if(body.triangles>12000) throw new Error(`Body triangle budget exceeded: ${body.triangles}`);
const initialStructureIds=groups.filter((g)=>initialGroupIds.includes(g.id)).flatMap((g)=>g.structureIds).filter((id)=>!initialExcludedStructureIds.includes(id));
const originalFiles=['models/manifest.json','models/skin.json','models/acupuncture.json',...manifest.structures.map((s)=>`models/${s.file}`)];
const integrity={};for(const p of originalFiles) integrity[p]=digest(await readFile(sourcePath(p)));
const legacyMeshBytes=(await Promise.all(manifest.structures.map((s)=>byteSize(`models/${s.file}`)))).reduce((a,b)=>a+b,0);
const legacyMeshGzipBytes=(await Promise.all(manifest.structures.map((s)=>gzipSize(`models/${s.file}`)))).reduce((a,b)=>a+b,0);
const selectedStructureJsonGzipBytes=(await Promise.all([...selected.values()].filter(({source})=>!source.supplemental).map(({source})=>gzipSize(sourceFile(source))))).reduce((a,b)=>a+b,0);
const allGeometryGzipBytes=(await Promise.all(['models/web/body.glb','models/web/skin.glb',...[...selected.keys()].map((id)=>`models/web/structures/${id}.glb`)].map(gzipSize))).reduce((a,b)=>a+b,0);
const supplementalObjBytes=(await Promise.all(supplemental.structures.map((s)=>byteSize(sourceFile(s))))).reduce((a,b)=>a+b,0);
const supplementalObjGzipBytes=(await Promise.all(supplemental.structures.map((s)=>gzipSize(sourceFile(s))))).reduce((a,b)=>a+b,0);
const legacySkinBytes=await byteSize('models/skin.json');
const legacySkinGzipBytes=await gzipSize('models/skin.json');
const initialGeometryBytes=body.bytes+(await Promise.all(initialStructureIds.map((id)=>byteSize(`models/web/structures/${id}.glb`)))).reduce((a,b)=>a+b,0);
const initialGzipBytes=await gzipSize('models/web/body.glb')+(await Promise.all(initialStructureIds.map((id)=>gzipSize(`models/web/structures/${id}.glb`)))).reduce((a,b)=>a+b,0);
const legacyGeometryBytes=legacyMeshBytes+legacySkinBytes;
const allGeometryBytes=body.bytes+skin.bytes+structureGlbBytes;
const catalog={version:1,coordinateSystem:'bodyparts3d-v1',source:{name:manifest.source,license:manifest.license,attribution:manifest.attribution,url:manifest.sourceUrl,archiveSha256:manifest.sourceArchiveSha256},supplementalSources:[Object.fromEntries(Object.entries(supplemental).filter(([key])=>key!=='structures'))],groups,regions,structures,assets:{body,skin},initialStructureIds,tendons,
  stats:{legacyStructureCount:manifest.structures.length,selectedStructureCount:selected.size,supplementalStructureCount:supplemental.structures.length,supplementalObjBytes,supplementalObjGzipBytes,initialStructureCount:initialStructureIds.length,legacyMeshBytes,legacySkinBytes,legacyGeometryBytes,legacyMeshGzipBytes,legacySkinGzipBytes,selectedStructureJsonBytes,selectedStructureJsonGzipBytes,allGeometryGzipBytes,structureGlbBytes,bodyBytes:body.bytes,skinBytes:skin.bytes,initialGeometryBytes,initialGzipBytes,allGeometryBytes,geometryReductionPercent:rounded((1-allGeometryBytes/legacyGeometryBytes)*100)}};
await writeFile(sourcePath('models/web/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
const integrityPath=sourcePath('tools/models/source-integrity.json');
let baseline;try{baseline=JSON.parse(await readFile(integrityPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(baseline){for(const [file,sha] of Object.entries(baseline))if(integrity[file]!==sha)throw new Error(`Original source changed: ${file}`);}else await writeFile(integrityPath,JSON.stringify(integrity,null,2)+'\n');
console.log(JSON.stringify({groups:groups.length,missing:groups.filter((g)=>!g.structureIds.length).map((g)=>g.id),body,skin,stats:catalog.stats},null,2));
