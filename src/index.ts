export type KerningOptions = {
  factor: number;
  exclude: (string | [number, number])[];
};

class Analyzer {
  dispose() {}
}

function removeKerning(element: Element) {}

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
