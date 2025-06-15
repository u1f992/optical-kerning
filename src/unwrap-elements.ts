import { isElement } from "./dom.js";

function unwrapElement(element: Element) {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }
  // NOTE: to create a frozen copy
  const childNodes = Array.from(element.childNodes);
  for (const child of childNodes) {
    parent.insertBefore(child, element);
  }
  parent.removeChild(element);
}

export function unwrapElements(
  element: Node,
  shouldUnwrap: (element: Element) => boolean,
) {
  // NOTE: to create a frozen copy
  const childNodes = Array.from(element.childNodes);
  for (const node of childNodes) {
    if (isElement(node)) {
      if (shouldUnwrap(node)) {
        unwrapElement(node);
      } else {
        unwrapElements(node, shouldUnwrap);
      }
    }
  }
  element.normalize();
}
