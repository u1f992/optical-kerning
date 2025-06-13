import { Analyzer } from "./analyzer.js";
import type { Window, Node, Element } from "./dom.js";
import { isElement, isText, isHTMLElement } from "./html.js";
import { pairwise } from "./util.js";

export type KerningOptions = {
  factor: number;
  exclude: readonly (string | [number, number])[];
  locales?: Intl.LocalesArgument;
};

type WindowFunctions = Pick<Window, "getComputedStyle"> &
  Pick<
    Window["document"],
    "createTextNode" | "createDocumentFragment" | "createElement"
  >;

function removeKerning(
  element: Element,
  { createTextNode }: Pick<WindowFunctions, "createTextNode">,
) {
  let text = "";
  let toRemove: Node[] = [];
  function replace() {
    if (toRemove.length > 0) {
      node!.parentNode!.insertBefore(createTextNode(text), toRemove[0]!);
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
        removeKerning(node, { createTextNode });
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
  { getComputedStyle }: Pick<WindowFunctions, "getComputedStyle">,
  analyzer: Analyzer,
  { factor, exclude, locales }: Readonly<KerningOptions>,
) {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (
      isHTMLElement(node) &&
      node.style.letterSpacing === "" &&
      !excluded_tags.includes(node.tagName.toLowerCase())
    ) {
      calcKerning(node, { getComputedStyle }, analyzer, {
        factor,
        exclude,
        locales,
      });
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

      const computedStyle = getComputedStyle(parentNode);
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
  {
    getComputedStyle,
    createDocumentFragment,
    createTextNode,
    createElement,
  }: Pick<
    WindowFunctions,
    | "getComputedStyle"
    | "createDocumentFragment"
    | "createTextNode"
    | "createElement"
  >,
  analyzer: Analyzer,
  { exclude, locales }: Pick<Readonly<KerningOptions>, "exclude" | "locales">,
) {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (
      isHTMLElement(node) &&
      node.style.letterSpacing === "" &&
      !excluded_tags.includes(node.tagName.toLowerCase())
    ) {
      applyKerning(
        node,
        {
          getComputedStyle,
          createDocumentFragment,
          createTextNode,
          createElement,
        },
        analyzer,
        { exclude, locales },
      );
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

      const computedStyle = getComputedStyle(parentNode);
      const spans = createDocumentFragment();
      const graphemes = [
        ...new Intl.Segmenter(locales, {
          granularity: "grapheme",
        }).segment(text),
      ];
      for (const [g0, g1] of pairwise(graphemes)) {
        const seg0 = g0.segment ?? "";
        const seg1 = g1.segment ?? "";
        if (excluded(seg0, exclude) || excluded(seg1, exclude)) {
          const textNode = createTextNode(seg0);
          spans.appendChild(textNode);
          continue;
        }
        const gap = analyzer.getGap(seg0, seg1, computedStyle);
        const span = createElement("span");
        span.setAttribute("class", "optical-kerning-applied");
        span.setAttribute("style", "letter-spacing: " + -gap + "em");
        span.textContent = seg0;
        spans.appendChild(span);
      }
      const lastGrapheme = graphemes.at(-1);
      if (lastGrapheme && typeof lastGrapheme.segment !== "undefined") {
        const textNode = createTextNode(lastGrapheme.segment);
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
    ...{ factor: 0.5, exclude: [], locales: undefined },
    ...options,
  } satisfies KerningOptions;
  const window = element.ownerDocument.defaultView;
  if (!window) {
    throw new Error("runtime assertion failed: window !== null");
  }
  const windowFn = {
    getComputedStyle: window.getComputedStyle.bind(window),
    createTextNode: window.document.createTextNode.bind(window.document),
    createDocumentFragment: window.document.createDocumentFragment.bind(
      window.document,
    ),
    createElement: window.document.createElement.bind(window.document),
  } satisfies WindowFunctions;
  const analyzer = new Analyzer(window);
  removeKerning(element, windowFn);
  if (options.factor !== 0.0) {
    calcKerning(element, windowFn, analyzer, mergedOptions);
    applyKerning(element, windowFn, analyzer, mergedOptions);
  }
}
