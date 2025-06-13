type JSONPrimitive = string | number | boolean | null;
export type JSONSerializable = JSONPrimitive | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONSerializable };
type JSONArray = Array<JSONSerializable>;

export function safeStringify(obj: JSONSerializable): string {
  return JSON.stringify(
    (function $(obj: JSONSerializable): JSONSerializable {
      return obj === null || typeof obj !== "object"
        ? obj
        : Array.isArray(obj)
          ? obj.map($)
          : Object.entries(obj)
              // NOTE: Sort keys by UTF-16 code units.
              // > If both values are strings, they are compared as strings,
              // > based on the values of the UTF-16 code units (not Unicode code points) they contain.
              // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Less_than
              // NOTE: Using .sort() instead of .toSorted() to avoid extra memory allocation
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .reduce((sortedObj, [key, value]) => {
                sortedObj[key] = $(value);
                return sortedObj;
              }, {} as JSONObject);
    })(obj),
  );
}
