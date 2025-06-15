import type { CSSStyleDeclaration, HTMLCanvasElement } from "./dom.js";
import { safeStringify } from "./util.js";
import { getConvexHull, interpolateIntegerY } from "./pixel-geometry.js";

const cacheBrand = Symbol();
export type SpacingCache = Map<string, [number[], number[]]> & {
  [cacheBrand]: unknown;
};
export function createSpacingCache(): SpacingCache {
  return new Map<string, [number[], number[]]>() as SpacingCache;
}
export function exportSpacingCache(cache: SpacingCache) {
  return safeStringify(Object.fromEntries(cache.entries()));
}
export function importSpacingCache(input: string) {
  const raw = JSON.parse(input) as Record<
    string,
    [(number | null)[], (number | null)[]]
  >;
  const cache = createSpacingCache();
  for (const [key, [left, right]] of Object.entries(raw)) {
    const restored: [number[], number[]] = [
      left.map((v) => (v === null ? Infinity : v)),
      right.map((v) => (v === null ? Infinity : v)),
    ];
    cache.set(key, restored);
  }
  return cache;
}

type Font = Pick<
  CSSStyleDeclaration,
  "fontFamily" | "fontStyle" | "fontWeight"
>;

function measureSpacing(
  grapheme: string,
  { fontFamily, fontStyle, fontWeight }: Readonly<Font>,
  canvasConstructor: () => HTMLCanvasElement,
  cache: SpacingCache,
) {
  const cacheKey = safeStringify({
    grapheme,
    fontFamily,
    fontStyle,
    fontWeight,
  });
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const fontSizePx = 256;

  const canvasWidth = fontSizePx * 2;
  const canvasHeight = fontSizePx * 2;
  const leftMargin = fontSizePx * 0.5;
  const baseline = fontSizePx * 1.5;

  const canvas = canvasConstructor();
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("runtime assertion failed");
  }
  context.fillStyle = "#000000";
  context.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;

  const { width } = context.measureText(grapheme);
  const rightMargin = leftMargin + width;
  context.fillText(grapheme, leftMargin, baseline);

  const image = context.getImageData(0, 0, canvasWidth, canvasHeight);
  const hull = interpolateIntegerY(getConvexHull(image));
  const hullByY = new Map<number, number[]>();
  for (const [x, y] of hull) {
    if (!hullByY.has(y)) {
      hullByY.set(y, []);
    }
    hullByY.get(y)!.push(x);
  }

  const leftSpacing = Array.from({ length: canvasHeight }, (_, i) => {
    const xs = hullByY.get(i);
    return xs && xs.length > 0 ? Math.min(...xs) - leftMargin : Infinity;
  });

  const rightSpacing = Array.from({ length: canvasHeight }, (_, i) => {
    const xs = hullByY.get(i);
    return xs && xs.length > 0 ? rightMargin - Math.max(...xs) : Infinity;
  });

  const ret = [
    leftSpacing.map((v) => v / fontSizePx),
    rightSpacing.map((v) => v / fontSizePx),
  ] as [number[], number[]];
  cache.set(cacheKey, ret);
  return ret;
}

export function calculateKerning(
  graphemeLeft: string,
  graphemeRight: string,
  font: Readonly<Font>,
  factor: number,
  canvasConstructor: () => HTMLCanvasElement,
  cache: SpacingCache,
) {
  const [, spacingRight] = measureSpacing(
    graphemeLeft,
    font,
    canvasConstructor,
    cache,
  );
  const [spacingLeft] = measureSpacing(
    graphemeRight,
    font,
    canvasConstructor,
    cache,
  );
  const gap = Math.min(...spacingRight.map((v, i) => v + spacingLeft[i]!));
  if (gap !== Infinity) {
    return gap > 0 ? gap * factor : null;
  }
  const rightMin = Math.min(...spacingRight);
  const leftMin = Math.min(...spacingLeft);
  if (Number.isFinite(rightMin) && Number.isFinite(leftMin)) {
    // "`" + "."のように互いに重ならないグリフの場合
    const ret = rightMin + leftMin;
    return ret > 0 ? ret * factor : null;
  } else {
    // FIXME: 少なくとも1つがスペース文字？
    return null;
  }
}
