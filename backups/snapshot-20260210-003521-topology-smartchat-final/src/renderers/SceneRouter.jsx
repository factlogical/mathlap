import RenderDispatcher from "./RenderDispatcher.jsx";
import Regression3DRenderer from "./Regression3DRenderer.jsx";
import Function2DRenderer from "./Function2DRenderer.jsx";
import Derivative2DRenderer from "./Derivative2DRenderer.jsx";
import Geometry3DRenderer from "./Geometry3DRenderer.jsx";
import EpsilonDeltaRenderer from "./lab/EpsilonDeltaRenderer.jsx";
import ErrorRenderer from "./ErrorRenderer.jsx";

function normalizeSceneSpec(spec) {
  if (!spec || typeof spec !== "object") {
    return {
      scene: {
        type: "error",
        fallback: {
          message: "No spec provided.",
          suggestions: ["Plot sin(x)", "Visualize vectors v=(1,2)", "Show epsilon-delta definition"]
        }
      }
    };
  }

  let scene = spec.scene;
  if (typeof scene === "string") scene = { type: scene };
  if (!scene || typeof scene !== "object") scene = {};
  if (!scene.type && typeof spec.type === "string") {
    scene.type = spec.type;
  }
  if (!scene.type) scene.type = "generic_plot";

  return { ...spec, scene };
}

export default function SceneRouter({ spec, onSuggestion, action, onAnalysis }) {
  const normalized = normalizeSceneSpec(spec);
  const sceneType = normalized.scene?.type;

  switch (sceneType) {
    case "generic_plot":
      return <RenderDispatcher spec={normalized} action={action} onAnalysis={onAnalysis} />;
    case "scalar_field":
      return <RenderDispatcher spec={normalized} action={action} onAnalysis={onAnalysis} />;
    case "vectors":
    case "vector_field":
    case "vector_operation":
      return <RenderDispatcher spec={normalized} action={action} onAnalysis={onAnalysis} />;
    case "regression_3d_plane":
      return <Regression3DRenderer spec={normalized} />;
    case "function_2d":
      return <Function2DRenderer spec={normalized} />;
    case "derivative_2d":
      return <Derivative2DRenderer spec={normalized} />;
    case "geometry_3d":
      return <Geometry3DRenderer spec={normalized} />;
    case "epsilon_delta_limit":
      return <EpsilonDeltaRenderer spec={normalized} />;
    case "error":
      return <ErrorRenderer spec={normalized} onSuggestion={onSuggestion} />;
    default:
      console.warn("SceneRouter: Unknown scene", sceneType);
      return (
        <ErrorRenderer
          spec={{
            ...normalized,
            scene: {
              type: "error",
              fallback: {
                message: `Unknown scene: ${sceneType}.`,
                suggestions: ["Plot sin(x)", "Visualize vectors v=(1,2)", "Show epsilon-delta definition"]
              }
            }
          }}
          onSuggestion={onSuggestion}
        />
      );
  }
}
