import React, { useState, useEffect } from "react";
import { Square, Box, PlayCircle, Layers, Download, MessageSquare, Sparkles, X, Target, Sigma } from "lucide-react";
import AnimationLabRenderer from "../renderers/lab/AnimationLabRenderer";
import LinearStudioSVG from "../renderers/lab/LinearStudioSVG";
import ManifoldRenderer from "../renderers/lab/ManifoldRenderer";
import EpsilonDeltaRenderer from "../renderers/lab/EpsilonDeltaRenderer";
import TopologyLabRenderer from "./TopologyLab/TopologyLabRenderer";

const LABS = [
    {
        id: "linear",
        label: "Linear Studio",
        icon: Square,
        description: "Matrix transformations & linear algebra",
        renderer: null // Will be handled separately
    },
    {
        id: "hypercube",
        label: "Topology 4D->3D",
        icon: Box,
        description: "Pairs to topology surface and collision geometry",
        renderer: TopologyLabRenderer
    },
    {
        id: "animation",
        label: "Animation Lab",
        icon: PlayCircle,
        description: "Create mathematical animations",
        renderer: AnimationLabRenderer
    },
    {
        id: "manifold",
        label: "Manifold Lab",
        icon: Layers,
        description: "Explore surfaces & manifolds",
        renderer: ManifoldRenderer
    },
    {
        id: "epsilon-delta",
        label: "Epsilon-Delta Lab",
        icon: Target,
        description: "Interactive limit definition explorer",
        renderer: EpsilonDeltaRenderer
    },
    {
        id: "derivative-studio",
        label: "Topology Studio",
        icon: Sigma,
        description: "Inscribed rectangle detection via topology transform",
        renderer: TopologyLabRenderer
    }
];

export default function MathLab({ initialLab }) {
    const [activeLab, setActiveLab] = useState(initialLab || "animation");
    const [showAIChat, setShowAIChat] = useState(false);

    useEffect(() => {
        if (initialLab) {
            setActiveLab(initialLab);
        }
    }, [initialLab]);

    const isStandaloneLab = activeLab === "epsilon-delta" || activeLab === "derivative-studio";

    const handleDownload = async () => {
        try {
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            const plotlyDiv = document.querySelector('.js-plotly-plot');
            if (plotlyDiv) {
                const plotlyInstance = window.Plotly;
                if (plotlyInstance && plotlyInstance.downloadImage) {
                    plotlyInstance.downloadImage(plotlyDiv, {
                        format: 'png',
                        width: 1920,
                        height: 1080,
                        filename: `math-lab-${activeLab}-${Date.now()}`
                    });
                    return;
                }
            }
            
            const canvas = document.querySelector('canvas');
            if (canvas) {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `math-lab-${activeLab}-${Date.now()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }, 100);
                    }
                }, 'image/png');
            }
        } catch (error) {
            console.error("Download error:", error);
        }
    };

    // Default spec for epsilon-delta lab
    const epsilonDeltaSpec = {
        type: "epsilon_delta_limit",
        concept: "limit_definition",
        data: {
            function: {
                expression: "(x^2 - 4)/(x - 2)",
                simplified: "x + 2"
            },
            point: {
                a: 2,
                L: 4
            },
            domain: {
                x: [0, 4],
                y: [0, 6]
            },
            epsilon_delta_pairs: [
                { epsilon: 1.0, delta: 0.5 },
                { epsilon: 0.5, delta: 0.25 },
                { epsilon: 0.1, delta: 0.05 }
            ],
            discontinuity_type: "removable",
            explanation: {
                arabic: "الفكرة: كلما صغّرنا ε حول L يجب أن نختار δ أصغر حول a كي تبقى قيم f(x) داخل النطاق.",
                steps: [
                    "نختار مسافة ε حول القيمة L.",
                    "نبحث عن مسافة δ حول النقطة a.",
                    "نتحقق: كل x في نطاق δ تعطي f(x) في نطاق ε."
                ]
            }
        }
    };

    const renderLab = () => {
        switch (activeLab) {
            case "linear":
                return (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--panel-2)]">
                        <LinearStudioSVG matrix={[[1, 0], [0, 1]]} />
                    </div>
                );
            case "hypercube":
                return <TopologyLabRenderer />;
            case "animation":
                return <AnimationLabRenderer />;
            case "manifold":
                return <ManifoldRenderer />;
            case "epsilon-delta":
                return <EpsilonDeltaRenderer spec={epsilonDeltaSpec} />;
            case "derivative-studio":
                return <TopologyLabRenderer />;
            default:
                return <div className="text-slate-300 p-4">اختر مختبرًا من الأعلى.</div>;
        }
    };

    return (
        <div className={`lab-shell-enhanced ${activeLab === "epsilon-delta" ? "epsilon-lab-active" : ""}`}>
            {/* Toolbar with Lab Tabs */}
            <div className="lab-toolbar-enhanced">
                {LABS.map((lab) => {
                    const Icon = lab.icon;
                    return (
                        <button
                            key={lab.id}
                            onClick={() => setActiveLab(lab.id)}
                            className={`lab-module-card ${activeLab === lab.id ? 'active' : ''}`}
                        >
                            <div className={`lab-module-icon ${activeLab === lab.id ? 'lab-module-icon-active' : ''}`}>
                                <Icon size={20} />
                            </div>
                            <div className="lab-module-info">
                                <div className="lab-module-label">{lab.label}</div>
                                <div className="lab-module-desc">{lab.description}</div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Main Stage */}
            <div className="lab-stage-enhanced">
                {renderLab()}

                {/* Controls - Distributed Layout */}
                {!isStandaloneLab && (
                    <>
                        {/* AI Chat Button - Top Left */}
                        <button
                            onClick={() => setShowAIChat(!showAIChat)}
                            className={`ai-chat-btn-redesigned ${showAIChat ? 'active' : ''}`}
                            title="Toggle AI Chat"
                        >
                            <div className="ai-chat-btn-icon">
                                <MessageSquare size={20} />
                                {showAIChat && <Sparkles size={12} className="sparkle-overlay" />}
                            </div>
                            <span className="ai-chat-btn-text">Chat with AI</span>
                        </button>

                        {/* Download Button - Top Right */}
                        <button
                            onClick={handleDownload}
                            className="download-btn-redesigned"
                            title="Download visualization"
                        >
                            <Download size={20} />
                        </button>
                    </>
                )}
            </div>

            {/* AI Chat Panel */}
            {showAIChat && !isStandaloneLab && (
                <div className="ai-chat-box">
                    <div className="ai-chat-header">
                        <div className="ai-avatar-pulse">
                            <Sparkles size={16} />
                        </div>
                        <span>AI Assistant</span>
                        <button
                            onClick={() => setShowAIChat(false)}
                            className="ml-auto text-slate-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="ai-chat-messages">
                        <div className="chat-message ai">
                            <div className="msg-avatar">
                                <Sparkles size={12} />
                            </div>
                            <div className="msg-bubble">
                                Hello! I can help you explore mathematical concepts. What would you like to visualize?
                            </div>
                        </div>
                    </div>
                    <div className="ai-chat-input-area">
                        <input
                            type="text"
                            placeholder="Ask me anything about math..."
                            className="flex-1"
                        />
                        <button>
                            <MessageSquare size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
