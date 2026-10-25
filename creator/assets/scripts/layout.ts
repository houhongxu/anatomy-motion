/** 仅包含纯计算，便于 Linux CI 验证。 / Pure layout calculations for Linux CI. */
export type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};
export function renderingSize(
  width: number,
  height: number,
  dpr: number,
  compact: boolean,
) {
  const ratio = Math.max(1, compact ? Math.min(1.5, dpr) : dpr);
  return {
    width: Math.max(1, Math.floor(width * ratio)),
    height: Math.max(1, Math.floor(height * ratio)),
    ratio,
  };
}
/** 控件作为边缘浮层，不缩小模型取景区域。 / Edge overlays do not shrink the model framing area. */
export function sceneFrame(
  viewport: Bounds,
  _controls: Bounds,
  _chip: Bounds,
  _compact: boolean,
) {
  const inset = Math.min(6, viewport.width / 8, viewport.height / 8);
  const left = viewport.left + inset,
    right = viewport.right - inset;
  const top = viewport.top + inset,
    bottom = viewport.bottom - inset;
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}
/** 多指手势或取消事件不得降级成选取。 / Multi-touch and canceled gestures must not become picks. */
export function shouldPick(
  moved: boolean,
  multiTouch: boolean,
  pointerCount: number,
  canceled: boolean,
): boolean {
  return !moved && !multiTouch && pointerCount === 1 && !canceled;
}
