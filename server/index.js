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

function buildMessages(userText, mode) {
  let prompt = SYSTEM_PROMPT;
  if (mode === 'lab_animation') prompt = ANIMATION_LAB_PROMPT;
  if (mode === 'lab_chat') prompt = LAB_CHAT_PROMPT;

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
    const promptText = String(req.body?.prompt ?? "").trim();
    const mode = String(req.body?.mode ?? "chat");

    if (!promptText) {
      return res.status(400).json({ error: "Please enter a prompt" });
    }

    console.log(`📡 Sending request to OpenAI (${MODEL_NAME}) [Mode: ${mode}]...`);

    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: buildMessages(promptText, mode),
      temperature: 0.1,
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
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", text);
      return res.status(502).json({ error: "Failed to parse OpenAI response", raw: text });
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
