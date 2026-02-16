import React, { useState, useEffect, useRef, useMemo } from "react";
import SafePlot from "../../components/SafePlot";
import { Play, Pause, RotateCcw, AlertCircle, Wand2, ChevronDown, ChevronRight, Loader2, Send } from "lucide-react";
import * as math from "mathjs";
import { interpretPromptToJson } from "../../agent/interpret";

const DEFAULT_DSL = `{
  "scene": []
}`;

const AnimationLabRenderer = ({ annotations = [] }) => {
    // UI State
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Engine State
    const [dslJson, setDslJson] = useState(DEFAULT_DSL);
    const [error, setError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1.0);

    const requestRef = useRef();
    const promptInputRef = useRef(null);

    // -- GENERATOR --
    const handleGenerate = async (inputOrEvent = null) => {
        // 1. Safe Extraction: Handle both Enter Key (Event) and Button Click (String/Event)
        let rawText = "";
        if (typeof inputOrEvent === 'string') {
            rawText = inputOrEvent;
        } else if (inputOrEvent?.nativeEvent?.text) {
            rawText = inputOrEvent.nativeEvent.text; // React Native/Mobile
        } else if (inputOrEvent?.target?.value) {
            rawText = inputOrEvent.target.value;     // Standard DOM
        } else {
            rawText = prompt; // Fallback to current state
        }

        // 2. Sanitation: Remove non-math text like "ارسم"
        // Keep only: numbers, letters, operators, brackets, dots
        const cleanMath = rawText.replace(/[^a-zA-Z0-9\+\-\*\/\^\(\)\.\s]/g, '').trim();

        if (!cleanMath) return;

        setPrompt(cleanMath); // Update UI

        // Use cleanMath directly for API
        const promptText = cleanMath;

        setIsGenerating(true);
        setError(null);
        let rawResponse = "";

        try {
            const injectedPrompt = `
                [SYSTEM: ANIMATION_CODEGEN]
                You are a specialized Math Animation Engine.
                User Request: "${promptText}"

                STRICT OUTPUT RULES:
                1. Output MUST be valid JSON only. NO Markdown.
                2. Structure: { "scene": [ ...commands... ] }
                3. Allowed Commands: 
                   - axes2d (x: [min,max], y: [min,max])
                   - plot2d (expr: "string", x: [min,max], samples: 200) <--- 'x' range is MANDATORY
                   - animate (target: id, action: "morph"|"draw", toExpr: "string", duration: number)
                
                Example Output:
                { "scene": [ { "cmd": "plot2d", "id": "f1", "expr": "x", "x": [-5,5] }, { "cmd": "animate", "target": "f1", "action": "morph", "toExpr": "x^2", "duration": 2 } ] }
            `;

            console.log("📡 Math Agent: Sending Request...", promptText);
            // Call API (Now with Client-Side Retry in interpret.js)
            rawResponse = await interpretPromptToJson(injectedPrompt, "lab_animation");
            console.log("📥 Math Agent: Raw Response:", rawResponse);

            if (!rawResponse) throw new Error("No script generated");

            let cleanText = typeof rawResponse === 'string'
                ? rawResponse.replace(/```json/g, "").replace(/```/g, "").trim()
                : JSON.stringify(rawResponse);

            console.log("🔍 Math Agent: Clean Text:", cleanText);

            let rawData;
            try {
                rawData = JSON.parse(cleanText);
            } catch (e) {
                const match = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (match) {
                    rawData = JSON.parse(match[0]);
                } else {
                    throw e;
                }
            }

            let finalScene = [];
            if (Array.isArray(rawData)) {
                finalScene = rawData;
            } else if (rawData.scene && Array.isArray(rawData.scene)) {
                finalScene = rawData.scene;
            } else {
                const candidate = Object.values(rawData).find(val => Array.isArray(val));
                if (candidate) {
                    finalScene = candidate;
                } else {
                    throw new Error("AI did not return a valid animation array.");
                }
            }

            const validJson = { scene: finalScene };
            console.log("✅ Math Agent: Valid DSL Generated:", validJson);
            setDslJson(JSON.stringify(validJson, null, 2));
            setCurrentTime(0);
            setIsPlaying(true);
        } catch (e) {
            console.error("Generation Error:", e);
            setError(`Generation failed: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // -- PARSE & COMPILE TIMELINE --
    const { timeline, compiledDuration, parseError } = useMemo(() => {
        let t = 0;
        const timeline = [];
        try {
            const parsed = JSON.parse(dslJson);
            if (!parsed.scene || !Array.isArray(parsed.scene)) throw new Error("Root must be { scene: [] }");

            parsed.scene.forEach((step) => {
                if (step.cmd === "axes2d") {
                    timeline.push({ type: "setup_axes", start: 0, end: 0, data: step });
                } else if (step.cmd === "plot2d") {
                    timeline.push({ type: "create_object", start: 0, end: 0, data: step });
                } else if (step.cmd === "animate") {
                    const start = t;
                    const dur = step.duration || 1.0;
                    const end = start + dur;
                    timeline.push({ type: "animation", start, end, duration: dur, data: step });
                    t = end;
                }
            });
            return { timeline, compiledDuration: t, parseError: null };
        } catch (e) {
            return { timeline: [], compiledDuration: 0, parseError: e.message };
        }
    }, [dslJson]);

    useEffect(() => {
        if (parseError) setError(parseError);
        else setError(null);
    }, [parseError]);

    useEffect(() => setTotalDuration(compiledDuration), [compiledDuration]);

    // -- ANIMATION LOOP --
    useEffect(() => {
        if (isPlaying) {
            let lastStamp = performance.now();

            const loop = (now) => {
                const dt = (now - lastStamp) / 1000;
                lastStamp = now;

                setCurrentTime(prev => {
                    let next = prev + dt; // Removed playbackSpeed
                    if (next >= totalDuration) { setIsPlaying(false); return totalDuration; }
                    return next;
                });
                requestRef.current = requestAnimationFrame(loop);
            };
            requestRef.current = requestAnimationFrame(loop);

            return () => cancelAnimationFrame(requestRef.current);
        }
    }, [isPlaying, totalDuration]);

    // -- PLOT STATE --
    const plotState = useMemo(() => {
        const layout = {
            title: "",
            autosize: true,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { color: '#e2e8f0', family: 'Inter, sans-serif' },
            margin: { l: 50, r: 50, t: 50, b: 50 },
            xaxis: { range: [-5 * zoomLevel, 5 * zoomLevel], gridcolor: '#334155', zerolinecolor: '#64748b' },
            yaxis: { range: [-5 * zoomLevel, 5 * zoomLevel], gridcolor: '#334155', zerolinecolor: '#64748b' },
            showlegend: false,
            uirevision: 'true', // Keep zoom state on updates
            // Merge external annotations
            annotations: annotations.map(ant => ({
                x: ant.x,
                y: ant.y,
                xref: 'x',
                yref: 'y',
                text: ant.text,
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 2,
                arrowcolor: '#06b6d4',
                ax: ant.ax || 20,
                ay: ant.ay || -20,
                font: { color: '#06b6d4', size: 12, family: 'sans-serif' },
                bgcolor: 'rgba(15, 23, 42, 0.8)',
                bordercolor: '#06b6d4',
                borderwidth: 1,
                borderpad: 4,
                opacity: 0.9
            }))
        };

        let defaultXRange = [-5, 5];
        timeline.forEach(item => {
            if (item.type === "setup_axes") {
                if (item.data.x?.length === 2) {
                    layout.xaxis.range = item.data.x;
                    defaultXRange = item.data.x;
                }
                if (item.data.y?.length === 2) {
                    layout.yaxis.range = item.data.y;
                }
            }
        });

        const objects = {};

        timeline.forEach(item => {
            if (item.type === "create_object") {
                const { id, expr } = item.data;
                const xRange = item.data.x?.length === 2 ? item.data.x : defaultXRange;
                const samples = item.data.samples || 200;

                const xVals = [];
                const yVals = [];
                const dx = (xRange[1] - xRange[0]) / (samples - 1);

                try {
                    const compiled = math.compile(expr);
                    for (let i = 0; i < samples; i++) {
                        const val = xRange[0] + i * dx;
                        xVals.push(val);
                        try {
                            yVals.push(compiled.evaluate({ x: val }));
                        } catch {
                            yVals.push(null);
                        }
                    }
                } catch {
                    for (let i = 0; i < samples; i++) {
                        xVals.push(xRange[0] + i * dx);
                        yVals.push(0);
                    }
                }

                objects[id] = {
                    x: xVals,
                    y: yVals,
                    mode: 'lines',
                    line: { width: 3, color: '#3b82f6' },
                    name: id,
                    opacity: 0
                };
                objects[id]._expr = expr;
                objects[id]._range = xRange;
            }
        });

        // Apply Animations
        timeline.forEach(item => {
            if (item.type === "animation" && currentTime >= item.start) {
                const { target, action } = item.data;
                if (!objects[target]) return;

                let p = Math.min(1, Math.max(0, (currentTime - item.start) / item.duration));

                if (action === "draw") {
                    objects[target].opacity = 1;
                    const totalPoints = objects[target].x.length;
                    const currentPoints = Math.floor(totalPoints * p);
                    objects[target].x = objects[target].x.slice(0, currentPoints);
                    objects[target].y = objects[target].y.slice(0, currentPoints);
                } else if (action === "morph") {
                    objects[target].opacity = 1;
                    const fromExpr = objects[target]._expr;
                    const toExpr = item.data.toExpr;
                    if (fromExpr && toExpr) {
                        const xRange = objects[target]._range;
                        const samples = 200;
                        const xVals = [];
                        const yVals = [];
                        const dx = (xRange[1] - xRange[0]) / (samples - 1);

                        try {
                            const f1 = math.compile(fromExpr);
                            const f2 = math.compile(toExpr);
                            for (let i = 0; i < samples; i++) {
                                const val = xRange[0] + i * dx;
                                const y1 = f1.evaluate({ x: val });
                                const y2 = f2.evaluate({ x: val });
                                xVals.push(val);
                                yVals.push((1 - p) * y1 + p * y2);
                            }
                            objects[target].x = xVals;
                            objects[target].y = yVals;
                        } catch { }
                    }
                }
            }
        });

        return { data: Object.values(objects), layout };
    }, [timeline, currentTime, annotations, zoomLevel]);

    // -- RENDER --
    return (
        <div className="animation-lab-container">
            {/* Full Screen Graph */}
            <div className="animation-lab-graph">
                {plotState.data.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500/50 pointer-events-none">
                        <Wand2 size={64} strokeWidth={1} className="mb-4 opacity-20 animate-pulse" />
                        <h2 className="text-2xl font-light text-slate-400 mb-2">Ready to explore?</h2>
                        <p className="text-sm opacity-60">Try plotting 'sin(x)' or ask me anything.</p>
                    </div>
                ) : (
                    <SafePlot
                        divId="animation-lab-plot"
                        data={plotState.data}
                        layout={plotState.layout}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler={true}
                        config={{ displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }}
                    />
                )}
            </div>

            {/* HUD - Top Right */}
            <div className="animation-lab-hud flex flex-col items-end gap-2">
                <div className="animation-hud-time">
                    <span className="animation-hud-label">TIME</span>
                    <span className="animation-hud-value">{currentTime.toFixed(2)}s</span>
                </div>
                {/* Zoom Controls */}
                <div className="flex flex-col gap-1 bg-slate-900/50 p-1 rounded-xl backdrop-blur border border-white/10 pointer-events-auto">
                    <button className="btn-glass w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-cyan-400" onClick={() => setZoomLevel(z => Math.max(0.5, z * 0.8))} title="Zoom In">+</button>
                    {/* Reset Button (RotateCcw) */}
                    <button className="btn-glass w-10 h-10 rounded-full bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border-white/10" onClick={() => setZoomLevel(1.0)} title="Reset View">
                        <RotateCcw size={18} />
                    </button>
                    <button className="btn-glass w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 hover:text-cyan-400" onClick={() => setZoomLevel(z => Math.min(5, z * 1.2))} title="Zoom Out">-</button>
                </div>
            </div>

            {/* Input Dock */}
            <div className="animation-input-dock">
                {/* Suggestion Chips - distinct neon capsules */}
                {plotState.data.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full flex justify-center items-center gap-3 mb-6 pointer-events-none z-20">
                        {[
                            { label: "Invert", action: "Invert current function" },
                            { label: "Shift Right", action: "Shift right" },
                            { label: "Derivative", action: "Derivative" }
                        ].map((chip, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleGenerate(chip.action)}
                                className="
                                    pointer-events-auto group
                                    flex items-center gap-2 px-5 py-2
                                    bg-slate-900/90 backdrop-blur-xl
                                    border border-cyan-500/30 rounded-full
                                    text-xs font-bold text-cyan-400 font-mono tracking-wider
                                    shadow-[0_0_15px_rgba(6,182,212,0.15)]
                                    transition-all duration-300
                                    hover:bg-cyan-500 hover:text-white hover:border-cyan-400 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]
                                "
                            >
                                <span className="opacity-70 group-hover:text-white group-hover:animate-pulse">✨</span>
                                {chip.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="animation-input-container">
                    <Wand2 size={18} className="animation-input-icon" />
                    <input
                        ref={promptInputRef}
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleGenerate(e);
                        }}
                        placeholder="Describe an animation (e.g. 'Plot cos(x)')"
                        className="animation-input"
                        disabled={isGenerating}
                    />
                    {/* Send / Loading Button - Premium Design */}
                    <button
                        onClick={() => handleGenerate()}
                        disabled={isGenerating || !prompt.trim()}
                        className={`
                            relative overflow-hidden
                            flex items-center justify-center
                            w-12 h-12 rounded-xl
                            transition-all duration-300
                            ${isGenerating
                                ? "bg-slate-800 border border-indigo-500/50 cursor-not-allowed"
                                : prompt.trim()
                                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 hover:scale-105 hover:shadow-indigo-500/50 border border-white/10"
                                    : "bg-slate-800/50 border border-white/5 text-slate-500 cursor-not-allowed"}
                        `}
                    >
                        {isGenerating ? (
                            <Loader2 size={20} className="text-indigo-400 animate-spin" />
                        ) : (
                            <Send size={20} className={prompt.trim() ? "text-white" : "text-slate-500"} />
                        )}
                    </button>
                </div>

                {error && (
                    <div className="animation-error mt-2 message-enter">
                        <AlertCircle size={14} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="w-full flex justify-center mt-2">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="animation-advanced-toggle">
                        {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Advanced DSL
                    </button>
                </div>

                {showAdvanced && (
                    <textarea
                        value={dslJson}
                        onChange={e => setDslJson(e.target.value)}
                        className="animation-dsl-editor mt-2 w-full message-enter"
                    />
                )}
            </div>
        </div>
    );
};

export default AnimationLabRenderer;
