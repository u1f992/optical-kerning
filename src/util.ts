export function* pairwise<T>(iterable: Iterable<T>): Generator<[T, T]> {
  const iterator = iterable[Symbol.iterator]();
  let result = iterator.next();
  if (result.done) return;

  let prev = result.value;
  result = iterator.next();

  while (!result.done) {
    yield [prev, result.value];
    prev = result.value;
    result = iterator.next();
  }
}
