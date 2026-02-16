function toComplex(point) {
  return { x: Number(point?.x || 0), y: Number(point?.y || 0) };
}

export function computeDFT(signal) {
  const values = Array.isArray(signal) ? signal : [];
  const N = values.length;
  if (!N) return [];

  const result = [];
  for (let k = 0; k < N; k += 1) {
    let re = 0;
    let im = 0;

    for (let n = 0; n < N; n += 1) {
      const angle = (2 * Math.PI * k * n) / N;
      re += values[n] * Math.cos(angle);
      im -= values[n] * Math.sin(angle);
    }

    re /= N;
    im /= N;

    result.push({
      freq: k,
      amplitude: Math.hypot(re, im),
      phase: Math.atan2(im, re),
      re,
      im
    });
  }

  return result.sort((a, b) => b.amplitude - a.amplitude);
}

export function computeComplexDFT(points) {
  const path = (Array.isArray(points) ? points : []).map(toComplex);
  const N = path.length;
  if (!N) return [];

  const result = [];
  for (let k = 0; k < N; k += 1) {
    let re = 0;
    let im = 0;

    for (let n = 0; n < N; n += 1) {
      const angle = (2 * Math.PI * k * n) / N;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = path[n].x;
      const y = path[n].y;
      re += x * cos + y * sin;
      im += y * cos - x * sin;
    }

    re /= N;
    im /= N;
    const freq = k <= N / 2 ? k : k - N;
    result.push({
      freq,
      amplitude: Math.hypot(re, im),
      phase: Math.atan2(im, re),
      re,
      im
    });
  }

  return result.sort((a, b) => b.amplitude - a.amplitude);
}

export function reconstructPoint(coeffs, time01, numFreqs = 32) {
  const list = Array.isArray(coeffs) ? coeffs : [];
  if (!list.length) return { x: 0, y: 0 };

  const used = list.slice(0, Math.max(1, Math.min(numFreqs, list.length)));
  let x = 0;
  let y = 0;
  for (const term of used) {
    const angle = 2 * Math.PI * term.freq * time01 + term.phase;
    x += term.amplitude * Math.cos(angle);
    y += term.amplitude * Math.sin(angle);
  }
  return { x, y };
}

export function resamplePoints(points, targetCount = 256) {
  const input = (Array.isArray(points) ? points : []).map(toComplex);
  if (input.length < 2) return input;

  const count = Math.max(8, targetCount | 0);
  const segmentLengths = [];
  let totalLength = 0;

  for (let i = 1; i < input.length; i += 1) {
    const dx = input[i].x - input[i - 1].x;
    const dy = input[i].y - input[i - 1].y;
    const seg = Math.hypot(dx, dy);
    segmentLengths.push(seg);
    totalLength += seg;
  }

  if (totalLength <= 1e-6) {
    return new Array(count).fill(0).map(() => ({ ...input[0] }));
  }

  const step = totalLength / (count - 1);
  const output = [input[0]];
  let segIndex = 0;
  let segProgress = 0;
  let traveled = 0;

  while (output.length < count - 1 && segIndex < segmentLengths.length) {
    const desired = output.length * step;
    while (traveled + segmentLengths[segIndex] < desired && segIndex < segmentLengths.length - 1) {
      traveled += segmentLengths[segIndex];
      segIndex += 1;
      segProgress = 0;
    }

    const segLen = segmentLengths[segIndex] || 1;
    const localDist = desired - traveled;
    segProgress = Math.max(0, Math.min(1, localDist / segLen));

    const p0 = input[segIndex];
    const p1 = input[segIndex + 1];
    output.push({
      x: p0.x + (p1.x - p0.x) * segProgress,
      y: p0.y + (p1.y - p0.y) * segProgress
    });
  }

  output.push(input[input.length - 1]);
  return output.slice(0, count);
}
