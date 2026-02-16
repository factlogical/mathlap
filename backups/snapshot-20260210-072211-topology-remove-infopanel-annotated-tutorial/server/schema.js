import { z } from 'zod';

export const SPEC_VERSION_DEFAULT = "1.0";

export const VALID_SCENE_TYPES = [
    "generic_plot",
    "scalar_field",
    "vector_field",
    "epsilon_delta_limit",
    "neural_network",
    "error",
    // Existing scene types in the app (keep for compatibility)
    "regression_3d_plane",
    "function_2d",
    "derivative_2d",
    "geometry_3d",
    "linear_transform",
    "animation_lab"
];

const FallbackSchema = z.object({
    message: z.string(),
    suggestions: z.array(z.string())
}).partial();

const SceneObjectSchema = z.object({
    type: z.string().default("generic_plot"),
    fallback: FallbackSchema.optional()
}).passthrough();

const SceneSchema = z.preprocess((val) => {
    if (typeof val === "string") return { type: val };
    if (val && typeof val === "object") return val;
    return { type: "generic_plot" };
}, SceneObjectSchema);

/**
 * AI Response Schema
 * Defines the strict contract between the LLM and the Frontend.
 */
export const SpecSchema = z.object({
    specVersion: z.string().default(SPEC_VERSION_DEFAULT),
    scene: SceneSchema.optional().default({ type: "generic_plot" }),

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

const DEFAULT_FALLBACK = {
    message: "I could not interpret that request.",
    suggestions: [
        "Plot sin(x)",
        "Visualize vectors v=(1,2) and w=(-1,3)",
        "Show epsilon-delta definition"
    ]
};

function normalizeFallback(fallback) {
    if (!fallback || typeof fallback !== "object") return undefined;
    const message = typeof fallback.message === "string" ? fallback.message : undefined;
    const suggestions = Array.isArray(fallback.suggestions)
        ? fallback.suggestions.filter((s) => typeof s === "string")
        : undefined;
    if (!message && !suggestions) return undefined;
    return {
        message: message ?? DEFAULT_FALLBACK.message,
        suggestions: suggestions ?? DEFAULT_FALLBACK.suggestions
    };
}

function normalizeSpecInternal(raw) {
    const issues = [];
    if (!raw || typeof raw !== "object") {
        return { spec: buildErrorSpec(), issues: ["Spec is not an object."] };
    }

    const spec = { ...raw };
    spec.specVersion = spec.specVersion || SPEC_VERSION_DEFAULT;

    let scene = spec.scene;
    if (typeof scene === "string") scene = { type: scene };
    if (!scene || typeof scene !== "object") scene = {};
    if (!scene.type && typeof spec.type === "string") {
        scene.type = spec.type;
    }
    if (!scene.type) scene.type = "generic_plot";
    scene.fallback = normalizeFallback(scene.fallback);
    spec.scene = scene;

    if (!VALID_SCENE_TYPES.includes(spec.scene.type)) {
        issues.push(`Unknown scene type: ${spec.scene.type}`);
        return { spec: buildErrorSpec({ message: issues[0] }), issues };
    }

    const mathLike = spec.math || spec.payload?.math || spec.params?.math;
    if (spec.scene.type === "generic_plot" && !mathLike) {
        issues.push("Missing math object in spec.");
        return { spec: buildErrorSpec({ message: issues[0] }), issues };
    }

    return { spec, issues };
}

export function normalizeSpec(raw) {
    return normalizeSpecInternal(raw).spec;
}

export function buildErrorSpec({ message, suggestions } = {}) {
    const fallback = normalizeFallback({
        message: message ?? DEFAULT_FALLBACK.message,
        suggestions: suggestions ?? DEFAULT_FALLBACK.suggestions
    });
    return {
        specVersion: SPEC_VERSION_DEFAULT,
        scene: { type: "error", fallback },
        error: message ?? DEFAULT_FALLBACK.message
    };
}

/**
 * Validates and sanitizes the raw JSON from the LLM.
 * Returns a safe object that matches the Frontend's expectation.
 */
export function validateScenePayload(rawJson) {
    try {
        const result = SpecSchema.safeParse(rawJson);
        if (result.success) {
            return normalizeSpec(result.data);
        }
        console.error("Schema Validation Failed:", result.error);
        return buildErrorSpec({
            message: `Invalid AI Response: ${result.error.issues.map(i => i.path + ': ' + i.message).join(', ')}`
        });
    } catch (err) {
        return buildErrorSpec({ message: "Critical Validation Crash" });
    }
}

export function validateScenePayloadDetailed(rawJson) {
    try {
        const result = SpecSchema.safeParse(rawJson);
        if (!result.success) {
            return {
                ok: false,
                error: `Invalid AI Response: ${result.error.issues.map(i => i.path + ': ' + i.message).join(', ')}`,
                data: buildErrorSpec({
                    message: `Invalid AI Response: ${result.error.issues.map(i => i.path + ': ' + i.message).join(', ')}`
                })
            };
        }

        const normalized = normalizeSpecInternal(result.data);
        if (normalized.issues.length > 0) {
            return {
                ok: false,
                error: normalized.issues[0],
                data: normalized.spec
            };
        }

        return { ok: true, data: normalized.spec };
    } catch (err) {
        return {
            ok: false,
            error: "Critical Validation Crash",
            data: buildErrorSpec({ message: "Critical Validation Crash" })
        };
    }
}
