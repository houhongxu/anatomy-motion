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
export function sceneFrame(
  viewport: Bounds,
  controls: Bounds,
  chip: Bounds,
  compact: boolean,
) {
  const short = compact && viewport.height < 330;
  const left = viewport.left + (short ? 100 : 6);
  const right = Math.max(left + 64, viewport.right - 6);
  const top = short ? viewport.top + 8 : controls.bottom + 10;
  const bottom = short
    ? viewport.bottom - 8
    : Math.max(top + 64, chip.top - 12);
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
