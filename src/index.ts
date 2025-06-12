export type KerningOptions = {
  factor: number;
  exclude: (string | [number, number])[];
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

const Node = Object.freeze({
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  /**
   * @deprecated
   */
  ENTITY_REFERENCE_NODE: 5,
  /**
   * @deprecated
   */
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  /**
   * @deprecated
   */
  NOTATION_NODE: 12,
});

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function removeKerning(element: Element) {
  let text = "";
  let toRemove: Node[] = [];
  function replace() {
    if (toRemove.length > 0) {
      node!.parentNode!.insertBefore(
        document.createTextNode(text),
        toRemove[0]!,
      );
      for (var k = 0; k < toRemove.length; ++k) {
        node!.parentNode!.removeChild(toRemove[k]!);
      }
      toRemove.length = 0;
      text = "";
    }
  }
  let nextNode;
  for (var node = element.firstChild; node !== null; node = nextNode) {
    nextNode = node.nextSibling;
    if (isElement(node)) {
      if (node.className === "optical-kerning-applied") {
        text += node.textContent;
        toRemove.push(node);
      } else {
        replace();
        removeKerning(node);
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
  const code = ch.charCodeAt(0);
  for (let i = 0; i < exclude.length; ++i) {
    const ex = exclude[i];
    if (Array.isArray(ex)) {
      if (ex[0] <= code && code <= ex[1]) {
        return true;
      }
    } else if (typeof ex === "string") {
      for (var k = 0; k < ex.length; ++k) {
        if (ex.charCodeAt(k) === code) {
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
    if (isElement(node)) {
      // @ts-ignore  node should be instanceof HTMLElement
      if (!node.style || node.style.letterSpacing !== "") {
        continue;
      }
      if (excluded_tags.indexOf(node.tagName.toLowerCase()) >= 0) {
        continue;
      }
      calcKerning(node, analyzer, options);
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
      const fontStyle = window.getComputedStyle(parentNode).fontStyle;
      const fontWeight = window.getComputedStyle(parentNode).fontWeight;
      const fontFamily = window.getComputedStyle(parentNode).fontFamily;
      for (var i = 0; i < text.length - 1; ++i) {
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

function applyKerning(element: Element, optiont: KerningOptions) {}

export function kerning(
  element: Element,
  options: Partial<Readonly<KerningOptions>>,
) {
  const mergedOptions = {
    ...{ factor: 0.5, exclude: [] },
    ...options,
  } satisfies KerningOptions;
  const analyzer = new Analyzer();
  try {
    removeKerning(element);
    if (options.factor !== 0.0) {
      calcKerning(element, analyzer, mergedOptions);
      applyKerning(element, mergedOptions);
    }
  } finally {
    analyzer.dispose();
  }
}
