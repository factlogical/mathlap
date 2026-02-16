
export const function2d = {
  scene: "function_2d",
  title: "2D Function Plot (Quadratic)",
  params: {
    xRange: [-10, 10],
    // معاملات الدالة: y = a x^2 + b x + c
    a: 1,
    b: 0,
    c: 0,
  },
  controls: [
    { type: "slider", name: "a", label: "a", min: -3, max: 3, step: 0.1, default: 1 },
    { type: "slider", name: "b", label: "b", min: -10, max: 10, step: 0.1, default: 0 },
    { type: "slider", name: "c", label: "c", min: -10, max: 10, step: 0.1, default: 0 },
  ],
  explain:
    "نرسم الدالة y = a x^2 + b x + c. غيّر a,b,c لتبني حدسك: a يتحكم بالتحدّب/الانفتاح، b يحرك الميل، و c يرفع/يخفض المنحنى.",
};
