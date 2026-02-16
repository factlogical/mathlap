export const regression3d = {
  scene: "regression_3d_plane",
  title: "3D Linear Regression Plane",
  params: {
    points: [
      [0, 0, 0.2],
      [1, 0, 1.2],
      [0, 1, 0.9],
      [1, 1, 2.1],
    ],
    xRange: [-2, 2],
    yRange: [-2, 2],
  },
  controls: [
    { type: "slider", name: "lambda", label: "λ (shrink)", min: 0, max: 5, step: 0.1, default: 0 },
    { type: "button", name: "addRandomPoint", label: "Add random point" },
    { type: "button", name: "reset", label: "Reset" },
  ],
  explain:
    "هذا المشهد يقدّر مستوى z=ax+by+c يقرّب النقاط. زيادة λ تقلل الميل (a,b) لإظهار فكرة التنظيم بصريًا.",
};
