import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { validateScenePayload } from "./schema.js";

dotenv.config();

const app = express();

// Security and Data settings
app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

// Verify Environment Variables
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = "gpt-4o"; // Corrected to valid model
const PORT = Number(process.env.PORT || 3002); // Pivot to 3002 to avoid EADDRINUSE

if (!OPENAI_KEY) {
  console.error("❌ Critical Error: OPENAI_API_KEY not found in .env");
  process.exit(1);
}

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: OPENAI_KEY,
});

/**
 * System Prompt & Decision Logic
 */
const SYSTEM_PROMPT = `
You are a Math Visualization Agent. Your goal is to return a JSON object that best visualizes the user's math request, prioritizing SEMANTIC understanding over simple plotting.

### SEMANTIC SCHEMA
You must explicitly separate the *Mathematical Object* from the *Transformation* and the *Visualization View*.

**Structure:**
{
  "scene": "generic_plot",
  "math": {
    "kind": "scalar_field" | "sequence" | "data_set" | "vectors" | "vector_field" | "vector_operation",
    "expression": "string", // if applicable
    "variables": ["x", "y"], 
    "vectors": [{ "label": "v", "components": [x, y, z] }, ...], // If kind is vectors
    "data": { ... } // If kind is data_set
  },
  "transform": {
    "op": "none" | "partial_derivative" | "gradient",
    "variable": "x" | "y" | null,
    "order": 1
  },
  "view": {
    "type": "surface" | "heatmap" | "contour" | "line" | "line3d" | "scatter" | "bar",
    "dimension": "2D" | "3D",
    "options": { ... }
  },
  "domain": {
    "x": [min, max],
    "y": [min, max],
    "resolution": number
  }
}

### RULES
1. **Explicit Intent**: NEVER default to "surface" if the user asks for a heatmap, contour, or vector. Respect \`view.type\`.
2. **Vectors**: If the user asks to visualize vectors (single or plural), or vector addition, use \`math.kind: "vectors"\` (or "vector_operation"). DO NOT use "data_set".
   - Use dictionary or array format for \`math.vectors\`.
   - Example: \`v=(1,2)\` -> \`{ "v": [1,2] }\`
3. **3D Lines**: If the user asks for a 1D function (like sin(x)) in **3D**, use \`view.type: "line3d"\` and \`dimension: "3D"\`.
4. **Transformations**: If asking for derivative, use \`transform.op: "partial_derivative"\`.

### EXAMPLES

**User**: "Plot a heatmap of z = x^2 + y^2"
**Response**:
{
  "scene": "generic_plot",
  "math": { "kind": "scalar_field", "expression": "x^2 + y^2", "variables": ["x", "y"] },
  "transform": { "op": "none" },
  "view": { "type": "heatmap", "dimension": "2D" },
  "domain": { "x": [-5, 5], "y": [-5, 5], "resolution": 100 }
}

**User**: "Visualize vectors v=(2,1) and w=(-1,3)"
**Response**:
{
  "scene": "generic_plot",
  "math": { 
    "kind": "vectors", 
    "vectors": { "v": [2, 1], "w": [-1, 3] }
  },
  "transform": { "op": "none" },
  "view": { "type": "scatter", "dimension": "2D" },
  "domain": { "x": [-2, 4], "y": [-2, 4] }
}

**User**: "Show me the derivative of sin(x) as 3d"
**Response**:
{
  "scene": "generic_plot",
  "math": { "kind": "scalar_field", "expression": "sin(x)", "variables": ["x"] },
  "transform": { "op": "partial_derivative", "variable": "x" },
  "view": { "type": "line3d", "dimension": "3D" },
  "domain": { "x": [-10, 10], "resolution": 100 }
}

### RESPONSE FORMAT
Return ONLY valid JSON.
`;

const ANIMATION_LAB_PROMPT = `
You are the Animation Lab Engine. Convert the user's request into a strict JSON DSL for browser-based math animation.

### RULES
- **JSON Only**: Output ONLY valid JSON. No markdown, no "Here is your code".
- **Schema**:
{
  "scene": [
    { "id": "...", "cmd": "axes2d"|"plot2d", "x": [min, max], "y": [min, max], "expr": "mathjs string", "samples": num },
    { "cmd": "animate", "target": "id", "action": "draw"|"morph"| "fade", "duration": sec, "toExpr": "string" }
  ]
}
- **plot2d**: Requires 'expr' compatible with mathjs (e.g., "sin(x)", "x^2").
- **animate**: 'draw' reveals the object. 'morph' transforms 'expr' to 'toExpr'. 'duration' is in seconds.
- **Ambiguity**: If the user request is unclear, you CANNOT clarify. Just make a best guess (e.g., standard sine wave).

### EXAMPLES
User: "Graph x squared then turn it into x cubed"
Response:
{
  "scene": [
    { "id": "ax", "cmd": "axes2d", "x": [-5, 5], "y": [-5, 5] },
    { "id": "f", "cmd": "plot2d", "expr": "x^2", "x": [-5, 5] },
    { "cmd": "animate", "target": "f", "action": "draw", "duration": 1.0 },
    { "cmd": "animate", "target": "f", "action": "morph", "toExpr": "x^3", "duration": 2.0 }
  ]
}

### ARABIC SUPPORT
If user says "ارسم" (Draw/Plot) or "احسب" (Calculate), map it to "plot2d" or appropriate command.
Example: "ارسم cos x" -> { "cmd": "plot2d", "expr": "cos(x)" ... }
`;

const LAB_CHAT_PROMPT = `
You are a helpful math assistant for the Animation Lab.
Your goal is to reply to the users query and provide "annotations" if they ask about feature locations on the graph.
You MUST strictly follow the JSON schema provided in the User's message.
Do not output markdown code blocks. Output raw JSON only.
`;

const VALID_MODES = new Set(["chat", "lab_animation", "lab_chat", "derivative_chat", "topology_chat"]);
const VALID_HIGHLIGHTS = new Set(["secant", "tangent", "triangle", "plane", "normal", "surface"]);
const VALID_TOPOLOGY_ACTIONS = new Set([
  "change_curve",
  "set_resolution",
  "toggle_collisions",
  "toggle_intersections",
  "highlight_rectangle",
  "toggle_all_rectangles",
  "toggle_info_panel",
  "toggle_ai_cards",
  "toggle_drawing",
  "clear_curve",
  "scroll_to_bottom",
  "toggle_fullscreen"
]);
const VALID_TOPOLOGY_PRESETS = new Set([
  "circle",
  "figure8",
  "lemniscate",
  "trefoil",
  "spiral",
  "ellipse",
  "squircle",
  "custom"
]);

function normalizeArabicText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function cleanFunctionExpression(raw) {
  if (!raw) return null;
  let expr = String(raw).trim();
  expr = expr.replace(/^f\(x\)\s*=\s*/i, "");
  expr = expr.replace(/^y\s*=\s*/i, "");
  expr = expr.replace(/[“”"']/g, "").trim();
  if (!expr) return null;
  if (expr.length > 120) expr = expr.slice(0, 120).trim();
  return expr || null;
}

function inferDerivativeFunctionAtPoint(text) {
  const original = String(text || "").trim();
  if (!original) return null;

  const normalizedArabic = normalizeArabicText(original);
  const arabicMatch = normalizedArabic.match(/مشتق(?:ه)?\s+(.+?)\s+عند\s+(-?\d+(?:\.\d+)?)/i);
  if (arabicMatch) {
    const func = cleanFunctionExpression(arabicMatch[1]);
    const a = Number(arabicMatch[2]);
    if (func && Number.isFinite(a)) return { func, a };
  }

  const englishMatch = original.match(/derivative\s+of\s+(.+?)\s+at\s+(-?\d+(?:\.\d+)?)/i);
  if (englishMatch) {
    const func = cleanFunctionExpression(englishMatch[1]);
    const a = Number(englishMatch[2]);
    if (func && Number.isFinite(a)) return { func, a };
  }

  return null;
}
function infer3DFunction(text) {
  const original = String(text || "").trim();
  if (!original) return null;

  const matches = [
    original.match(/(?:z|f\(x,\s*y\))\s*=\s*(.+)$/i),
    original.match(/(?:surface|plot3d|3d)\s+(.+)$/i)
  ];

  for (const match of matches) {
    if (!match) continue;
    let func3D = String(match[1] || "").trim();
    func3D = func3D.replace(/[��"']/g, "").trim();
    if (!func3D) continue;
    if (func3D.length > 120) func3D = func3D.slice(0, 120).trim();
    if (/x/i.test(func3D) && /y/i.test(func3D)) return func3D;
  }
  return null;
}

function asksFor3DMode(text) {
  const original = String(text || "").toLowerCase();
  const normalizedArabic = normalizeArabicText(text);
  return (
    /\b3d\b|surface|tangent plane|normal vector|partial derivative/.test(original) ||
    /(ثلاثي|سطح|مستوى|عمودي|مشتقات جزئيه)/.test(normalizedArabic)
  );
}

function asksFor2DMode(text) {
  const original = String(text || "").toLowerCase();
  const normalizedArabic = normalizeArabicText(text);
  return (
    /\b2d\b|secant|tangent line/.test(original) ||
    /(ثنائي|القاطع|المماس)/.test(normalizedArabic)
  );
}

function asksSecantToTangent(text) {
  const original = String(text || "").toLowerCase();
  const normalizedArabic = normalizeArabicText(text);

  const arabicTransition =
    /القاطع/.test(normalizedArabic) &&
    /مماس|المماس/.test(normalizedArabic) &&
    /ورني|وريني|ارني|اريني|كيف|يصير|يتحول/.test(normalizedArabic);

  const englishTransition =
    /secant/.test(original) &&
    /tangent/.test(original) &&
    /(show|how|animate|turn|become)/.test(original);

  return arabicTransition || englishTransition;
}

function normalizeAction(action) {
  if (!action || typeof action !== "object") return null;
  const type = typeof action.type === "string" ? action.type.trim().toLowerCase() : "";
  if (!type) return null;
  const params = action.params && typeof action.params === "object" ? action.params : {};
  return { type, params };
}

function hasVisualIntent(text = "") {
  return /(ارسم|غيّر|غير|بدّل|بدل|جرّب|جرب|اعرض|خلّ|خل|ضع|حرك|حرّك|سوي|سوّي|plot|draw|show|set)/i.test(String(text));
}

function isJustAskingExample(text = "") {
  return /(اعطني مثال|مثال فقط|اشرح|وضح|فسر|ما معنى|ما هو)/i.test(String(text)) && !hasVisualIntent(text);
}

function buildAnimateAction(context = {}) {
  const h = Number(context?.h);
  const from = Number.isFinite(h) && Math.abs(h) >= 0.01 ? h : 1;
  const to = from < 0 ? -0.01 : 0.01;
  return {
    type: "animate",
    params: { from, to, duration: 2500 }
  };
}

function stripEmojis(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/gu, "")
    .trim();
}

function normalizeSuggestedActions(raw) {
  if (!Array.isArray(raw)) return [];
  const output = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const action = normalizeAction(entry.action);
    if (!action) continue;
    const label = typeof entry.label === "string" && entry.label.trim()
      ? stripEmojis(entry.label)
      : "طبّق على الرسم";
    output.push({ label, action });
    if (output.length >= 5) break;
  }
  return output;
}

function inferPointSuggestionsForFunc(funcText) {
  const func = String(funcText || "").toLowerCase();
  if (/sin|cos/.test(func)) return [0, 1.57];
  if (/tan/.test(func)) return [0, 0.79];
  return [-1, 1];
}

function formatSuggestionPoint(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(2);
}

function buildContextQuickActions(applyAction, context = {}) {
  if (!applyAction) return [];

  if (applyAction.type === "change_function_3d") {
    const b = Number(context?.b);
    const b0 = Number.isFinite(b) ? b : 0;
    const b1 = Number((b0 + 1).toFixed(2));
    const b2 = Number((b0 - 1).toFixed(2));
    return [
      {
        label: "Apply 3D surface",
        action: applyAction
      },
      {
        label: "Show tangent plane",
        action: {
          type: "multi_step",
          params: {
            steps: [
              { action: applyAction, delay: 0 },
              { action: { type: "toggle", params: { element: "plane", show: true } }, delay: 50 }
            ]
          }
        }
      },
      {
        label: "Show normal vector",
        action: {
          type: "multi_step",
          params: {
            steps: [
              { action: applyAction, delay: 0 },
              { action: { type: "toggle", params: { element: "normal", show: true } }, delay: 50 }
            ]
          }
        }
      },
      {
        label: `Try b=${formatSuggestionPoint(b1)}`,
        action: {
          type: "multi_step",
          params: {
            steps: [
              { action: applyAction, delay: 0 },
              { action: { type: "set_b", params: { b: b1 } }, delay: 50 }
            ]
          }
        }
      },
      {
        label: `Try b=${formatSuggestionPoint(b2)}`,
        action: {
          type: "multi_step",
          params: {
            steps: [
              { action: applyAction, delay: 0 },
              { action: { type: "set_b", params: { b: b2 } }, delay: 50 }
            ]
          }
        }
      }
    ];
  }

  if (applyAction.type !== "change_function") return [];

  const h = Number(context?.h);
  const from = Number.isFinite(h) && Math.abs(h) >= 0.01 ? h : 1;
  const to = from < 0 ? -0.01 : 0.01;
  const points = inferPointSuggestionsForFunc(applyAction?.params?.func);

  const applyStep = { action: applyAction, delay: 0 };

  return [
    {
      label: "طبّق الدالة على الرسم",
      action: applyAction
    },
    {
      label: "Show tangent (على الدالة)",
      action: {
        type: "multi_step",
        params: {
          steps: [
            applyStep,
            {
              action: { type: "toggle", params: { element: "tangent", show: true } },
              delay: 50
            }
          ]
        }
      }
    },
    {
      label: "Animate (على الدالة)",
      action: {
        type: "multi_step",
        params: {
          steps: [
            applyStep,
            {
              action: { type: "animate", params: { from, to, duration: 2500 } },
              delay: 50
            }
          ]
        }
      }
    },
    {
      label: `Try a=${formatSuggestionPoint(points[0])}`,
      action: {
        type: "multi_step",
        params: {
          steps: [
            applyStep,
            {
              action: { type: "move_point", params: { a: points[0] } },
              delay: 50
            }
          ]
        }
      }
    },
    {
      label: `Try a=${formatSuggestionPoint(points[1])}`,
      action: {
        type: "multi_step",
        params: {
          steps: [
            applyStep,
            {
              action: { type: "move_point", params: { a: points[1] } },
              delay: 50
            }
          ]
        }
      }
    }
  ];
}

function buildDerivativeChatPrompt(context = {}) {
  const safe = context && typeof context === "object" ? context : {};
  const currentMode = String(safe.mode || "2D").toUpperCase() === "3D" ? "3D" : "2D";

  const formatNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(4) : "not_computed";
  };

  return `
You are a derivative tutor for an interactive studio with two views:
- 2D mode: secant/tangent/triangle for f(x)
- 3D mode: surface z=f(x,y), tangent plane, normal vector at (a,b)

Current context:
- mode: ${currentMode}
- 2D: f(x)=${String(safe.func ?? "x^2")}, a=${formatNumber(safe.a)}, h=${formatNumber(safe.h)}, secant=${formatNumber(safe.slope_secant)}, tangent=${formatNumber(safe.slope_tangent)}
- 3D: f(x,y)=${String(safe.func3D ?? "x^2 + y^2")}, a=${formatNumber(safe.a)}, b=${formatNumber(safe.b)}, z0=${formatNumber(safe.z0)}, fx=${formatNumber(safe.fx)}, fy=${formatNumber(safe.fy)}

Output JSON only with this schema:
{
  "explanation": "string",
  "steps": "string (optional)",
  "hint": "string (optional)",
  "action": {
    "type": "set_mode|change_function|change_function_3d|set_h|move_point|set_b|animate|toggle|set_range",
    "params": {}
  } | null,
  "highlight": "secant|tangent|triangle|plane|normal|surface|null",
  "suggested_actions": [{ "label": "string", "action": { "type": "...", "params": {} } }] (optional),
  "quick_actions": [{ "label": "string", "action": { "type": "...", "params": {} } }] (optional)
}

Behavior rules:
- If user asks for 3D surface/partial derivatives/tangent plane, prefer action type "change_function_3d".
- If user asks to switch view explicitly, return action type "set_mode" with mode "2D" or "3D".
- For 3D point movement, use "move_point" for a and "set_b" for b.
- For 3D visibility controls, use toggle element: "surface", "plane", "normal".
- For 2D secant-to-tangent animation, use action type "animate".
- Never output markdown.
`;
}

function buildTopologyChatPrompt(context = {}) {
  const safe = context && typeof context === "object" ? context : {};
  const curveType = String(safe.curveType || "circle");
  const rectangles = Number.isFinite(Number(safe.rectangles)) ? Number(safe.rectangles) : 0;
  const collisions = Number.isFinite(Number(safe.collisions)) ? Number(safe.collisions) : 0;
  const resolution = Number.isFinite(Number(safe.resolution)) ? Number(safe.resolution) : 48;
  const isFullscreen = Boolean(safe.isFullscreen);

  return `
You are a topology assistant specialized in the inscribed rectangle transformation lab.

Context:
- current_curve: ${curveType}
- rectangles_found: ${rectangles}
- collisions_count: ${collisions}
- surface_resolution: ${resolution}
- fullscreen_mode: ${isFullscreen}

Mission:
1) Explain topology ideas in accurate Arabic, with English only for technical tokens when needed.
2) Suggest interesting curves to test.
3) Explain self-intersection meaning.
4) Return actionable controls for the UI.
5) Keep explanations tied to context values and mathematically precise.

Return JSON only with this schema:
{
  "explanation": "string",
  "visual_hint": "string (optional)",
  "mathConcept": "string (optional)",
  "action": {
    "type": "change_curve|set_resolution|toggle_collisions|highlight_rectangle|toggle_all_rectangles|toggle_info_panel|toggle_ai_cards|toggle_drawing|clear_curve|scroll_to_bottom|toggle_fullscreen",
    "params": {}
  } | null
}

Action rules:
- change_curve params: { "preset": "circle|figure8|lemniscate|trefoil|spiral|ellipse|squircle|custom" }
- set_resolution params: { "value": 20..100 }
- toggle_collisions params: { "show": true|false }
- highlight_rectangle params: { "index": integer >= 0 }
- toggle_all_rectangles params: { "show": true|false }
- toggle_info_panel params: { "show": true|false }
- toggle_ai_cards params: { "show": true|false }
- toggle_drawing params: { "show": true|false }
- clear_curve params: {}
- scroll_to_bottom params: {}
- toggle_fullscreen params: { "show": true|false }

Accuracy rules:
- Never invent numeric results; use context values directly.
- If user request implies a control change, prioritize returning action.
- For concept questions, explicitly mention:
  same midpoint + same segment length => inscribed rectangle.
- Avoid mixed-direction phrases that break Arabic layout.

Examples:
- User: "ارسم عقدة ثلاثية"
  action -> { "type": "change_curve", "params": { "preset": "trefoil" } }
- User: "زد الدقة إلى 80"
  action -> { "type": "set_resolution", "params": { "value": 80 } }
- User: "اخف نقاط التقاطع"
  action -> { "type": "toggle_collisions", "params": { "show": false } }
- User: "انزل الصفحة"
  action -> { "type": "scroll_to_bottom", "params": {} }
- User: "فعّل ملء الشاشة"
  action -> { "type": "toggle_fullscreen", "params": { "show": true } }
`;
}

function buildMessages(userText, mode, context = {}) {
  let prompt = SYSTEM_PROMPT;
  if (mode === 'lab_animation') prompt = ANIMATION_LAB_PROMPT;
  if (mode === 'lab_chat') prompt = LAB_CHAT_PROMPT;
  if (mode === 'derivative_chat') prompt = buildDerivativeChatPrompt(context);
  if (mode === 'topology_chat') prompt = buildTopologyChatPrompt(context);

  return [
    { role: "system", content: prompt },
    { role: "user", content: userText }
  ];
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, server: "running", model: MODEL_NAME });
});

app.post("/api/interpret", async (req, res) => {
  try {
    const promptText = String(req.body?.prompt ?? req.body?.message ?? "").trim();
    const mode = String(req.body?.mode ?? "chat");
    const context = req.body?.context && typeof req.body.context === "object"
      ? req.body.context
      : {};

    if (!promptText) {
      return res.status(400).json({ error: "Please enter a prompt" });
    }

    if (!VALID_MODES.has(mode)) {
      return res.status(400).json({ error: `Invalid mode: ${mode}` });
    }

    console.log(`📡 Sending request to OpenAI (${MODEL_NAME}) [Mode: ${mode}]...`);

    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: buildMessages(promptText, mode, context),
      temperature: mode === "derivative_chat" ? 0.3 : mode === "topology_chat" ? 0.2 : 0.1,
      response_format: { type: "json_object" } // Enforce JSON mode
    });

    const text = completion.choices[0].message.content;
    console.log("📥 OpenAI Response:", text);



    // Parse and Validate
    let parsedData;
    try {
      parsedData = JSON.parse(text);
      if (!parsedData || typeof parsedData !== "object") {
        throw new Error("Result is not a valid JSON object");
      }
    } catch {
      console.error("❌ JSON Parse Error:", text);
      return res.status(502).json({ error: "Failed to parse OpenAI response", raw: text });
    }

    if (mode === "derivative_chat") {
      const is3DContext = String(context?.mode || "2D").toUpperCase() === "3D";
      const transitionAsked = asksSecantToTangent(promptText);
      const inferredChange2D = inferDerivativeFunctionAtPoint(promptText);
      const inferredFunc3D = infer3DFunction(promptText);
      const wants3D = asksFor3DMode(promptText);
      const wants2D = asksFor2DMode(promptText);

      let action = normalizeAction(parsedData.action);

      if (inferredFunc3D && (!action || action.type !== "change_function_3d")) {
        action = {
          type: "change_function_3d",
          params: {
            func3D: inferredFunc3D,
            a: Number.isFinite(Number(context?.a)) ? Number(context.a) : 0,
            b: Number.isFinite(Number(context?.b)) ? Number(context.b) : 0
          }
        };
      } else if (transitionAsked && !wants3D && !is3DContext) {
        action = action?.type === "animate" ? action : buildAnimateAction(context);
      } else if (inferredChange2D && (!action || action.type !== "change_function")) {
        action = {
          type: "change_function",
          params: inferredChange2D
        };
      } else if (wants3D && !action) {
        action = { type: "set_mode", params: { mode: "3D" } };
      } else if (wants2D && !action) {
        action = { type: "set_mode", params: { mode: "2D" } };
      }

      const rawHighlight = typeof parsedData.highlight === "string"
        ? parsedData.highlight.toLowerCase()
        : "";
      let highlight = VALID_HIGHLIGHTS.has(rawHighlight) ? rawHighlight : null;
      if (!highlight) {
        if (action?.type === "change_function") highlight = "tangent";
        if (action?.type === "animate") highlight = "secant";
        if (action?.type === "change_function_3d") highlight = "surface";
        if (action?.type === "set_b") highlight = "normal";
        if (action?.type === "set_mode" && action?.params?.mode === "3D") highlight = "surface";
      }

      let suggestedActions = normalizeSuggestedActions(parsedData.suggested_actions);
      const actionType = action?.type || "";
      const isExampleAction = actionType === "change_function" || actionType === "change_function_3d";
      if (isExampleAction && isJustAskingExample(promptText)) {
        suggestedActions = [
          ...suggestedActions,
          { label: "طبّق على الرسم", action }
        ];
        action = null;
        highlight = null;
      }

      const applyFromSuggested = suggestedActions.find((s) =>
        s.action?.type === "change_function" || s.action?.type === "change_function_3d"
      )?.action;
      const applyForContext = applyFromSuggested || (
        action?.type === "change_function" || action?.type === "change_function_3d" ? action : null
      );
      const llmQuickActions = normalizeSuggestedActions(parsedData.quick_actions);
      const contextQuickActions = applyForContext ? buildContextQuickActions(applyForContext, context) : [];
      const quickActions = [...llmQuickActions, ...contextQuickActions];

      return res.json({
        success: true,
        explanation:
          typeof parsedData.explanation === "string" && parsedData.explanation.trim()
            ? stripEmojis(parsedData.explanation)
            : "I could not parse the request clearly. Please rephrase.",
        steps: stripEmojis(parsedData.steps),
        hint: stripEmojis(parsedData.hint),
        action,
        highlight,
        suggested_actions: suggestedActions,
        quick_actions: quickActions
      });
    }

    if (mode === "topology_chat") {
      let action = normalizeAction(parsedData.action);
      if (action && !VALID_TOPOLOGY_ACTIONS.has(action.type)) {
        action = null;
      }

      if (action?.type === "change_curve") {
        const preset = String(action.params?.preset || "").toLowerCase();
        if (!VALID_TOPOLOGY_PRESETS.has(preset)) {
          action = null;
        } else {
          action = { type: "change_curve", params: { preset } };
        }
      }

      if (action?.type === "set_resolution") {
        const value = Number(action.params?.value);
        if (!Number.isFinite(value)) {
          action = null;
        } else {
          action = {
            type: "set_resolution",
            params: { value: Math.max(20, Math.min(100, Math.round(value))) }
          };
        }
      }

      if (action?.type === "toggle_collisions" || action?.type === "toggle_intersections") {
        const hasShow = Object.prototype.hasOwnProperty.call(action.params || {}, "show");
        action = {
          type: "toggle_collisions",
          params: hasShow ? { show: Boolean(action.params?.show) } : {}
        };
      }

      if (action?.type === "toggle_all_rectangles") {
        const hasShow = Object.prototype.hasOwnProperty.call(action.params || {}, "show");
        action = {
          type: "toggle_all_rectangles",
          params: hasShow ? { show: Boolean(action.params?.show) } : {}
        };
      }

      if (action?.type === "toggle_info_panel") {
        const hasShow = Object.prototype.hasOwnProperty.call(action.params || {}, "show");
        action = {
          type: "toggle_info_panel",
          params: hasShow ? { show: Boolean(action.params?.show) } : {}
        };
      }

      if (action?.type === "toggle_ai_cards") {
        const hasShow = Object.prototype.hasOwnProperty.call(action.params || {}, "show");
        action = {
          type: "toggle_ai_cards",
          params: hasShow ? { show: Boolean(action.params?.show) } : {}
        };
      }

      if (action?.type === "toggle_drawing") {
        const hasShow = Object.prototype.hasOwnProperty.call(action.params || {}, "show");
        action = {
          type: "toggle_drawing",
          params: hasShow ? { show: Boolean(action.params?.show) } : {}
        };
      }

      if (action?.type === "clear_curve") {
        action = { type: "clear_curve", params: {} };
      }

      if (action?.type === "scroll_to_bottom") {
        action = { type: "scroll_to_bottom", params: {} };
      }

      if (action?.type === "toggle_fullscreen") {
        const hasShow = Object.prototype.hasOwnProperty.call(action.params || {}, "show");
        action = {
          type: "toggle_fullscreen",
          params: hasShow ? { show: Boolean(action.params?.show) } : {}
        };
      }

      if (action?.type === "highlight_rectangle") {
        const index = Number(action.params?.index);
        if (!Number.isInteger(index) || index < 0) {
          action = null;
        } else {
          action = { type: "highlight_rectangle", params: { index } };
        }
      }

      return res.json({
        success: true,
        explanation:
          typeof parsedData.explanation === "string" && parsedData.explanation.trim()
            ? stripEmojis(parsedData.explanation)
            : "I could not parse that clearly. Try a shorter request.",
        visual_hint: stripEmojis(parsedData.visual_hint || parsedData.hint),
        mathConcept:
          typeof parsedData.mathConcept === "string" && parsedData.mathConcept.trim()
            ? stripEmojis(parsedData.mathConcept)
            : undefined,
        action
      });
    }

    // Schema Validation (Zod)
    // If in animation/chat lab modes, we trust the specific pipeline or validate differently
    if (mode === 'lab_animation' || mode === 'lab_chat') {
      // Pass-through for now, or add specific schema later
    } else {
      parsedData = validateScenePayload(parsedData);
      if (parsedData.error) {
        console.warn("⚠️ Schema Validation Warning:", parsedData.error);
      }
    }

    return res.json({
      success: true,
      json: parsedData
    });

  } catch (err) {
    console.error("❌ Server Error:", err);
    return res.status(500).json({ error: "Server Error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(`🤖 AI Model: ${MODEL_NAME}`);
});

