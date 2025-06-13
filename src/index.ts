type MockGlobal = Pick<
  Window & typeof globalThis,
  "getComputedStyle" | "HTMLElement" | "Node" | "document"
>;

export type KerningOptions = {
  factor: number;
  exclude: readonly (string | [number, number])[];
  locales?: Intl.LocalesArgument;
  window: MockGlobal;
};

function constructHash<
  T extends Record<PropertyKey, any>,
  K extends PropertyKey[],
  V,
>(obj: T, ...args: [...K, V]): any {
  let hash: any = obj;
  for (let i = 0; i < args.length - 2; ++i) {
    const key = args[i];
    if (hash[key] === undefined) {
      hash[key] = {};
    }
    hash = hash[key];
  }
  const lastKey = args[args.length - 2];
  const old = hash[lastKey];
  hash[lastKey] = args[args.length - 1];
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
  var vertices = [];
  if (right) {
    for (var y = sy; y < sy + height; ++y) {
      var i = 3 + 4 * (sx + width - 1 + y * image.width);
      for (var x = sx + width - 1; x >= sx; --x, i -= 4) {
        if (image.data[i] !== 0) {
          vertices.push({ x: x, y: y });
          break;
        }
      }
    }
  } else {
    for (var y = sy + height - 1; y >= sy; --y) {
      var i = 3 + 4 * (sx + y * image.width);
      for (var x = sx; x < sx + height; ++x, i += 4) {
        if (image.data[i] !== 0) {
          vertices.push({ x: x, y: y });
          break;
        }
      }
    }
  }
  var hull = [];
  for (var i = 0; i < vertices.length; ++i) {
    hull.push(vertices[i]);
    while (hull.length >= 3) {
      var x0 = hull[hull.length - 3]!.x;
      var y0 = hull[hull.length - 3]!.y;
      var x1 = hull[hull.length - 2]!.x;
      var y1 = hull[hull.length - 2]!.y;
      var x2 = hull[hull.length - 1]!.x;
      var y2 = hull[hull.length - 1]!.y;
      if ((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0) > 0) {
        break;
      }
      hull[hull.length - 2] = hull[hull.length - 1];
      --hull.length;
    }
  }
  return hull;
}

class Analyzer {
  #window;
  #height;
  #width;
  #margin;
  #tiles;
  #preparedCache;
  #gapCache;
  #canvas;
  #context;
  #image: ImageData | null;
  #imageTop;
  #analyzeFuncs: (() => void)[];
  constructor({ window }: KerningOptions) {
    this.#window = window;
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
    this.#image = null;
    this.#imageTop = 0;
    this.#analyzeFuncs = [];
  }
  prepareGap(
    ch1: string,
    ch2: string,
    fontStyle: string,
    fontWeight: string,
    fontFamily: string,
    options: Readonly<KerningOptions>,
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
    const analyze = (() => {
      const image = this.#image;
      if (image === null) {
        throw new Error("runtime assertion failed: image !== null");
      }
      const height = this.#height;
      const width = this.#width;
      const margin = this.#margin;
      const gapCache = this.#gapCache;

      return function analyzeImage() {
        let vertices = convexHull(image, 0, top, center, height * 2, true);
        const leftBorders = new Array(height * 2);
        if (vertices.length > 0) {
          for (let i = 1; i < vertices.length; ++i) {
            const x0 = vertices[i - 1]!.x;
            const y0 = vertices[i - 1]!.y;
            const x1 = vertices[i]!.x;
            const y1 = vertices[i]!.y;
            for (let y = y0; y <= y1; ++y) {
              const x =
                x0 + Math.floor(((x1 - x0) * (y - y0)) / (y1 - y0) + 0.5);
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
              const x =
                x0 + Math.floor(((x1 - x0) * (y - y0)) / (y1 - y0) + 0.5);
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
            gap = ((min - max - 1 - margin * 2) / height) * options.factor;
          } else {
            gap = 0;
          }
        } else {
          let min = gaps[0]!;
          for (var i = 0; i < gaps.length; ++i) {
            min = Math.min(min, gaps[i]!);
          }
          gap = (min / height) * options.factor;
        }
        constructHash(
          gapCache,
          fontStyle,
          fontWeight,
          fontFamily,
          ch1,
          ch2,
          gap,
        );
      };
    })();
    this.#analyzeFuncs.push(analyze);
    if (this.#analyzeFuncs.length === this.#tiles) {
      this.#analyzeAll();
    }
  }
  #analyzeAll() {
    this.#image = this.#context.getImageData(
      0,
      0,
      this.#width,
      this.#height * 2 * this.#tiles,
    );
    this.#analyzeFuncs.forEach((fn) => fn());
    this.#image = null;
    this.#imageTop = 0;
    this.#analyzeFuncs.length = 0;
  }
  getGap(
    ch1: string,
    ch2: string,
    fontStyle: string,
    fontWeight: string,
    fontFamily: string,
  ) {
    if (this.#analyzeFuncs.length > 0) {
      this.#analyzeAll();
    }
    // @ts-ignore
    return this.#gapCache[fontStyle][fontWeight][fontFamily][ch1][ch2];
  }
  dispose() {
    this.#window.document.body.removeChild(this.#canvas);
  }
}

function isElement(node: Node, window: MockGlobal): node is Element {
  return node.nodeType === window.Node.ELEMENT_NODE;
}

function isText(node: Node, window: MockGlobal): node is Text {
  return node.nodeType === window.Node.TEXT_NODE;
}

function isHTMLElement(node: Node, window: MockGlobal): node is HTMLElement {
  return node instanceof window.HTMLElement;
}

function removeKerning(
  element: Element,
  { window }: Pick<Readonly<KerningOptions>, "window">,
) {
  let text = "";
  let toRemove: Node[] = [];
  function replace() {
    if (toRemove.length > 0) {
      node!.parentNode!.insertBefore(
        window.document.createTextNode(text),
        toRemove[0]!,
      );
      for (let k = 0; k < toRemove.length; ++k) {
        node!.parentNode!.removeChild(toRemove[k]!);
      }
      toRemove.length = 0;
      text = "";
    }
  }
  let nextNode;
  // FIXME: `var` statement
  for (var node = element.firstChild; node !== null; node = nextNode) {
    nextNode = node.nextSibling;
    if (isElement(node, window)) {
      if (node.className === "optical-kerning-applied") {
        text += node.textContent;
        toRemove.push(node);
      } else {
        replace();
        removeKerning(node, { window });
      }
    } else {
      replace();
    }
  }
  replace();
  element.normalize();
}

const excluded_tags = ["option", "script", "textarea"];

function excluded(ch: string, exclude: readonly (string | [number, number])[]) {
  const code = ch.codePointAt(0);
  if (typeof code === "undefined") {
    throw new Error('runtime assertion failed: typeof code !== "undefined"');
  }
  for (let i = 0; i < exclude.length; ++i) {
    const ex = exclude[i];
    if (Array.isArray(ex)) {
      if (ex[0] <= code && code <= ex[1]) {
        return true;
      }
    } else if (typeof ex === "string") {
      for (let k = 0; k < ex.length; ++k) {
        if (ex.codePointAt(k) === code) {
          return true;
        }
      }
    }
  }
  return false;
}

function calcKerning(
  element: Element,
  analyzer: Analyzer,
  { factor, exclude, locales, window }: Readonly<KerningOptions>,
) {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (isHTMLElement(node, window)) {
      if (
        node.style.letterSpacing !== "" ||
        excluded_tags.includes(node.tagName.toLowerCase())
      ) {
        continue;
      }
      calcKerning(node, analyzer, { factor, exclude, locales, window });
    } else if (isText(node, window)) {
      const text = node.nodeValue;
      const parentNode = node.parentNode;
      if (
        text === null ||
        text.match(/^[\s\t\r\n]*$/) ||
        parentNode === null ||
        !isElement(parentNode, window)
      ) {
        continue;
      }

      const { fontStyle, fontWeight, fontFamily } =
        window.getComputedStyle(parentNode);

      const graphemes = [
        ...new Intl.Segmenter(locales, {
          granularity: "grapheme",
        }).segment(text),
      ];
      for (let i = 0; i < graphemes.length - 1; ++i) {
        const seg0 = graphemes[i]?.segment ?? "";
        const seg1 = graphemes[i + 1]?.segment ?? "";
        if (excluded(seg0, exclude) || excluded(seg1, exclude)) {
          continue;
        }
        analyzer.prepareGap(seg0, seg1, fontStyle, fontWeight, fontFamily, {
          factor,
          exclude,
          locales,
          window,
        });
      }
    }
  }
}

function applyKerning(
  element: Element,
  analyzer: Analyzer,
  {
    window,
    exclude,
    locales,
  }: Pick<Readonly<KerningOptions>, "window" | "exclude" | "locales">,
) {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (isHTMLElement(node, window)) {
      if (
        node.style.letterSpacing !== "" ||
        excluded_tags.includes(node.tagName.toLowerCase())
      ) {
        continue;
      }
      applyKerning(node, analyzer, { window, exclude });
    } else if (isText(node, window)) {
      const text = node.nodeValue;
      const parentNode = node.parentNode;
      if (
        text === null ||
        text.match(/^[\s\t\r\n]*$/) ||
        parentNode === null ||
        !isElement(parentNode, window)
      ) {
        continue;
      }

      const { fontStyle, fontWeight, fontFamily } =
        window.getComputedStyle(parentNode);

      const spans = window.document.createDocumentFragment();
      const graphemes = [
        ...new Intl.Segmenter(locales, {
          granularity: "grapheme",
        }).segment(text),
      ];
      for (let i = 0; i < graphemes.length - 1; ++i) {
        const seg0 = graphemes[i]?.segment ?? "";
        const seg1 = graphemes[i + 1]?.segment ?? "";
        if (excluded(seg0, exclude) || excluded(seg1, exclude)) {
          const textNode = window.document.createTextNode(seg0);
          spans.appendChild(textNode);
          continue;
        }
        const gap = analyzer.getGap(
          seg0,
          seg1,
          fontStyle,
          fontWeight,
          fontFamily,
        );
        const span = window.document.createElement("span");
        span.setAttribute("class", "optical-kerning-applied");
        span.setAttribute("style", "letter-spacing: " + -gap + "em");
        span.textContent = seg0;
        spans.appendChild(span);
      }
      const lastGrapheme = graphemes.at(-1);
      if (lastGrapheme && typeof lastGrapheme.segment !== "undefined") {
        const textNode = window.document.createTextNode(lastGrapheme.segment);
        spans.appendChild(textNode);
      }
      spans.normalize();
      parentNode.insertBefore(spans, node);
      parentNode.removeChild(node);
    }
  }
}

export function kerning(
  element: Element,
  options: Partial<Readonly<KerningOptions>>,
) {
  const mergedOptions = {
    ...{ factor: 0.5, exclude: [], locales: undefined, window },
    ...options,
  } satisfies KerningOptions;
  const analyzer = new Analyzer(mergedOptions);
  try {
    removeKerning(element, mergedOptions);
    if (options.factor !== 0.0) {
      calcKerning(element, analyzer, mergedOptions);
      applyKerning(element, analyzer, mergedOptions);
    }
  } finally {
    analyzer.dispose();
  }
}
