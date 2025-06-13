import { safeStringify } from "./json.js";

import assert from "node:assert";
import test from "node:test";

test("safeStringify", () => {
  assert.deepStrictEqual(
    safeStringify([{ a: 0, b: { c: true, a: "", b: null } }]),
    safeStringify([{ b: { b: null, a: "", c: true }, a: 0 }]),
  );
});
