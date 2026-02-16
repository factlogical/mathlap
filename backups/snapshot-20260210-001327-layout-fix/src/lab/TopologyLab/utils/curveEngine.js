function isFinitePoint(point) {
  return (
    point &&
    Number.isFinite(Number(point.x)) &&
    Number.isFinite(Number(point.y))
  );
}

function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function curveBounds(points, pad = 0.6) {
  const valid = Array.isArray(points) ? points.filter(isFinitePoint) : [];
  if (valid.length === 0) {
    return {
      xMin: -3,
      xMax: 3,
      yMin: -3,
      yMax: 3,
      span: 6
    };
  }

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const p of valid) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }

  if (xMax - xMin < 1e-6) {
    xMin -= 1;
    xMax += 1;
  }
  if (yMax - yMin < 1e-6) {
    yMin -= 1;
    yMax += 1;
  }

  const width = xMax - xMin;
  const height = yMax - yMin;
  const span = Math.max(width, height);
  const half = span / 2 + pad;
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;

  return {
    xMin: cx - half,
    xMax: cx + half,
    yMin: cy - half,
    yMax: cy + half,
    span: half * 2
  };
}

export function normalizeCurveScale(points, targetRadius = 2.3) {
  const valid = Array.isArray(points)
    ? points.filter(isFinitePoint).map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    : [];
  if (valid.length === 0) return [];

  const bounds = curveBounds(valid, 0);
  const cx = (bounds.xMin + bounds.xMax) / 2;
  const cy = (bounds.yMin + bounds.yMax) / 2;
  const currentSpan = Math.max(bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin);
  const targetSpan = targetRadius * 2;
  const scale = currentSpan > 1e-9 ? targetSpan / currentSpan : 1;

  return valid.map((p) => ({
    x: (p.x - cx) * scale,
    y: (p.y - cy) * scale
  }));
}

export function resampleClosedCurve(points, targetCount = 140) {
  const valid = Array.isArray(points)
    ? points.filter(isFinitePoint).map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    : [];

  if (valid.length < 3) return valid;

  const closed = [...valid];
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (distance(first, last) > 1e-6) {
    closed.push({ ...first });
  }

  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < closed.length - 1; i += 1) {
    const from = closed[i];
    const to = closed[i + 1];
    const len = distance(from, to);
    if (len < 1e-9) continue;
    segments.push({ from, to, start: totalLength, len });
    totalLength += len;
  }

  if (segments.length === 0 || totalLength < 1e-9) return valid;

  const count = Math.max(24, Math.floor(targetCount));
  const sampled = [];
  let segIndex = 0;

  for (let i = 0; i < count; i += 1) {
    const target = (i / count) * totalLength;
    while (
      segIndex < segments.length - 1 &&
      target > segments[segIndex].start + segments[segIndex].len
    ) {
      segIndex += 1;
    }
    const seg = segments[segIndex];
    const t = (target - seg.start) / seg.len;
    sampled.push({
      x: seg.from.x + (seg.to.x - seg.from.x) * t,
      y: seg.from.y + (seg.to.y - seg.from.y) * t
    });
  }

  return sampled;
}

export function smoothClosedCurve(points, passes = 1, alpha = 0.22) {
  const valid = Array.isArray(points)
    ? points.filter(isFinitePoint).map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    : [];
  if (valid.length < 4 || passes <= 0) return valid;

  let output = [...valid];
  const loops = Math.max(1, Math.floor(passes));
  const w = Math.max(0, Math.min(0.48, Number(alpha)));

  for (let pass = 0; pass < loops; pass += 1) {
    output = output.map((point, i) => {
      const prev = output[(i - 1 + output.length) % output.length];
      const next = output[(i + 1) % output.length];
      return {
        x: point.x * (1 - 2 * w) + (prev.x + next.x) * w,
        y: point.y * (1 - 2 * w) + (prev.y + next.y) * w
      };
    });
  }

  return output;
}

export function prepareCurvePoints(points, targetCount = 140) {
  const sampled = resampleClosedCurve(points, targetCount);
  const smoothed = smoothClosedCurve(sampled, 1, 0.18);
  return normalizeCurveScale(smoothed, 2.3);
}

