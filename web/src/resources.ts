import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Catalog } from "./types";
import { allowedIds } from "./planner";
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export function disposeObject(object: THREE.Object3D) {
  object.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line) {
      node.geometry?.dispose();
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      for (const material of materials) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    }
  });
}
async function loadModel(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("loadError");
  const buffer = await response.arrayBuffer();
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const gltf = await loader.parseAsync(
    buffer,
    url.slice(0, url.lastIndexOf("/") + 1),
  );
  if (signal.aborted) {
    disposeObject(gltf.scene);
    throw new DOMException("Aborted", "AbortError");
  }
  gltf.scene.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = false;
      node.receiveShadow = false;
    }
  });
  return gltf.scene;
}
export type ResourceState = {
  body?: THREE.Group;
  skin?: THREE.Group;
  structures: Map<string, THREE.Group>;
  loading: number;
  errors: number;
};
/** Four total in-flight requests; stale plans abort fetches and decoded stale objects are disposed. */
export class ResourceManager {
  private cache = new Map<string, THREE.Group>();
  private active = new Map<string, AbortController>();
  private wanted: string[] = [];
  private urls = new Map<string, string>();
  private stopped = false;
  private errors = new Set<string>();
  constructor(
    private catalog: Catalog,
    private emit: (state: ResourceState) => void,
    private cacheLimit = 48,
  ) {
    this.urls.set("body", catalog.assets.body.url);
    this.urls.set("skin", catalog.assets.skin.url);
    for (const id of allowedIds(catalog, Object.keys(catalog.structures)))
      this.urls.set(id, catalog.structures[id].asset);
  }
  setPlan(ids: string[], showSkin: boolean, retry = false) {
    this.wanted = [
      "body",
      ...(showSkin ? ["skin"] : []),
      ...allowedIds(this.catalog, ids),
    ];
    if (retry) this.errors.clear();
    for (const [key, controller] of this.active)
      if (!this.wanted.includes(key)) {
        controller.abort();
      }
    for (const id of this.wanted) {
      const value = this.cache.get(id);
      if (value) {
        this.cache.delete(id);
        this.cache.set(id, value);
      }
    }
    this.prune();
    this.publish();
    this.pump();
  }
  private publish() {
    if (!this.stopped)
      this.emit({
        body: this.cache.get("body"),
        skin: this.wanted.includes("skin") ? this.cache.get("skin") : undefined,
        structures: new Map(
          this.wanted
            .filter(
              (id) => id !== "body" && id !== "skin" && this.cache.has(id),
            )
            .map((id) => [id, this.cache.get(id)!]),
        ),
        loading: this.wanted.filter(
          (id) => !this.cache.has(id) && !this.errors.has(id),
        ).length,
        errors: this.wanted.filter((id) => this.errors.has(id)).length,
      });
  }
  private prune() {
    const desired = new Set(this.wanted);
    let optional = [...this.cache.keys()].filter(
      (id) => !desired.has(id) && id !== "body" && id !== "skin",
    );
    const allowance = Math.max(0, this.cacheLimit - this.wanted.length);
    while (optional.length > allowance) {
      const id = optional.shift()!;
      const value = this.cache.get(id)!;
      this.cache.delete(id);
      disposeObject(value);
    }
    if (!desired.has("skin") && this.cache.has("skin")) {
      const skin = this.cache.get("skin")!;
      this.cache.delete("skin");
      disposeObject(skin);
    }
  }
  private pump() {
    if (this.stopped) return;
    // A complete body must arrive before any internal structure starts downloading.
    const candidates = this.cache.has("body") ? this.wanted : ["body"];
    for (const id of candidates) {
      if (this.active.size >= 4) break;
      if (this.cache.has(id) || this.active.has(id) || this.errors.has(id))
        continue;
      const url = this.urls.get(id);
      if (!url) continue;
      const controller = new AbortController();
      this.active.set(id, controller);
      void loadModel(url, controller.signal)
        .then((object) => {
          if (
            this.stopped ||
            !this.wanted.includes(id) ||
            controller.signal.aborted
          )
            disposeObject(object);
          else this.cache.set(id, object);
        })
        .catch((error) => {
          if (!controller.signal.aborted && error?.name !== "AbortError")
            this.errors.add(id);
        })
        .finally(() => {
          this.active.delete(id);
          if (!this.stopped) {
            this.prune();
            this.publish();
            this.pump();
          }
        });
    }
  }
  dispose() {
    this.stopped = true;
    for (const controller of this.active.values()) controller.abort();
    for (const object of this.cache.values()) disposeObject(object);
    this.cache.clear();
    this.active.clear();
  }
}
export function useResources(
  catalog: Catalog,
  ids: string[],
  showSkin: boolean,
  retry: number,
) {
  const [state, setState] = useState<ResourceState>({
    structures: new Map(),
    loading: 1,
    errors: 0,
  });
  const manager = useRef<ResourceManager | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const current = new ResourceManager(catalog, setState);
    manager.current = current;
    current.setPlan(ids, showSkin);
    return () => {
      current.dispose();
      manager.current = null;
    };
  }, [catalog]);
  useEffect(() => {
    manager.current?.setPlan(ids, showSkin, retry > 0);
  }, [key, showSkin, retry]);
  return state;
}
