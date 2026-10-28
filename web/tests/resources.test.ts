import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { Catalog, Structure } from "../src/types";
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    setMeshoptDecoder() {
      return this;
    }
    async parseAsync() {
      const group = new THREE.Group();
      group.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(),
          new THREE.MeshStandardMaterial(),
        ),
      );
      return { scene: group };
    }
  },
}));
import { ResourceManager } from "../src/resources";
function fixture(): Catalog {
  const structures = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => {
      const id = `s${i}`;
      return [
        id,
        {
          id,
          asset: `/models/web/structures/${id}.glb`,
          region: "arm",
          layer: "superficial",
          name: { zh: id, en: id },
          side: "left",
          kind: "muscle",
          bounds: { min: [0, 0, 0], max: [1, 1, 1] },
        } as Structure,
      ];
    }),
  );
  return {
    version: 1,
    groups: [],
    regions: [],
    structures,
    initialStructureIds: ["s0"],
    tendons: [],
    assets: {
      body: { url: "/models/web/body.glb" },
      skin: { url: "/models/web/skin.glb" },
    },
  };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => vi.unstubAllGlobals());
describe("资源生命周期 / resource lifecycle", () => {
  it("人体先加载、最多4并发、旧计划被取消 / body first, at most four concurrent and stale plans abort", async () => {
    const calls: { url: string; signal: AbortSignal; resolve: () => void }[] =
      [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string, options: { signal: AbortSignal }) =>
          new Promise((resolve, reject) => {
            const call = {
              url,
              signal: options.signal,
              resolve: () =>
                resolve({
                  ok: true,
                  arrayBuffer: async () => new ArrayBuffer(0),
                }),
            };
            calls.push(call);
            options.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const manager = new ResourceManager(fixture(), () => {});
    manager.setPlan(["s0", "s1", "s2", "s3", "s4", "s5", "not-allowed"], false);
    expect(calls.map((c) => c.url)).toEqual(["/models/web/body.glb"]);
    calls[0].resolve();
    await flush();
    expect(calls).toHaveLength(5);
    expect(
      calls.slice(1).every((c) => c.url.startsWith("/models/web/structures/")),
    ).toBe(true);
    manager.setPlan(["s8"], false);
    await flush();
    expect(calls.slice(1, 5).every((c) => c.signal.aborted)).toBe(true);
    expect(calls.at(-1)?.url).toBe("/models/web/structures/s8.glb");
    expect(
      calls.some(
        (c) =>
          c.url.includes("s4") ||
          c.url.includes("s5") ||
          c.url.includes("not-allowed"),
      ),
    ).toBe(false);
    manager.dispose();
  });
  it("切换区域会释放旧网格、穴位模式不预取内部结构 / evicts old geometry and acupuncture does not prefetch internals", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
      })),
    );
    let prior: THREE.Group | undefined;
    let latestSize = 0;
    const manager = new ResourceManager(
      fixture(),
      (state) => {
        latestSize = state.structures.size;
        if (state.structures.has("s0")) prior = state.structures.get("s0");
      },
      2,
    );
    manager.setPlan(["s0"], false);
    await flush();
    await flush();
    expect(prior).toBeDefined();
    const dispose = vi.spyOn(
      (prior!.children[0] as THREE.Mesh).geometry,
      "dispose",
    );
    manager.setPlan(["s1"], false);
    await flush();
    expect(dispose).toHaveBeenCalledOnce();
    expect(latestSize).toBe(1);
    manager.setPlan([], true);
    await flush();
    const urls = vi.mocked(fetch).mock.calls.map((args) => String(args[0]));
    expect(urls.filter((url) => url.includes("structures/"))).toEqual([
      "/models/web/structures/s0.glb",
      "/models/web/structures/s1.glb",
    ]);
    expect(urls).toContain("/models/web/skin.glb");
    expect(latestSize).toBe(0);
    manager.dispose();
  });
});

describe("快速切换 / rapid plan changes", () => {
  it("同一ID在取消后立即重选会重新排队 / immediately reselected aborted ID is queued again", async () => {
    const calls: { url: string; signal: AbortSignal; resolve: () => void }[] =
      [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string, options: { signal: AbortSignal }) =>
          new Promise((resolve, reject) => {
            calls.push({
              url,
              signal: options.signal,
              resolve: () =>
                resolve({
                  ok: true,
                  arrayBuffer: async () => new ArrayBuffer(0),
                }),
            });
            options.signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    const manager = new ResourceManager(fixture(), () => {});
    manager.setPlan(["s0"], false);
    calls[0].resolve();
    await flush();
    expect(calls[1].url).toBe("/models/web/structures/s0.glb");
    manager.setPlan(["s1"], false);
    manager.setPlan(["s0"], false);
    await flush();
    const s0Calls = calls.filter((call) => call.url.endsWith("/s0.glb"));
    expect(s0Calls).toHaveLength(2);
    expect(s0Calls[0].signal.aborted).toBe(true);
    expect(s0Calls[1].signal.aborted).toBe(false);
    manager.dispose();
  });
});
