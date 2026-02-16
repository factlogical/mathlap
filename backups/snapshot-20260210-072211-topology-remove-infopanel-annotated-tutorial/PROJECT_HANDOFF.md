# PROJECT_HANDOFF.md

## 1. Project Overview

**Math Agent Demo** is a React-based application that combines an AI chat interface with interactive math visualizations ("Labs").

**User Flow:**
1.  **Chat**: User enters a math request (e.g., "Show me a linear transformation").
2.  **AI**: The backend (acting as an agent) interprets the prompt and returns a JSON `spec`.
3.  **Router**: The frontend `SceneRouter` selects the appropriate renderer based on the `spec.type`.
4.  **Lab**: The selected renderer (e.g., `LinearTransformRenderer`) displays the interactive visualization.

**Main Labs/Scenes:**
*   **Linear Studio (`linear_transform`)**: Interactive 2D matrix transformations (grid, unit square, basis vectors).
*   **Vector Plot (`vector_field`)**: Visualizes vector fields.
*   **Scalar Plot (`scalar_field`)**: Visualizes 2D functions/heatmaps.
*   **Geometry 3D (`geometry_3d`)**: 3D shapes and surfaces.
*   **Animation Lab (`animation_lab`)**: Complex animations (physics, keyframes).

---

## 2. Current Status (Where we stopped)

As of the last session, the application is **stable** with the following key configurations:

*   **Linear Studio**:
    *   **Migrated to SVG**: The Plotly implementation was unstable (crashing on re-renders), so it was replaced with a custom SVG renderer (`LinearStudioSVG.jsx`).
    *   **3D Mode Disabled**: The "3D" tab is responsible for complex 3D matrix visualization. It is currently **disabled** in the UI with a "Coming Soon" tooltip to prevent crashes/confusion, as the SVG renderer is 2D-only for now.
*   **Other Labs (Plotly)**:
    *   **Restored via SafePlot**: Other labs (Vector, Scalar, etc.) still rely on Plotly.
    *   **SafePlot Wrapper**: A new `SafePlot.jsx` wrapper ensures robust handling of `data` and `layout` props to prevent "white screen" crashes if Plotly receives undefined structures.

**Symptoms addressed:**
*   **Linear Studio Crash**: Persistent "blank plot" and `selectAll` errors during React re-renders.
*   **Annotations Error**: Plotly often threw `Cannot read properties of undefined (reading 'annotations')`, now fixed by `SafePlot`'s sanitization.

---

## 3. Architecture

### Frontend
*   **Framework**: React (Vite).
*   **Entry Point**: `src/main.jsx` -> `src/App.jsx`.
*   **Routing**: `App.jsx` handles top-level views (`home`, `chat`, `lab`).
*   **Scene Routing**: `src/renderers/SceneRouter.jsx` maps `spec.types` (e.g., `linear_transform`) to specific components in `src/renderers/lab/`.

### Backend
*   **File**: `server/index.js` (Express).
*   **Endpoint**: `/api/chat`.
*   **Contract**: Receives `{ prompt: string }`, returns `{ spec: JSON }`.
*   **AI Logic**: Uses Google Generative AI (Gemini) to convert natural language into a structured JSON configuration.

### Data Contract Example
**Backend JSON -> Frontend Prop**:
```json
{
  "type": "linear_transform",
  "data": {
    "matrixA": [[1, 1], [0, 1]],
    "mode": "single"
  },
  "message": "Here is a shear transformation."
}
```

---

## 4. Folder/File Map

```text
/
├── server/
│   └── index.js                 # Express API, handles AI prompts
├── src/
│   ├── main.jsx                 # React Entry point
│   ├── App.jsx                  # Main Layout, Chat UI, History State
│   ├── components/
│   │   └── SafePlot.jsx         # Robust Plotly wrapper (safeguards props)
│   ├── renderers/
│   │   ├── SceneRouter.jsx      # Maps JSON specs to renderers
│   │   ├── GenericPlotRenderer.jsx
│   │   ├── VectorPlotRenderer.jsx
│   │   ├── ... (other Plotly renderers)
│   │   └── lab/
│   │       ├── LinearTransformRenderer.jsx # Main Linear Studio Logic
│   │       ├── LinearStudioSVG.jsx         # SVG implementation for Linear Studio
│   │       ├── AnimationLabRenderer.jsx
│   │       └── ...
│   └── scenes/
│       └── index.js             # Registry of available scene types
└── package.json
```

---

## 5. Changes Made (Chronological)

1.  **Debugging Linear Studio**:
    *   Encountered persistent blank screens with `react-plotly.js`.
    *   Attempted direct `Plotly.react` integration (failed due to lifecycle conflicts).
    *   **Decision**: Migrated Linear Studio to **Pure SVG** (`LinearStudioSVG.jsx`) for stability.
2.  **Fixing Dependencies**:
    *   Uninstalled and re-installed `plotly.js-dist-min` and `react-plotly.js` to ensure clean versions.
3.  **Hardening SafePlot**:
    *   Created a strict `SafePlot` component that defaults `annotations`, `shapes`, and `images` to empty arrays if missing, preventing common internal Plotly crashes.
4.  **Disabling 3D**:
    *   Disabled the "3D" tab in `LinearTransformRenderer.jsx` to match the capabilities of the new SVG renderer.
5.  **App.jsx Recovery**:
    *   Fixed a "history.map is not a function" crash by restoring the application state logic in `App.jsx`.

---

## 6. How to Run

**Prerequisites:** Node.js (v18+ recommended).

**Terminal 1 (Backend):**
```powershell
cd server
node index.js
# Runs on port 3000
```
*Note: Requires valid `.env` with `GEMINI_API_KEY` in `server/` directory.*

**Terminal 2 (Frontend):**
```powershell
# Root directory
npm run dev
# Vite runs on http://localhost:5173
```

**Troubleshooting:**
*   If `vite not recognized`: Ensure you ran `npm install`.
*   If generic build errors: Delete `node_modules` and `package-lock.json`, then run `npm install`.

---

## 7. Known Issues / Tech Debt

*   **Plotly Bundle Size**: We are using the distribution bundle. Need to verify tree-shaking efficacy later.
*   **Linear Studio 3D**: Currently disabled. Needs a solution (either WebGL/Three.js or a robust 3D Plotly configuration) to be re-enabled.
*   **Type Safety**: The project is JavaScript. A migration to TypeScript is recommended for the `spec` contracts.

---

## 8. Next Development Steps (Roadmap)

1.  **Re-enable 3D Linear Studio**:
    *   Option A: Extend `LinearStudioSVG` to project 3D points (orthographic/perspective manually).
    *   Option B: Create a dedicated `LinearStudioThreeJS` using `react-three-fiber`.
2.  **Expand AI Contract**:
    *   Add validation (Zod/Ajv) to `server/index.js` to ensure the AI never returns malformed JSON.
3.  **New Labs**:
    *   "Eigenvectors Lab": Visualize eigenvectors staying on their span during transformation.
4.  **Refactor**:
    *   Move hardcoded matrices in `LinearTransformRenderer` to the incoming `spec` prop to allow the AI to set the initial state.

---

## 9. Appendices

### A) Example Payloads

**Linear Transform:**
```json
{
  "type": "linear_transform",
  "title": "Shear Matrix",
  "parameters": {
    "matrix": { "a": 1, "b": 1, "c": 0, "d": 1 }
  }
}
```

**Vector Field:**
```json
{
  "type": "vector_field",
  "expression": "[-y, x]",
  "domain": { "x": [-5, 5], "y": [-5, 5] }
}
```

### B) Debug Playbook

*   **App Crash?** Check `App.jsx` state or `SafePlot` imports.
*   **Blank Plotly Graph?** Check if `layout.annotations` is undefined. Use `SafePlot`.
*   **Linear Studio Glitch?** It's SVG now. Check `LinearStudioSVG.jsx` logic.
