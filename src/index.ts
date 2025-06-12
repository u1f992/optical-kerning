type MockGlobal = Pick<
  Window & typeof globalThis,
  "getComputedStyle" | "HTMLElement" | "Node"
>;

export type KerningOptions = {
  factor: number;
  exclude: (string | [number, number])[];
  locales?: Intl.LocalesArgument;
  window: MockGlobal;
};

class Analyzer {
  prepareGap(
    ch1: string,
    ch2: string,
    fontStyle: string,
    fontWeight: string,
    fontFamily: string,
    options: Readonly<KerningOptions>,
  ) {}
  dispose() {}
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

function removeKerning(element: Element, options: Readonly<KerningOptions>) {
  let text = "";
  let toRemove: Node[] = [];
  function replace() {
    if (toRemove.length > 0) {
      node!.parentNode!.insertBefore(
        document.createTextNode(text),
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
    if (isElement(node, options.window)) {
      if (node.className === "optical-kerning-applied") {
        text += node.textContent;
        toRemove.push(node);
      } else {
        replace();
        removeKerning(node, options);
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
    throw new Error('assertion failed: typeof code !== "undefined"');
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
  options: Readonly<KerningOptions>,
) {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (isHTMLElement(node, options.window)) {
      if (
        node.style.letterSpacing !== "" ||
        excluded_tags.includes(node.tagName.toLowerCase())
      ) {
        continue;
      }
      calcKerning(node, analyzer, options);
    } else if (isText(node, options.window)) {
      const text = node.nodeValue;
      const parentNode = node.parentNode;
      if (
        text === null ||
        text.match(/^[\s\t\r\n]*$/) ||
        parentNode === null ||
        !isElement(parentNode, options.window)
      ) {
        continue;
      }
      const fontStyle = options.window.getComputedStyle(parentNode).fontStyle;
      const fontWeight = options.window.getComputedStyle(parentNode).fontWeight;
      const fontFamily = options.window.getComputedStyle(parentNode).fontFamily;

      const segmenter = new Intl.Segmenter(options.locales, {
        granularity: "grapheme",
      });
      const graphemes = [...segmenter.segment(text)];
      for (let i = 0; i < graphemes.length - 1; ++i) {
        if (
          excluded(text[i]!, options.exclude) ||
          excluded(text[i + 1]!, options.exclude)
        ) {
          continue;
        }
        analyzer.prepareGap(
          text[i]!,
          text[i + 1]!,
          fontStyle,
          fontWeight,
          fontFamily,
          options,
        );
      }
    }
  }
}

function applyKerning(element: Element, options: KerningOptions) {}

export function kerning(
  element: Element,
  options: Partial<Readonly<KerningOptions>>,
) {
  const mergedOptions = {
    ...{ factor: 0.5, exclude: [], locales: undefined, window },
    ...options,
  } satisfies KerningOptions;
  const analyzer = new Analyzer();
  try {
    removeKerning(element, mergedOptions);
    if (options.factor !== 0.0) {
      calcKerning(element, analyzer, mergedOptions);
      applyKerning(element, mergedOptions);
    }
  } finally {
    analyzer.dispose();
  }
}
