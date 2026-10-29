export type Locale = "zh" | "en";
export type Text = { zh: string; en: string };
export type Side = "left" | "right" | "midline";
export type Vec3 = [number, number, number];
export type Structure = {
  id: string;
  name: Text;
  kind: "muscle" | "tendon";
  side: Side;
  region: string;
  layer: "superficial" | "deep";
  asset: string;
  bounds: { min: Vec3; max: Vec3 };
};
export type Group = {
  id: string;
  name: Text;
  region?: string;
  layer?: "superficial" | "deep";
  structureIds: string[];
  missing?: Text;
};
export type Catalog = {
  version: 1;
  groups: Group[];
  regions: { id: string; name: Text }[];
  structures: Record<string, Structure>;
  initialStructureIds: string[];
  tendons: Group[];
  assets: { body: { url: string }; skin: { url: string } };
};
export type LearningEntry = {
  id: string;
  kind: "exercise" | "condition";
  name: Text;
  summary: Text;
  notice?: Text;
  groupIds: string[];
  sources: { title: string; label?: Text; url: string }[];
};
export type Learning = { groups: Group[]; entries: LearningEntry[] };
export type Point = {
  id: string;
  code: string;
  name: Text;
  meridianId: string;
  side: Side;
  position: Vec3;
  region: Text;
  landmark: Text;
  sourceIds: string[];
  sourcePages?: number[];
  reviewStatus: string;
};
export type Meridian = {
  id: string;
  name: Text;
  color: string;
  paths: { side: Side; points: Vec3[] }[];
};
export type Acupuncture = {
  reviewStatus: string;
  sources: { id: string; title: string; url: string }[];
  meridians: Meridian[];
  points: Point[];
};
export type SorenessRecord = {
  id: number;
  date: string;
  structureId: string;
  side: Side;
  intensity: number;
  note: string;
  createdAt?: string;
  updatedAt?: string;
};
export type User = { id: number; username: string };
