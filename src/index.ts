import { isElement, isText, isHTMLElement } from "./dom.js";
import {
  createSpacingCache,
  exportSpacingCache,
  importSpacingCache,
  calculateKerning,
  type SpacingCache,
} from "./kerning.js";
import { unwrapElements } from "./unwrap-elements.js";
import { pairwise } from "./util.js";

export {
  type SpacingCache,
  createSpacingCache,
  exportSpacingCache,
  importSpacingCache,
};

export type OpticalKerningOptions = {
  factor: number;
  exclude: readonly (string | [number, number])[];
  locales: Intl.LocalesArgument;
  cache: SpacingCache;
};

type WindowFunctions = Pick<Window, "getComputedStyle"> &
  Pick<
    Window["document"],
    "createTextNode" | "createDocumentFragment" | "createElement"
  >;

function getGraphemes(text: string, locales: Intl.LocalesArgument) {
  return [
    ...new Intl.Segmenter(locales, {
      granularity: "grapheme",
    }).segment(text),
  ].map((seg) => seg.segment);
}

function excluded(
  grapheme: string,
  { exclude, locales }: Pick<OpticalKerningOptions, "exclude" | "locales">,
) {
  const code = grapheme.codePointAt(0);
  if (typeof code === "undefined") {
    throw new Error('runtime assertion failed: typeof code !== "undefined"');
  }
  return exclude.some(
    (ex) =>
      (Array.isArray(ex) && ex[0] <= code && code <= ex[1]) ||
      (typeof ex === "string" &&
        getGraphemes(ex, locales).some((g) => g.codePointAt(0) === code)),
  );
}

function apply(
  element: Element,
  {
    getComputedStyle,
    createDocumentFragment,
    createTextNode,
    createElement,
  }: WindowFunctions,
  { factor, exclude, locales, cache }: OpticalKerningOptions,
) {
  for (let node = element.firstChild; node !== null; node = node.nextSibling) {
    if (isHTMLElement(node) && node.style.letterSpacing === "") {
      apply(
        node,
        {
          getComputedStyle,
          createDocumentFragment,
          createTextNode,
          createElement,
        },
        { factor, exclude, locales, cache },
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
      const graphemes = getGraphemes(text, locales);
      for (const [g0, g1] of pairwise(graphemes)) {
        if (
          excluded(g0, { exclude, locales }) ||
          excluded(g1, { exclude, locales })
        ) {
          spans.appendChild(createTextNode(g0));
          continue;
        }
        const gap = calculateKerning(
          g0,
          g1,
          computedStyle,
          factor,
          () => createElement("canvas"),
          cache,
        );
        const span = createElement("span");
        span.setAttribute("class", "optical-kerning-applied");
        span.style.letterSpacing = gap !== null ? -gap + "em" : "normal";
        span.textContent = g0;
        spans.appendChild(span);
      }
      const lastGrapheme = graphemes.at(-1);
      if (typeof lastGrapheme !== "undefined") {
        spans.appendChild(createTextNode(lastGrapheme));
      }
      spans.normalize();
      parentNode.insertBefore(spans, node);
      parentNode.removeChild(node);
    }
  }
}

export function applyOpticalKerning(
  element: Element,
  options: Partial<Readonly<OpticalKerningOptions>>,
) {
  const mergedOptions = {
    ...{
      factor: 0.5,
      exclude: [],
      locales: undefined,
      cache: createSpacingCache(),
    },
    ...options,
  } satisfies OpticalKerningOptions;

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

  unwrapElements(
    element,
    (element) => element.className === "optical-kerning-applied",
  );
  if (options.factor !== 0.0) {
    apply(element, windowFn, mergedOptions);
  }
}
