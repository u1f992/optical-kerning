import { getConvexHull, interpolateIntegerY } from "./pixel-geometry.js";

import assert from "node:assert";
import test from "node:test";

function setPixel(
  { width, data }: { width: number; data: Uint8ClampedArray },
  [x, y]: [number, number],
  [r, g, b, a]: [number, number, number, number],
) {
  const index = (y * width + x) * 4;
  data[index + 0] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = a;
}
function arraysEqualUnordered(a: [number, number][], b: [number, number][]) {
  const normalize = (arr: [number, number][]) =>
    arr.map((p) => `${p[0]},${p[1]}`).sort();
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

test("getConvexHull", () => {
  const imageData = {
    width: 3,
    height: 3,
    data: new Uint8ClampedArray(3 * 3 * 4),
  };

  /*
   * 　■
   * ■　■
   * 　■
   */
  setPixel(imageData, [1, 0], [0, 0, 0, 255]);
  setPixel(imageData, [2, 1], [0, 0, 0, 255]);
  setPixel(imageData, [1, 2], [0, 0, 0, 255]);
  setPixel(imageData, [0, 1], [0, 0, 0, 255]);

  assert.ok(
    arraysEqualUnordered(
      // @ts-ignore
      getConvexHull(imageData),
      [
        [1, 0],
        [2, 1],
        [1, 2],
        [0, 1],
      ],
    ),
  );
});

test("interpolateIntegerY", () => {
  assert.deepStrictEqual(
    interpolateIntegerY(
      /*
       * ♢
       */
      [
        [1, 0],
        [2, 2],
        [1, 4],
        [0, 2],
      ],
    ),
    [
      [1, 0],
      [1.5, 1],
      [2, 2],
      [1.5, 3],
      [1, 4],
      [0.5, 3],
      [0, 2],
      [0.5, 1],
    ],
  );
});
