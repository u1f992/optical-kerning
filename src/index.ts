export type KerningOptions = {
  factor: number;
  exclude: (string | [number, number])[];
};

class Analyzer {
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

function calcKerning(element: Element, options: KerningOptions) {}

function applyKerning(element: Element, optiont: KerningOptions) {}

export function kerning(element: Element, options: Partial<KerningOptions>) {
  const mergedOptions = {
    ...{ factor: 0.5, exclude: [] },
    ...options,
  };
  const analyzer = new Analyzer();
  try {
    removeKerning(element);
    if (options.factor !== 0.0) {
      calcKerning(element, mergedOptions);
      applyKerning(element, mergedOptions);
    }
  } finally {
    analyzer.dispose();
  }
}
