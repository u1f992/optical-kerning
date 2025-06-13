import { Analyzer } from "./analyzer.js";
import { isElement, isText, isHTMLElement } from "./html.js";
import { pairwise } from "./util.js";

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
    if (isElement(node)) {
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
    if (
      isHTMLElement(node, window) &&
      node.style.letterSpacing === "" &&
      !excluded_tags.includes(node.tagName.toLowerCase())
    ) {
      calcKerning(node, analyzer, { factor, exclude, locales, window });
    } else if (isText(node)) {
      const text = node.nodeValue;
      const parentNode = node.parentNode;
      if (
        text === null ||
        text.match(/^[\s\t\r\n]*$/) ||
        parentNode === null ||
        !isElement(parentNode)
      ) {
        continue;
      }

      const computedStyle = window.getComputedStyle(parentNode);
      for (const [g0, g1] of pairwise([
        ...new Intl.Segmenter(locales, {
          granularity: "grapheme",
        }).segment(text),
      ])) {
        const seg0 = g0.segment ?? "";
        const seg1 = g1.segment ?? "";
        if (excluded(seg0, exclude) || excluded(seg1, exclude)) {
          continue;
        }
        analyzer.prepareGap(seg0, seg1, computedStyle, factor);
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
    if (
      isHTMLElement(node, window) &&
      node.style.letterSpacing === "" &&
      !excluded_tags.includes(node.tagName.toLowerCase())
    ) {
      applyKerning(node, analyzer, { window, exclude });
    } else if (isText(node)) {
      const text = node.nodeValue;
      const parentNode = node.parentNode;
      if (
        text === null ||
        text.match(/^[\s\t\r\n]*$/) ||
        parentNode === null ||
        !isElement(parentNode)
      ) {
        continue;
      }

      const computedStyle = window.getComputedStyle(parentNode);
      const spans = window.document.createDocumentFragment();
      const graphemes = [
        ...new Intl.Segmenter(locales, {
          granularity: "grapheme",
        }).segment(text),
      ];
      for (const [g0, g1] of pairwise(graphemes)) {
        const seg0 = g0.segment ?? "";
        const seg1 = g1.segment ?? "";
        if (excluded(seg0, exclude) || excluded(seg1, exclude)) {
          const textNode = window.document.createTextNode(seg0);
          spans.appendChild(textNode);
          continue;
        }
        const gap = analyzer.getGap(seg0, seg1, computedStyle);
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
  const analyzer = new Analyzer(mergedOptions.window);
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
