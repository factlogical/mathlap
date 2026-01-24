import RenderDispatcher from "./RenderDispatcher.jsx";
import Regression3DRenderer from "./Regression3DRenderer.jsx";
import Function2DRenderer from "./Function2DRenderer.jsx";
import Derivative2DRenderer from "./Derivative2DRenderer.jsx";
import Geometry3DRenderer from "./Geometry3DRenderer.jsx";
import EpsilonDeltaRenderer from "./lab/EpsilonDeltaRenderer.jsx";

export default function SceneRouter({ spec }) {
  if (!spec) return <div>No spec</div>;

  // Check for epsilon_delta_limit type
  if (spec.type === "epsilon_delta_limit" || spec.scene === "epsilon_delta_limit") {
    return <EpsilonDeltaRenderer spec={spec} />;
  }

  switch (spec.scene) {
    case "generic_plot":
      return <RenderDispatcher spec={spec} />;
    case "regression_3d_plane":
      return <Regression3DRenderer spec={spec} />;
    case "function_2d":
      return <Function2DRenderer spec={spec} />;
    case "derivative_2d":
      return <Derivative2DRenderer spec={spec} />;
    case "geometry_3d":
      return <Geometry3DRenderer spec={spec} />;
    default:
      console.warn("SceneRouter: Unknown scene", spec.scene);
      return <RenderDispatcher spec={{
        ...spec,
        scene: 'generic_plot',
        error: `Unknown scene: ${spec.scene}. Falling back to Generic Plot.`
      }} />;
  }
}
