import React from "react";
import ScalarPlotRenderer from "./ScalarPlotRenderer";
import VectorPlotRenderer from "./VectorPlotRenderer";

/**
 * Rentral Render Dispatcher
 * Inspects spec.math.kind to choose the specialized renderer.
 */
const RenderDispatcher = ({ spec }) => {
    // Robust payload extraction (same strategy)
    const data = spec?.payload || spec?.params || spec || {};

    console.log("[dispatch]", data.math?.kind, data.view?.type);

    // Safety check for math object
    if (!data.math) {
        // Legacy fallback logic
        if (data.mode === 'equation' || data.mode === 'recurrence' || data.mode === 'data') {
            return <ScalarPlotRenderer spec={spec} />;
        }
        return <div className="text-red-400 p-4">Invalid Spec: Missing 'math' object.</div>;
    }

    const kind = data.math.kind;

    switch (kind) {
        case "scalar_field":
        case "sequence":
        case "function_1d":
            return <ScalarPlotRenderer spec={spec} />;

        case "data_set":
            // Smart routing: Check if data_set actually contains vectors
            if (data.math.data?.vectors) {
                return <VectorPlotRenderer spec={spec} />;
            }
            return <ScalarPlotRenderer spec={spec} />;

        case "vectors":
        case "vector_field":
        case "vector_operation":
            return <VectorPlotRenderer spec={spec} />;

        default:
            return <div className="text-red-400 p-4">Unsupported Math Kind: {kind}</div>;
    }
};

export default RenderDispatcher;
