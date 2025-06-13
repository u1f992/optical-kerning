type FontStyle = Pick<
  CSSStyleDeclaration,
  "fontFamily" | "fontStyle" | "fontWeight"
>;

type Cache<V> = Record<
  string, // fontStyle
  Record<
    string, // fontWeight
    Record<
      string, // fontFamily
      Record<
        string, // ch1
        Record<
          string, // ch2
          V
        >
      >
    >
  >
>;

function constructHash<T>(
  cache: Cache<T>,
  fontStyle: string,
  fontWeight: string,
  fontFamily: string,
  ch1: string,
  ch2: string,
  value: T,
) {
  if (cache[fontStyle] === undefined) {
    cache[fontStyle] = {};
  }
  if (cache[fontStyle][fontWeight] === undefined) {
    cache[fontStyle][fontWeight] = {};
  }
  if (cache[fontStyle][fontWeight][fontFamily] === undefined) {
    cache[fontStyle][fontWeight][fontFamily] = {};
  }
  if (cache[fontStyle][fontWeight][fontFamily][ch1] === undefined) {
    cache[fontStyle][fontWeight][fontFamily][ch1] = {};
  }
  const subObj = cache[fontStyle][fontWeight][fontFamily][ch1];
  const old = subObj[ch2];
  subObj[ch2] = value;
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
    hull.push(vertices[i]);
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
      hull[hull.length - 2] = hull[hull.length - 1];
      --hull.length;
    }
  }
  return hull;
}

function createAnalyzeFn(
  height: number,
  width: number,
  margin: number,
  gapCache: Cache<number>,
  top: number,
  center: number,
  { fontStyle, fontWeight, fontFamily }: FontStyle,
  ch1: string,
  ch2: string,
  factor: number,
) {
  return (image: ImageData) => {
    let vertices = convexHull(image, 0, top, center, height * 2, true);
    const leftBorders = new Array(height * 2);
    if (vertices.length > 0) {
      for (let i = 1; i < vertices.length; ++i) {
        const x0 = vertices[i - 1]!.x;
        const y0 = vertices[i - 1]!.y;
        const x1 = vertices[i]!.x;
        const y1 = vertices[i]!.y;
        for (let y = y0; y <= y1; ++y) {
          const x = x0 + Math.floor(((x1 - x0) * (y - y0)) / (y1 - y0) + 0.5);
          leftBorders[y] = x;
        }
      }
    }
    vertices = convexHull(
      image,
      center,
      top,
      width - center,
      height * 2,
      false,
    );
    const rightBorders = new Array(height * 2);
    if (vertices.length > 0) {
      for (let i = 1; i < vertices.length; ++i) {
        const x0 = vertices[i - 1]!.x;
        const y0 = vertices[i - 1]!.y;
        const x1 = vertices[i]!.x;
        const y1 = vertices[i]!.y;
        for (let y = y0; y >= y1; --y) {
          const x = x0 + Math.floor(((x1 - x0) * (y - y0)) / (y1 - y0) + 0.5);
          rightBorders[y] = x;
        }
      }
    }
    const gaps = [];
    for (let y = top; y < top + height * 2; ++y) {
      if (leftBorders[y] !== undefined && rightBorders[y] !== undefined) {
        gaps.push(
          Math.max(0, rightBorders[y] - leftBorders[y] - 1 - margin * 2),
        );
      }
    }
    let gap;
    if (gaps.length === 0) {
      let max = -Number.MAX_VALUE;
      let min = Number.MAX_VALUE;
      for (var y = top; y < top + height * 2; ++y) {
        if (leftBorders[y] !== undefined && max < leftBorders[y]) {
          max = leftBorders[y];
        }
        if (rightBorders[y] !== undefined && min > rightBorders[y]) {
          min = rightBorders[y];
        }
      }
      if (max !== -Number.MAX_VALUE && min !== Number.MAX_VALUE) {
        gap = ((min - max - 1 - margin * 2) / height) * factor;
      } else {
        gap = 0;
      }
    } else {
      let min = gaps[0]!;
      for (var i = 0; i < gaps.length; ++i) {
        min = Math.min(min, gaps[i]!);
      }
      gap = (min / height) * factor;
    }
    constructHash(gapCache, fontStyle, fontWeight, fontFamily, ch1, ch2, gap);
  };
}

export class Analyzer {
  #height;
  #width;
  #margin;
  #tiles;
  #preparedCache: Cache<boolean>;
  #gapCache: Cache<number>;
  #canvas;
  #context;
  #imageTop;
  #analyzeFuncs: ((image: ImageData) => void)[];
  constructor(window: Pick<Window, "document">) {
    this.#height = 32;
    this.#width = 128;
    this.#margin = 16;
    this.#tiles = 64;
    this.#preparedCache = {};
    this.#gapCache = {};
    this.#canvas = window.document.createElement("canvas");
    this.#canvas.width = this.#width;
    this.#canvas.height = this.#height * 2 * this.#tiles;
    this.#canvas.style.display = "none";
    this.#context = this.#canvas.getContext("2d")!;
    this.#context.fillStyle = "#000000";
    this.#context.textBaseline = "middle";
    this.#imageTop = 0;
    this.#analyzeFuncs = [];
  }
  prepareGap(
    ch1: string,
    ch2: string,
    { fontStyle, fontWeight, fontFamily }: FontStyle,
    factor: number,
  ) {
    if (
      constructHash(
        this.#preparedCache,
        fontStyle,
        fontWeight,
        fontFamily,
        ch1,
        ch2,
        true,
      ) === true
    ) {
      return;
    }
    if (this.#imageTop === 0) {
      this.#context.clearRect(
        0,
        0,
        this.#width,
        this.#height * 2 * this.#tiles,
      );
    }
    this.#context.font =
      fontStyle + " " + fontWeight + " " + this.#height + "px " + fontFamily;
    const ch1Width = this.#context.measureText(ch1).width;
    this.#context.fillText(ch1, 0, this.#imageTop + this.#height);
    const center = Math.ceil(ch1Width) + this.#margin;
    this.#context.fillText(
      ch2,
      center + this.#margin,
      this.#imageTop + this.#height,
    );
    const top = this.#imageTop;
    this.#imageTop += this.#height * 2;
    this.#analyzeFuncs.push(
      createAnalyzeFn(
        this.#height,
        this.#width,
        this.#margin,
        this.#gapCache,
        top,
        center,
        { fontStyle, fontFamily, fontWeight },
        ch1,
        ch2,
        factor,
      ),
    );
    if (this.#analyzeFuncs.length === this.#tiles) {
      this.#analyzeAll();
    }
  }
  #analyzeAll() {
    const image = this.#context.getImageData(
      0,
      0,
      this.#width,
      this.#height * 2 * this.#tiles,
    );
    this.#analyzeFuncs.forEach((fn) => fn(image));
    this.#imageTop = 0;
    this.#analyzeFuncs.length = 0;
  }
  getGap(
    ch1: string,
    ch2: string,
    { fontStyle, fontWeight, fontFamily }: FontStyle,
  ) {
    if (this.#analyzeFuncs.length > 0) {
      this.#analyzeAll();
    }
    const ret =
      this.#gapCache[fontStyle]?.[fontWeight]?.[fontFamily]?.[ch1]?.[ch2];
    if (typeof ret === "undefined") {
      throw new Error('runtime assertion failed: type of ret !== "undefined"');
    }
    return ret;
  }
}
