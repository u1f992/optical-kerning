import type {
  CSSStyleDeclaration,
  HTMLCanvasElement,
  ImageData,
} from "./dom.js";
import { safeStringify } from "./json.js";

function getPixel({ width, data }: ImageData, x: number, y: number) {
  const index = (y * width + x) * 4;
  return /** @type {[number,number,number,number]} */ [
    data[index],
    data[index + 1],
    data[index + 2],
    data[index + 3],
  ];
}

const cache = new Map<string, { left: number[]; right: number[] }>();
export function _exportSpacingCache() {
  return safeStringify(Object.fromEntries(cache.entries()));
}

type Font = Pick<
  CSSStyleDeclaration,
  "fontFamily" | "fontStyle" | "fontWeight"
>;

function measureSpacing(
  grapheme: string,
  { fontFamily, fontStyle, fontWeight }: Readonly<Font>,
  canvasConstructor: () => HTMLCanvasElement,
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

  const leftSpacing = new Array<number>(canvasHeight).fill(Infinity);
  for (let x = 0; x < canvasWidth; x++) {
    for (let y = 0; y < canvasHeight; y++) {
      if (leftSpacing[y] === Infinity && getPixel(image, x, y)[3] !== 0) {
        leftSpacing[y] = (x - leftMargin) / fontSizePx;
      }
    }
  }

  const rightSpacing = new Array<number>(canvasHeight).fill(Infinity);
  for (let x = canvasWidth - 1; x >= 0; x--) {
    for (let y = 0; y < canvasHeight; y++) {
      if (rightSpacing[y] === Infinity && getPixel(image, x, y)[3] !== 0) {
        rightSpacing[y] = (rightMargin - x) / fontSizePx;
      }
    }
  }

  const ret = { left: leftSpacing, right: rightSpacing };
  cache.set(cacheKey, ret);
  return ret;
}

export function calculateKerning(
  graphemeLeft: string,
  graphemeRight: string,
  font: Readonly<Font>,
  canvasConstructor: () => HTMLCanvasElement,
) {
  const { right: spacingRight } = measureSpacing(
    graphemeLeft,
    font,
    canvasConstructor,
  );
  const { left: spacingLeft } = measureSpacing(
    graphemeRight,
    font,
    canvasConstructor,
  );
  const gap = Math.min(...spacingRight.map((v, i) => v + spacingLeft[i]!));
  if (gap !== Infinity) {
    return gap;
  }
  const rightMin = Math.min(...spacingRight);
  const leftMin = Math.min(...spacingLeft);
  if (Number.isFinite(rightMin) && Number.isFinite(leftMin)) {
    // "`" + "."のように互いに重ならないグリフの場合
    return rightMin + leftMin;
  } else {
    // FIXME: 少なくとも1つがスペース文字？
    return null;
  }
}
