function sortPointsClockwise(points) {
  if (!Array.isArray(points) || points.length !== 4) return points || [];
  const cx = points.reduce((sum, p) => sum + p.x, 0) / 4;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / 4;
  return [...points].sort(
    (a, b) =>
      Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );
}

function squaredDistance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

function hasFourDistinctIndices(pairA, pairB) {
  const set = new Set([pairA.i, pairA.j, pairB.i, pairB.j]);
  return set.size === 4;
}

function canonicalRectangleKey(indices) {
  return [...indices].sort((a, b) => a - b).join("|");
}

function quantize(value, tolerance) {
  return Math.round(value / tolerance);
}

function binKey(ix, iy, iz) {
  return `${ix}:${iy}:${iz}`;
}

function getNeighborKeys(ix, iy, iz) {
  const keys = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        keys.push(binKey(ix + dx, iy + dy, iz + dz));
      }
    }
  }
  return keys;
}

/**
 * Validate that 4 points form a rectangle (within tolerance).
 */
export function validateRectangle(points, tolerance = 0.04) {
  if (!Array.isArray(points) || points.length !== 4) return false;

  const ordered = sortPointsClockwise(points);

  for (let i = 0; i < 4; i += 1) {
    const prev = ordered[(i + 3) % 4];
    const cur = ordered[i];
    const next = ordered[(i + 1) % 4];

    const v1x = prev.x - cur.x;
    const v1y = prev.y - cur.y;
    const v2x = next.x - cur.x;
    const v2y = next.y - cur.y;
    const n1 = Math.hypot(v1x, v1y);
    const n2 = Math.hypot(v2x, v2y);
    if (n1 < 1e-8 || n2 < 1e-8) return false;

    const dotRatio = Math.abs((v1x * v2x + v1y * v2y) / (n1 * n2));
    if (dotRatio > 0.16 + tolerance * 0.8) return false;
  }

  const dsq = [];
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      dsq.push(squaredDistance(ordered[i], ordered[j]));
    }
  }
  dsq.sort((a, b) => a - b);

  if (dsq[0] < 1e-8) return false;
  const scale = Math.max(dsq[5], 1);
  const eps = (0.18 + tolerance * 1.5) * scale;

  const fourSidesGrouped = Math.abs((dsq[0] + dsq[1]) - (dsq[2] + dsq[3])) < eps;
  const diagonalsEqual = Math.abs(dsq[4] - dsq[5]) < eps;
  const pythagorean = Math.abs(dsq[0] + dsq[2] - dsq[5]) < eps * 1.2;

  return fourSidesGrouped && diagonalsEqual && pythagorean;
}

/**
 * Detect collisions in topology space:
 * two different pairs with same midpoint and same distance.
 */
export function detectRectangles(surfacePoints, tolerance = 0.04, maxRectangles = 180) {
  if (!Array.isArray(surfacePoints) || surfacePoints.length < 2) return [];

  const safeTol = Math.max(0.001, Number(tolerance) || 0.04);
  const buckets = new Map();
  const seen = new Set();
  const rectangles = [];

  for (const point of surfacePoints) {
    const pair = point?.originalPair;
    if (!pair) continue;

    const ix = quantize(point.x, safeTol);
    const iy = quantize(point.y, safeTol);
    const iz = quantize(point.z, safeTol);
    const neighbors = getNeighborKeys(ix, iy, iz);

    for (const key of neighbors) {
      const candidateBucket = buckets.get(key);
      if (!candidateBucket) continue;

      for (const candidate of candidateBucket) {
        const candidatePair = candidate.originalPair;
        if (!candidatePair) continue;
        if (!hasFourDistinctIndices(pair, candidatePair)) continue;

        const midpointMatch =
          Math.abs(point.x - candidate.x) <= safeTol &&
          Math.abs(point.y - candidate.y) <= safeTol;
        const distanceMatch = Math.abs(point.z - candidate.z) <= safeTol;
        if (!midpointMatch || !distanceMatch) continue;

        const indices = [pair.i, pair.j, candidatePair.i, candidatePair.j];
        const uniqueKey = canonicalRectangleKey(indices);
        if (seen.has(uniqueKey)) continue;

        const rawPoints = [pair.p1, pair.p2, candidatePair.p1, candidatePair.p2];
        const ordered = sortPointsClockwise(rawPoints);
        if (!validateRectangle(ordered, safeTol)) continue;

        rectangles.push({
          points: ordered,
          midpoint: { x: (point.x + candidate.x) / 2, y: (point.y + candidate.y) / 2 },
          distance: (point.z + candidate.z) / 2,
          collisionPoint: {
            x: (point.x + candidate.x) / 2,
            y: (point.y + candidate.y) / 2,
            z: (point.z + candidate.z) / 2
          },
          pairIndices: indices
        });
        seen.add(uniqueKey);

        if (rectangles.length >= maxRectangles) {
          return rectangles;
        }
      }
    }

    const ownKey = binKey(ix, iy, iz);
    const list = buckets.get(ownKey);
    if (list) list.push(point);
    else buckets.set(ownKey, [point]);
  }

  return rectangles;
}

