export const derivative2d = {
  scene: "derivative_2d",
  title: "Derivative & Tangent Line",
  params: {
    xRange: [-8, 8],
    a: 1,
    b: 0,
    c: 0,
    x0: 1,
  },
  controls: [
    { type: "slider", name: "a", min: -2, max: 2, step: 0.1, default: 1 },
    { type: "slider", name: "b", min: -5, max: 5, step: 0.1, default: 0 },
    { type: "slider", name: "c", min: -5, max: 5, step: 0.1, default: 0 },
    { type: "slider", name: "x0", min: -5, max: 5, step: 0.1, default: 1 },
  ],
  explain:
    "المشتقة عند x₀ هي ميل خط المماس للدالة. حرّك x₀ ولاحظ كيف يتغير الميل والخط.",
};
