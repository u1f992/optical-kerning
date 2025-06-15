export function getPixel(
  { width, data }: ImageData,
  x: number,
  y: number,
): [number, number, number, number] {
  const index = (y * width + x) * 4;
  return [data[index]!, data[index + 1]!, data[index + 2]!, data[index + 3]!];
}

export function getConvexHull(imageData: ImageData) {
  const { width, height } = imageData;
  const points = [];

  // Collect all pixels with alpha > 0 (opaque)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [, , , a] = getPixel(imageData, x, y);
      if (a > 0) {
        points.push([x, y] as [number, number]);
      }
    }
  }

  // A convex hull is not defined for fewer than 3 points
  if (points.length < 3) return points;

  // Compute cross product to check counter-clockwise turn
  function cross(
    o: [number, number],
    a: [number, number],
    b: [number, number],
  ) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }

  // Sort points lexicographically (by x, then y)
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  // Build lower hull
  const lower = [];
  for (const p of points) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!;
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove duplicate start/end points and concatenate
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function interpolateIntegerY(points: [number, number][]) {
  const result = [];

  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % points.length]!; // Wrap around

    // Always add the start point
    result.push([x0, y0] as [number, number]);

    if (y0 === y1) continue; // Horizontal segment: no interpolation

    const dy = y1 - y0;
    const dx = x1 - x0;

    // Determine direction of y
    const yStart = Math.ceil(Math.min(y0, y1));
    const yEnd = Math.floor(Math.max(y0, y1));

    for (let y = yStart; y <= yEnd; y++) {
      if (y === y0 || y === y1) continue; // Skip endpoints (already included)

      const t = (y - y0) / dy;
      const x = x0 + dx * t;
      result.push([x, y] as [number, number]);
    }
  }

  return result;
}
