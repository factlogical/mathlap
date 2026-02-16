function safeRange(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1];
  if (Math.abs(max - min) < 1e-8) return [min - 0.5, max + 0.5];
  return [min, max];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function neighborhoodAverage(grid, row, col, radius = 1) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  let sum = 0;
  let count = 0;

  for (let y = row - radius; y <= row + radius; y += 1) {
    if (y < 0 || y >= rows) continue;
    for (let x = col - radius; x <= col + radius; x += 1) {
      if (x < 0 || x >= cols || (x === col && y === row)) continue;
      const value = grid[y][x];
      if (Number.isFinite(value)) {
        sum += value;
        count += 1; 
      }
    }
  }

  return count > 0 ? sum / count : null;
}

function fillNullCells(grid) {
  if (!Array.isArray(grid) || grid.length === 0) return grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const output = grid.map((row) => [...row]);

  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (Number.isFinite(output[y][x])) continue;
        let filled = null;
        for (let radius = 1; radius <= 4; radius += 1) {
          filled = neighborhoodAverage(output, y, x, radius);
          if (Number.isFinite(filled)) break;
        }
        if (Number.isFinite(filled)) {
          output[y][x] = filled;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  let sum = 0;
  let count = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const value = output[y][x];
      if (Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    }
  }
  const fallback = count > 0 ? sum / count : 0;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!Number.isFinite(output[y][x])) {
        output[y][x] = fallback;
      }
    }
  }

  return output;
}

/**
 * Map every pair of curve points into topology space:
 * (midpointX, midpointY, pairDistance).
 */
export function transformToTopologySpace(curvePoints) {
  if (!Array.isArray(curvePoints) || curvePoints.length < 2) return [];

  const surfacePoints = [];
  const n = curvePoints.length;

  for (let i = 0; i < n; i += 1) {
    const p1 = curvePoints[i];
    if (!p1 || !Number.isFinite(p1.x) || !Number.isFinite(p1.y)) continue;

    for (let j = i + 1; j < n; j += 1) {
      const p2 = curvePoints[j];
      if (!p2 || !Number.isFinite(p2.x) || !Number.isFinite(p2.y)) continue;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      surfacePoints.push({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: Math.sqrt(dx * dx + dy * dy),
        originalPair: { i, j, p1, p2 }
      });
    }
  }

  return surfacePoints;
}

export function buildTopologySurface(curvePoints, resolution = 48) {
  const rawPoints = transformToTopologySpace(curvePoints);
  if (rawPoints.length === 0) {
    return {
      grid: [],
      xAxis: [],
      yAxis: [],
      xRange: [-1, 1],
      yRange: [-1, 1],
      maxDistance: 0,
      rawPoints: []
    };
  }

  const safeResolution = Math.max(12, Math.min(120, Math.floor(Number(resolution) || 48)));
  const rows = safeResolution + 1;
  const cols = safeResolution + 1;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxDistance = 0;

  for (const p of rawPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxDistance) maxDistance = p.z;
  }

  const [xMin, xMax] = safeRange(minX, maxX);
  const [yMin, yMax] = safeRange(minY, maxY);
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;

  const sums = Array.from({ length: rows }, () => Array(cols).fill(0));
  const counts = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (const p of rawPoints) {
    const xRatio = (p.x - xMin) / xSpan;
    const yRatio = (p.y - yMin) / ySpan;
    const col = clamp(Math.round(xRatio * safeResolution), 0, safeResolution);
    const row = clamp(Math.round(yRatio * safeResolution), 0, safeResolution);
    sums[row][col] += p.z;
    counts[row][col] += 1;
  }

  const grid = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) =>
      counts[row][col] > 0 ? sums[row][col] / counts[row][col] : null
    )
  );

  const denseGrid = fillNullCells(grid);
  const xAxis = Array.from({ length: cols }, (_, i) => xMin + (xSpan * i) / safeResolution);
  const yAxis = Array.from({ length: rows }, (_, i) => yMin + (ySpan * i) / safeResolution);

  return {
    grid: denseGrid,
    xAxis,
    yAxis,
    xRange: [xMin, xMax],
    yRange: [yMin, yMax],
    maxDistance,
    rawPoints
  };
}

