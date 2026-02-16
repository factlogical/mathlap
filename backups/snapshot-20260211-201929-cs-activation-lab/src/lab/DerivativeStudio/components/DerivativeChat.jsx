import { useEffect, useRef, useState } from "react";

function detectDirection(text) {
    return /[\u0600-\u06FF]/.test(String(text || "")) ? "rtl" : "ltr";
}

export default function DerivativeChat({
    title = "Derivative Chat",
    messages,
    onSendMessage,
    onQuickAction,
    isAnimating,
    compact = false,
    onClose
}) {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesRef = useRef(null);

    useEffect(() => {
        if (!messagesRef.current) return;
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages, loading]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading || isAnimating) return;

        setLoading(true);
        try {
            await onSendMessage(text);
            setInput("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={`chat-panel derivative-chat-panel ${compact ? "derivative-chat-panel-compact" : ""} ${
                onClose ? "derivative-chat-panel-overlay" : ""
            }`}
        >
            <div className="derivative-chat-header">
                <h3>{title}</h3>
                <div className="derivative-chat-header-actions">
                    <span>{isAnimating ? "Animating" : "Ready"}</span>
                    {onClose && (
                        <button
                            type="button"
                            className="derivative-chat-close-btn"
                            onClick={onClose}
                            title="Close chat"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>

            <div className="messages derivative-messages" ref={messagesRef}>
                {messages.map((msg, idx) => {
                    const quickActions = Array.isArray(msg.quick_actions) && msg.quick_actions.length > 0
                        ? msg.quick_actions
                        : Array.isArray(msg.suggested_actions)
                            ? msg.suggested_actions
                            : [];
                    const direction = detectDirection(msg.content || msg.steps || msg.hint || "");

                    return (
                        <div
                            key={`${msg.role}-${idx}`}
                            className={`message derivative-message derivative-message-${direction} ${msg.role} ${msg.error ? "error" : ""}`}
                        >
                            <div className="content derivative-message-content" dir="auto">{msg.content}</div>
                            {msg.steps && (
                                <pre className="steps derivative-message-steps" dir="auto">
                                    {Array.isArray(msg.steps) ? msg.steps.join("\n") : msg.steps}
                                </pre>
                            )}
                            {msg.hint && <div className="hint derivative-message-hint" dir="auto">{msg.hint}</div>}
                            {quickActions.length > 0 && onQuickAction && (
                                <div className="derivative-quick-actions">
                                    {quickActions.map((s, sIdx) => (
                                        <button
                                            key={`quick-${idx}-${sIdx}`}
                                            className="derivative-quick-btn"
                                            disabled={isAnimating}
                                            onClick={() => onQuickAction(s.action)}
                                        >
                                            {s.label || "Apply"}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {loading && <div className="typing derivative-typing">Analyzing...</div>}
            </div>

            <div className="input-area derivative-input-area">
                <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleSend()}
                    placeholder="Example: plot sin(x), move h, mode 3D..."
                    disabled={loading || isAnimating}
                />
                <button type="button" onClick={handleSend} disabled={loading || !input.trim() || isAnimating}>
                    Send
                </button>
            </div>
        </div>
    );
}
