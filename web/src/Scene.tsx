import { Component, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Acupuncture, Catalog, Locale, Point, Vec3 } from "./types";
import type { ResourceState } from "./resources";
import { t } from "./i18n";
import { cameraFit } from "./camera";
import type { CameraView } from "./camera";
export type View = CameraView;
class CanvasBoundary extends Component<
  { children: ReactNode; locale: Locale },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="canvas-fallback" role="alert">
        {t(this.props.locale, "webglError")}
      </p>
    ) : (
      this.props.children
    );
  }
}
function Controls({
  body,
  view,
  viewTick,
}: {
  body?: THREE.Group;
  view: View;
  viewTick: number;
}) {
  const { camera, gl, invalidate, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    controls.current = orbit;
    orbit.enableDamping = false;
    orbit.minDistance = 0.45;
    orbit.maxDistance = 8;
    orbit.enablePan = true;
    const change = () => invalidate();
    orbit.addEventListener("change", change);
    return () => {
      orbit.removeEventListener("change", change);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (
      !body ||
      !(camera instanceof THREE.PerspectiveCamera) ||
      !controls.current
    )
      return;
    body.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body);
    const fit = cameraFit(
      { min: box.min.toArray() as Vec3, max: box.max.toArray() as Vec3 },
      view,
      camera.fov,
      size.width,
      size.height,
    );
    camera.position.set(...fit.position);
    camera.zoom = 1;
    camera.near = 0.01;
    camera.far = 30;
    camera.updateProjectionMatrix();
    controls.current.target.set(...fit.center);
    controls.current.update();
    invalidate();
  }, [body, view, viewTick, size.width, size.height, camera, invalidate]);
  return null;
}
function Model({
  object,
  color,
  opacity = 1,
  onSelect,
}: {
  object: THREE.Group;
  color: string;
  opacity?: number;
  onSelect?: (id: string) => void;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      for (const material of materials) {
        if (
          material instanceof THREE.MeshStandardMaterial ||
          material instanceof THREE.MeshPhongMaterial ||
          material instanceof THREE.MeshBasicMaterial
        ) {
          material.color.set(color);
          material.transparent = opacity < 1;
          material.opacity = opacity;
          material.depthWrite = opacity >= 1;
          material.side = THREE.DoubleSide;
          if (material instanceof THREE.MeshStandardMaterial) {
            material.roughness = 0.72;
            material.metalness = 0;
          }
          material.needsUpdate = true;
        }
      }
      node.renderOrder = opacity < 1 ? 2 : 0;
    });
    invalidate();
  }, [object, color, opacity, invalidate]);
  return (
    <primitive
      object={object}
      dispose={null}
      onClick={
        onSelect
          ? (event: {
              stopPropagation: () => void;
              object: THREE.Object3D;
            }) => {
              event.stopPropagation();
              onSelect(event.object.name);
            }
          : undefined
      }
    />
  );
}
function MeridianPath({ points, color }: { points: Vec3[]; color: string }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, depthTest: true }),
    );
  }, [points, color]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      line.material.dispose();
    },
    [line],
  );
  return <primitive object={line} />;
}
function SceneContent({
  catalog,
  resources,
  acupuncture,
  showSkin,
  skinOpacity,
  highlightedPointIds,
  showPoints,
  showMeridians,
  points,
  meridianId,
  selectedId,
  selectedPointId,
  highlighted,
  onStructure,
  onPoint,
  view,
  viewTick,
}: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [
    resources,
    selectedId,
    selectedPointId,
    highlighted,
    highlightedPointIds,
    skinOpacity,
    showSkin,
    showPoints,
    showMeridians,
    meridianId,
    points,
    invalidate,
  ]);
  return (
    <>
      <ambientLight intensity={1.65} />
      <directionalLight position={[3, 4, 5]} intensity={2.5} />
      <directionalLight position={[-3, 2, -4]} intensity={1.5} />
      {resources.body && (
        <Model object={resources.body} color="#c2ccd5" opacity={0.16} />
      )}
      {showSkin && resources.skin && (
        <Model object={resources.skin} color="#dec2aa" opacity={skinOpacity} />
      )}
      {[...resources.structures].map(([id, object]) => (
        <Model
          key={id}
          object={object}
          color={
            selectedId === id
              ? "#ef5c36"
              : highlighted?.includes(id)
                ? "#ef5c36"
                : catalog.structures[id].kind === "tendon"
                  ? "#d1b37a"
                  : catalog.structures[id].layer === "deep"
                    ? "#c87778"
                    : "#b25160"
          }
          onSelect={() => onStructure(id)}
        />
      ))}
      {showMeridians &&
        acupuncture.meridians
          .filter((m) => meridianId === "all" || m.id === meridianId)
          .flatMap((m) =>
            m.paths.map((path, index) => (
              <MeridianPath
                key={`${m.id}-${index}`}
                points={path.points}
                color={m.color}
              />
            )),
          )}
      {showPoints &&
        points.map((point) => (
          <mesh
            key={point.id}
            position={point.position}
            onClick={(event) => {
              event.stopPropagation();
              onPoint(point.id);
            }}
          >
            <sphereGeometry
              args={[
                point.id === selectedPointId ||
                highlightedPointIds?.includes(point.id)
                  ? 0.013
                  : 0.008,
                12,
                8,
              ]}
            />
            <meshBasicMaterial
              color={
                point.id === selectedPointId ||
                highlightedPointIds?.includes(point.id)
                  ? "#ed5b32"
                  : "#3678ac"
              }
            />
          </mesh>
        ))}
      <Controls body={resources.body} view={view} viewTick={viewTick} />
    </>
  );
}
export type SceneProps = {
  catalog: Catalog;
  resources: ResourceState;
  acupuncture: Acupuncture;
  showSkin: boolean;
  skinOpacity: number;
  highlightedPointIds?: string[];
  showPoints: boolean;
  showMeridians: boolean;
  points: Point[];
  meridianId: string;
  selectedId?: string;
  selectedPointId?: string;
  highlighted?: string[];
  onStructure: (id: string) => void;
  onPoint: (id: string) => void;
  view: View;
  viewTick: number;
  locale: Locale;
};
export function Scene(props: SceneProps) {
  return (
    <CanvasBoundary locale={props.locale}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ fov: 35, position: [0, 0, 4], near: 0.01, far: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#f4f6f8", 1);
        }}
      >
        <SceneContent {...props} />
      </Canvas>
    </CanvasBoundary>
  );
}
