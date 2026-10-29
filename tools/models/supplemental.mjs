import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const sourceFile=(source)=>source.supplemental?source.file:`models/${source.file}`;
export async function loadSupplemental(){return JSON.parse(await readFile(resolve(root,'tools/models/supplemental/source.json'),'utf8'));}
export async function meshData(source){
  const text=await readFile(resolve(root,sourceFile(source)),'utf8');
  if(!source.supplemental)return JSON.parse(text);
  const vertices=[],indices=[];
  for(const line of text.split(/\r?\n/)){
    const fields=line.trim().split(/\s+/);
    if(fields[0]==='v')vertices.push(fields.slice(1,4).map(Number));
    if(fields[0]==='f'){
      const face=fields.slice(1).map((field)=>{const index=Number(field.split('/')[0]);return index>0?index-1:vertices.length+index;});
      for(let i=1;i<face.length-1;i++)indices.push(face[0],face[i],face[i+1]);
    }
  }
  if(!vertices.length||!indices.length||indices.some((i)=>i<0||i>=vertices.length))throw new Error(`Invalid OBJ ${source.id}`);
  // 与 v4 使用完全相同的固定参考系。 / Use exactly the same fixed reference frame as v4.
  const center=[0.010500000000007503,-108.08885000000001,781.72995],scale=0.0009946871419309136;
  const positions=vertices.flatMap(([x,y,z])=>[(x-center[0])*scale,(z-center[2])*scale,-(y-center[1])*scale]);
  const normals=Array(positions.length).fill(0);
  for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map((v)=>v*3);const u=[0,1,2].map((k)=>positions[b+k]-positions[a+k]);const v=[0,1,2].map((k)=>positions[c+k]-positions[a+k]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];for(const vertex of[a,b,c])for(let k=0;k<3;k++)normals[vertex+k]+=n[k];}
  for(let i=0;i<normals.length;i+=3){const length=Math.hypot(...normals.slice(i,i+3))||1;for(let k=0;k<3;k++)normals[i+k]/=length;}
  return {positions,normals,indices};
}
