function ensureComplex(value) {
  if (typeof value === "number") return { re: value, im: 0 };
  return { re: Number(value?.re || 0), im: Number(value?.im || 0) };
}

export function prepareSignal(rawSignal) {
  const source = Array.isArray(rawSignal) ? rawSignal : [];
  let N = 1;
  while (N < source.length) N *= 2;
  const out = new Array(N).fill(0).map((_, i) => source[i] ?? 0);
  return out;
}

export function fft(signal) {
  const input = (Array.isArray(signal) ? signal : []).map(ensureComplex);
  const N = input.length;
  if (N <= 1) return input;
  if ((N & (N - 1)) !== 0) {
    throw new Error("FFT requires power-of-two length");
  }

  const even = fft(input.filter((_, i) => i % 2 === 0));
  const odd = fft(input.filter((_, i) => i % 2 === 1));
  const result = new Array(N);

  for (let k = 0; k < N / 2; k += 1) {
    const angle = (-2 * Math.PI * k) / N;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tRe = cos * odd[k].re - sin * odd[k].im;
    const tIm = sin * odd[k].re + cos * odd[k].im;

    result[k] = {
      re: even[k].re + tRe,
      im: even[k].im + tIm
    };
    result[k + N / 2] = {
      re: even[k].re - tRe,
      im: even[k].im - tIm
    };
  }

  return result;
}

export function fftFromRealSignal(signal) {
  const prepared = prepareSignal(signal).map((value) => ({ re: value, im: 0 }));
  const spectrum = fft(prepared);
  const N = spectrum.length || 1;

  return spectrum.map((c, k) => ({
    freq: k,
    re: c.re,
    im: c.im,
    amplitude: Math.hypot(c.re, c.im) / N,
    phase: Math.atan2(c.im, c.re)
  }));
}
