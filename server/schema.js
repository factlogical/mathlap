import { z } from 'zod';

/**
 * AI Response Schema
 * Defines the strict contract between the LLM and the Frontend.
 */
export const SceneSchema = z.object({
    // The unique ID of the scene/renderer to load (e.g. "linear_transform", "generic_plot")
    scene: z.string().default("generic_plot"),

    // The specific mode for the renderer (e.g. "3d", "composition", "heatmap")
    mode: z.string().optional().default("default"),

    // The data/math specification strictly for the renderer
    // We use .passthrough() or .record() because specs vary wildly by scene
    spec: z.record(z.any()).optional().default({}),

    // UI helpers
    title: z.string().optional(),
    explanation: z.string().optional(),

    // Error handling
    error: z.string().optional(),
}).passthrough();

/**
 * Validates and sanitizes the raw JSON from the LLM.
 * Returns a safe object that matches the Frontend's expectation.
 */
export function validateScenePayload(rawJson) {
    try {
        const result = SceneSchema.safeParse(rawJson);

        if (result.success) {
            return result.data;
        } else {
            console.error("Schema Validation Failed:", result.error);
            // Return a safe fallback with the error detail
            return {
                scene: "generic_plot",
                mode: "error",
                spec: {},
                error: `Invalid AI Response: ${result.error.issues.map(i => i.path + ': ' + i.message).join(', ')}`,
                title: "Generation Error"
            };
        }
    } catch (err) {
        return {
            scene: "generic_plot",
            mode: "error",
            spec: {},
            error: "Critical Validation Crash",
            title: "System Error"
        };
    }
}
