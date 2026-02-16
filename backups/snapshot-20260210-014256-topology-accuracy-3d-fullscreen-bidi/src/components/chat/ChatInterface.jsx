import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { parseLocalCommand } from "../../utils/commandParser";

const DEFAULT_INTRO =
    "اسألني عن تعريف النهاية أو جرّب أوامر سريعة مثل: eps 0.5 أو lim 4.";

const extractActionsFromText = (text) => {
    if (!text) return [];
    const actions = [];
    const epsMatch = text.match(/(?:epsilon|eps|إ?بسيلون|ابسلون|ايه|ε)\s*=?\s*(\d*\.?\d+)/i);
    if (epsMatch) {
        actions.push({ type: "UPDATE_PARAM", param: "epsilon", value: parseFloat(epsMatch[1]) });
    }
    const deltaMatch = text.match(/(?:delta|del|دلتا|د|δ)\s*=?\s*(\d*\.?\d+)/i);
    if (deltaMatch) {
        actions.push({ type: "UPDATE_PARAM", param: "delta", value: parseFloat(deltaMatch[1]) });
    }
    const aMatch = text.match(/(?:^|\b)a\s*=?\s*(-?\d*\.?\d+)/i);
    const aArabicMatch = text.match(/(?:النقطة|نقطة|س)\s*=?\s*(-?\d*\.?\d+)/i);
    const aValue = aMatch?.[1] ?? aArabicMatch?.[1];
    if (aValue !== undefined) {
        actions.push({ type: "UPDATE_PARAM", param: "a", value: parseFloat(aValue) });
    }
    const lMatch = text.match(/(?:^|\b)L\s*=?\s*(-?\d*\.?\d+)/);
    const lArabicMatch = text.match(/(?:نهاية|حد)\s*=?\s*(-?\d*\.?\d+)/i);
    const lValue = lMatch?.[1] ?? lArabicMatch?.[1];
    if (lValue !== undefined) {
        actions.push({ type: "UPDATE_PARAM", param: "L", value: parseFloat(lValue) });
    }
    return actions.filter(action => Number.isFinite(action.value));
};

export default function ChatInterface({
    open,
    onClose,
    context,
    onAction,
    callMathAgentAPI,
    defaultReply = ""
}) {
    const [messages, setMessages] = useState(() => ([
        { role: "ai", text: DEFAULT_INTRO }
    ]));
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef(null);

    useEffect(() => {
        if (!messagesRef.current) return;
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }, [messages, open, isLoading]);

    const addBotMessage = (text) => {
        setMessages(prev => [...prev, { role: "ai", text }]);
    };

    const handleSendMessage = async (text) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;
        setMessages(prev => [...prev, { role: "user", text: trimmed }]);
        setInput("");

        const localCmd = parseLocalCommand(trimmed);
        if (localCmd) {
            if (localCmd.type === "UPDATE_PARAM") {
                onAction?.(localCmd);
                const label = localCmd.param === "epsilon"
                    ? "ε"
                    : localCmd.param === "delta"
                        ? "δ"
                        : localCmd.param;
                addBotMessage(`⚡️ تم تحديث ${label} إلى ${localCmd.value}.`);
            } else if (localCmd.type === "RESET") {
                onAction?.(localCmd);
                addBotMessage("↺ تمت إعادة الضبط.");
            }
            return;
        }

        if (!callMathAgentAPI) {
            addBotMessage(defaultReply || "حسنًا، كيف أساعدك؟");
            return;
        }

        setIsLoading(true);
        // Allow the UI to paint the loading state before heavy work starts.
        await new Promise((resolve) => setTimeout(resolve, 100));
        try {
            const aiResponse = await callMathAgentAPI(trimmed, context);
            if (aiResponse?.actions && Array.isArray(aiResponse.actions)) {
                aiResponse.actions.forEach(action => onAction?.(action));
            }
            const inferredActions = !aiResponse?.actions?.length
                ? extractActionsFromText(aiResponse?.reply || "")
                : [];
            if (inferredActions.length) {
                inferredActions.forEach(action => onAction?.(action));
            }
            addBotMessage(aiResponse?.reply || defaultReply || "تم.");
        } catch (error) {
            addBotMessage("تعذر الاتصال بالذكاء الاصطناعي الآن.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.96 }}
                    className="epsilon-chat-flyout"
                    dir="rtl"
                >
                    <div className="epsilon-chat-header">
                        <span>شرح AI</span>
                        <button onClick={onClose}>×</button>
                    </div>
                    <div className="epsilon-chat-messages" ref={messagesRef}>
                        {messages.map((msg, index) => (
                            <div
                                key={`${msg.role}-${index}`}
                                className={`epsilon-chat-bubble ${msg.role}`}
                            >
                                {msg.text}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="epsilon-chat-bubble ai epsilon-chat-loading">
                                <Loader2 size={14} className="animate-spin" />
                                <span>جاري التحليل...</span>
                            </div>
                        )}
                    </div>
                    <div className="epsilon-chat-input">
                        <input
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="اكتب سؤالك هنا..."
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSendMessage(input);
                                }
                            }}
                        />
                        <button
                            onClick={() => handleSendMessage(input)}
                            disabled={isLoading || !input.trim()}
                            className="epsilon-chat-send"
                        >
                            {isLoading && (
                                <span className="epsilon-chat-spinner" />
                            )}
                            إرسال
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
