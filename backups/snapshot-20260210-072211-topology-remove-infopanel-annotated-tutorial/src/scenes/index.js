import { regression3d } from "./regression3d.js";
import { function2d } from "./function2d.js";
import { derivative2d } from "./derivative2d.js";
import { geometry3d } from "./geometry3d.js";

export const sceneLibrary = {
  regression_3d_plane: regression3d,
  function_2d: function2d,
  derivative_2d: derivative2d,
  geometry_3d: geometry3d,
  generic_plot: {
    scene: "generic_plot",
    title: "AI Analysis",
    params: {
      mode: "equation",
      expression: "x"
    }
  }
};
