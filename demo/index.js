// @ts-check

import { applyOpticalKerning, createSpacingCache } from "./dist/index.js";

const cache = createSpacingCache();

// demo1

document.querySelectorAll("#demo1 .sample").forEach((sample) => {
  const sample1 = document.createElement("div");
  sample1.className = "sample1";
  sample1.textContent = "ダイニング";

  const sample2 = document.createElement("div");
  sample2.className = "sample2";
  sample2.textContent =
    "タイポグラフィの手法の一つとして、文字の間隔を調整して、文字の形状から生じる間隔の不揃いを無くす、「カーニング」(Kerning)があります。";

  sample.appendChild(sample1);
  sample.appendChild(sample2);
});
document.querySelectorAll("#demo1 .kerned").forEach((elem) => {
  applyOpticalKerning(elem, {
    factor: 0.5,
    exclude: [[0x00, 0xff]],
    cache,
  });
});
document.querySelectorAll("#demo1 .strong-kerned").forEach((elem) => {
  applyOpticalKerning(elem, {
    factor: 1.0,
    exclude: [[0x00, 0xff]],
    cache,
  });
});

// demo2

function demo2Update() {
  document.querySelectorAll("#demo2 div").forEach((div) => {
    div.textContent = /** @type {HTMLTextAreaElement} */ (
      document.querySelector("textarea[name=sample]")
    ).value;
  });
  const factorValue = /** @type {HTMLInputElement} */ (
    document.querySelector("#demo2 input[name=factor]")
  ).value;
  /** @type {HTMLTextAreaElement} */ (
    document.getElementById("factor-value")
  ).textContent = factorValue;
  document.querySelectorAll("#demo2 .kerned").forEach((elem) => {
    applyOpticalKerning(elem, {
      factor: parseFloat(factorValue),
      exclude: ["palt"],
      cache,
    });
  });
}
document.querySelectorAll("#demo2 input, #demo2 textarea").forEach((elem) => {
  elem.addEventListener("input", demo2Update);
});
demo2Update();

// demo3

function demo3Update() {
  const performanceElem = document.querySelector("#demo3 .performance");
  if (performanceElem) {
    performanceElem.textContent = "applying kerning...";
  }

  setTimeout(() => {
    const start = Date.now();
    document.querySelectorAll("#demo3 main").forEach((elem) => {
      applyOpticalKerning(elem, { exclude: [[0x00, 0xff]], cache });
    });
    const end = Date.now();
    if (performanceElem) {
      performanceElem.textContent = `kerning applied in ${end - start}ms`;
    }
  }, 10);
}
document.querySelectorAll("#demo3 input").forEach((input) => {
  input.addEventListener("click", () => {
    const selectedFont =
      /** @type {HTMLInputElement} */ (
        document.querySelector("input[name=font]:checked")
      ).value || "sans-serif";
    const selectedStyle =
      /** @type {HTMLInputElement} */ (
        document.querySelector("input[name=style]:checked")
      ).value || "normal";
    const selectedWeight =
      /** @type {HTMLInputElement} */ (
        document.querySelector("input[name=weight]:checked")
      ).value || "normal";

    const mainElems = document.querySelectorAll("#demo3 main");
    mainElems.forEach((main) => {
      /** @type {HTMLElement} */ (main).style.fontFamily =
        `"${selectedFont}", sans-serif`;
      /** @type {HTMLElement} */ (main).style.fontStyle = selectedStyle;
      /** @type {HTMLElement} */ (main).style.fontWeight = selectedWeight;
    });

    demo3Update();
  });
});
demo3Update();
