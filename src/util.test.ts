import { pairwise } from "./util.js";

import assert from "node:assert";
import test from "node:test";

test("pairwise", () => {
  const iter = pairwise([0, 1, 2, 3]);
  assert.deepStrictEqual(iter.next().value, [0, 1]);
  assert.deepStrictEqual(iter.next().value, [1, 2]);
  assert.deepStrictEqual(iter.next().value, [2, 3]);
});
