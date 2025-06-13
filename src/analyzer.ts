import type {
  HTMLCanvasElement,
  CSSStyleDeclaration,
  CanvasRenderingContext2D,
  ImageData,
} from "./dom.js";
import { safeStringify, type JSONSerializable } from "./json.js";

type FontStyle = Pick<
  CSSStyleDeclaration,
  "fontFamily" | "fontStyle" | "fontWeight"
>;

function constructHash<T>(
  cache: Record<PropertyKey, T>,
  keyObj: JSONSerializable,
  value: T,
) {
  const key = safeStringify(keyObj);
  const old = cache[key];
  cache[key] = value;
  return old;
}

function convexHull(
  image: ImageData,
  sx: number,
  sy: number,
  width: number,
  height: number,
  right: boolean,
) {
  const vertices = [];
  if (right) {
    for (let y = sy; y < sy + height; ++y) {
      let i = 3 + 4 * (sx + width - 1 + y * image.width);
      for (let x = sx + width - 1; x >= sx; --x, i -= 4) {
        if (image.data[i] !== 0) {
          vertices.push({ x, y });
          break;
        }
      }
    }
  } else {
    for (let y = sy + height - 1; y >= sy; --y) {
      let i = 3 + 4 * (sx + y * image.width);
      for (let x = sx; x < sx + height; ++x, i += 4) {
        if (image.data[i] !== 0) {
          vertices.push({ x, y });
          break;
        }
      }
    }
  }
  const hull = [];
  for (let i = 0; i < vertices.length; ++i) {
    hull.push(vertices[i]!);
    while (hull.length >= 3) {
      const x0 = hull[hull.length - 3]!.x;
      const y0 = hull[hull.length - 3]!.y;
      const x1 = hull[hull.length - 2]!.x;
      const y1 = hull[hull.length - 2]!.y;
      const x2 = hull[hull.length - 1]!.x;
      const y2 = hull[hull.length - 1]!.y;
      if ((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0) > 0) {
        break;
      }
      hull[hull.length - 2] = hull[hull.length - 1]!;
      --hull.length;
    }
  }
  return hull;
}

function createAnalyzeFn(
  fontSize: number,
  imageWidth: number,
  margin: number,
  gapCache: Record<PropertyKey, number>,
  top: number,
  center: number,
  { fontStyle, fontWeight, fontFamily }: FontStyle,
  ch1: string,
  ch2: string,
  factor: number,
) {
  return (image: ImageData) => {
    const ch1Vertices = convexHull(image, 0, top, center, fontSize * 2, true);
    const leftBorders = new Array<number>(fontSize * 2);
    if (ch1Vertices.length > 0) {
      for (let i = 1; i < ch1Vertices.length; i++) {
        const { x: x0, y: y0 } = ch1Vertices[i - 1]!;
        const { x: x1, y: y1 } = ch1Vertices[i]!;
        for (let y = y0; y <= y1; y++) {
          const x = x0 + Math.floor(((x1 - x0) * (y - y0)) / (y1 - y0) + 0.5);
          leftBorders[y] = x;
        }
      }
    }
    const ch2Vertices = convexHull(
      image,
      center,
      top,
      imageWidth - center,
      fontSize * 2,
      false,
    );
    const rightBorders = new Array<number>(fontSize * 2);
    if (ch2Vertices.length > 0) {
      for (let i = 1; i < ch2Vertices.length; ++i) {
        const { x: x0, y: y0 } = ch2Vertices[i - 1]!;
        const { x: x1, y: y1 } = ch2Vertices[i]!;
        for (let y = y0; y >= y1; y--) {
          const x = x0 + Math.floor(((x1 - x0) * (y - y0)) / (y1 - y0) + 0.5);
          rightBorders[y] = x;
        }
      }
    }
    const gaps = [];
    for (let y = top; y < top + fontSize * 2; ++y) {
      const leftX = leftBorders[y];
      const rightX = rightBorders[y];
      if (typeof leftX !== "undefined" && typeof rightX !== "undefined") {
        gaps.push(Math.max(0, rightX - leftX - 1 - margin * 2));
      }
    }
    let gap;
    if (gaps.length === 0) {
      let max = -Number.MAX_VALUE;
      let min = Number.MAX_VALUE;
      for (var y = top; y < top + fontSize * 2; ++y) {
        const leftX = leftBorders[y];
        if (typeof leftX !== "undefined" && max < leftX) {
          max = leftX;
        }
        const rightX = rightBorders[y];
        if (typeof rightX !== "undefined" && min > rightX) {
          min = rightX;
        }
      }
      if (max !== -Number.MAX_VALUE && min !== Number.MAX_VALUE) {
        gap = ((min - max - 1 - margin * 2) / fontSize) * factor;
      } else {
        gap = 0;
      }
    } else {
      let min = gaps[0]!;
      for (var i = 0; i < gaps.length; ++i) {
        min = Math.min(min, gaps[i]!);
      }
      gap = (min / fontSize) * factor;
    }
    constructHash(
      gapCache,
      { fontStyle, fontWeight, fontFamily, ch1, ch2 },
      gap,
    );
  };
}

const FONT_SIZE = 32;
const CANVAS_WIDTH = 128;
const CANVAS_TILES = 64;
const CANVAS_HEIGHT = FONT_SIZE * 2 * CANVAS_TILES;
const ANALYZER_MARGIN = 16;

export type AnalyzerContext = {
  preparedCache: Record<PropertyKey, boolean>;
  gapCache: Record<PropertyKey, number>;
  context: CanvasRenderingContext2D;
  imageTop: number;
  analyzeFuncs: ((image: ImageData) => void)[];
};

export function createAnalyzerContext(
  canvasConstructor: () => HTMLCanvasElement,
): AnalyzerContext {
  const canvas = canvasConstructor();
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.display = "none";
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.fillStyle = "#000000";
  context.textBaseline = "middle";

  return {
    preparedCache: {},
    gapCache: {},
    context,
    imageTop: 0,
    analyzeFuncs: [],
  };
}

function analyzeAll(ctx: AnalyzerContext) {
  const image = ctx.context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.analyzeFuncs.forEach((fn) => fn(image));
  ctx.imageTop = 0;
  ctx.analyzeFuncs.length = 0;
}

export function prepareGap(
  ctx: AnalyzerContext,
  ch1: string,
  ch2: string,
  { fontStyle, fontWeight, fontFamily }: FontStyle,
  factor: number,
) {
  if (
    constructHash(
      ctx.preparedCache,
      { fontStyle, fontWeight, fontFamily, ch1, ch2 },
      true,
    ) === true
  ) {
    return;
  }
  if (ctx.imageTop === 0) {
    ctx.context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  ctx.context.font =
    fontStyle + " " + fontWeight + " " + FONT_SIZE + "px " + fontFamily;
  const ch1Width = ctx.context.measureText(ch1).width;
  ctx.context.fillText(ch1, 0, ctx.imageTop + FONT_SIZE);
  const center = Math.ceil(ch1Width) + ANALYZER_MARGIN;
  ctx.context.fillText(ch2, center + ANALYZER_MARGIN, ctx.imageTop + FONT_SIZE);
  const top = ctx.imageTop;
  ctx.imageTop += FONT_SIZE * 2;
  ctx.analyzeFuncs.push(
    createAnalyzeFn(
      FONT_SIZE,
      CANVAS_WIDTH,
      ANALYZER_MARGIN,
      ctx.gapCache,
      top,
      center,
      { fontStyle, fontFamily, fontWeight },
      ch1,
      ch2,
      factor,
    ),
  );
  if (ctx.analyzeFuncs.length === CANVAS_TILES) {
    analyzeAll(ctx);
  }
}

export function getGap(
  ctx: AnalyzerContext,
  ch1: string,
  ch2: string,
  { fontStyle, fontWeight, fontFamily }: FontStyle,
) {
  if (ctx.analyzeFuncs.length > 0) {
    analyzeAll(ctx);
  }
  const ret =
    ctx.gapCache[
      safeStringify({ fontStyle, fontWeight, fontFamily, ch1, ch2 })
    ];
  if (typeof ret === "undefined") {
    throw new Error('runtime assertion failed: type of ret !== "undefined"');
  }
  return ret;
}
