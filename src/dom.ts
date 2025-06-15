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
}) satisfies Pick<
  Node,
  | "ELEMENT_NODE"
  | "ATTRIBUTE_NODE"
  | "TEXT_NODE"
  | "CDATA_SECTION_NODE"
  | "ENTITY_REFERENCE_NODE"
  | "ENTITY_NODE"
  | "PROCESSING_INSTRUCTION_NODE"
  | "COMMENT_NODE"
  | "DOCUMENT_NODE"
  | "DOCUMENT_TYPE_NODE"
  | "DOCUMENT_FRAGMENT_NODE"
  | "NOTATION_NODE"
>;

export function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function isText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

export function isHTMLElement(node: Node): node is HTMLElement {
  // FIXME
  return (
    isElement(node) &&
    // @ts-ignore
    typeof node.style !== "undefined"
  );
}
