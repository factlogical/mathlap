import React, { useEffect, useMemo, useRef, useState } from "react";
import SplitView from "./components/SplitView";
import CurveCanvas2D from "./components/CurveCanvas2D";
import SurfaceView3D from "./components/SurfaceView3D";
import TopologyChat from "./components/TopologyChat";
import CurveControls from "./components/CurveControls";
import TutorialMode from "./components/TutorialMode";
import { PRESET_CURVES } from "./utils/presetCurves";
import { prepareCurvePoints } from "./utils/curveEngine";
import { buildTopologySurface } from "./utils/topologyTransform";
import { detectRectangles } from "./utils/rectangleDetector";
import "./TopologyLab.css";

const DEFAULT_PRESET = "circle";
const MIN_RESOLUTION = 20;
const MAX_RESOLUTION = 100;

function normalizeArabic(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function normalizeMixedSpacing(text) {
  return String(text || "")
    .replace(/\s*([:،؛])\s*/g, "$1 ")
    .replace(/([A-Za-z0-9][A-Za-z0-9_\-().,+/*^%]*):(?=[\u0600-\u06FF])/g, "$1: ")
    .replace(/([\u0600-\u06FF])(?=[A-Za-z0-9])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderMixedText(text) {
  const value = normalizeMixedSpacing(text);
  if (!value) return null;
  const parts = value.split(/([A-Za-z0-9][A-Za-z0-9_\-().,:=+/*^% ]*)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^[A-Za-z0-9]/.test(part)) {
      return (
        <bdi key={`r-${index}`} dir="ltr" className="topology-inline-ltr">
          {part}
        </bdi>
      );
    }
    return <React.Fragment key={`r-${index}`}>{part}</React.Fragment>;
  });
}

function clampResolution(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 48;
  return Math.max(MIN_RESOLUTION, Math.min(MAX_RESOLUTION, Math.round(n)));
}

function getCurveFromPreset(id, resolution = 150) {
  const preset = PRESET_CURVES[id];
  if (!preset) return [];
  return prepareCurvePoints(preset.generate(resolution), resolution);
}

function classifyHintTarget(text) {
  const raw = String(text || "").toLowerCase();
  const ar = normalizeArabic(text);
  if (/(3d|surface|collision|camera|self|intersection)/.test(raw)) return "surface";
  if (/(سطح|تقاطع|ثلاثي|كاميرا|فضاء)/.test(ar)) return "surface";
  return "curve";
}

function getActionLabel(action) {
  const type = String(action?.type || "").toLowerCase();
  if (type === "change_curve") return "تطبيق المنحنى";
  if (type === "set_resolution") return "ضبط الدقة";
  if (type === "toggle_collisions" || type === "toggle_intersections") return "تبديل نقاط التصادم";
  if (type === "highlight_rectangle") return "تسليط المستطيل";
  if (type === "toggle_ai_cards") return "إظهار/إخفاء بطاقات AI";
  if (type === "toggle_drawing") return "تبديل الرسم الحر";
  if (type === "clear_curve") return "مسح المنحنى";
  if (type === "scroll_to_bottom") return "إنزال الصفحة";
  if (type === "toggle_fullscreen") return "تبديل ملء الشاشة";
  return "تطبيق";
}

function fallbackLocalReply(text, context) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  const ar = normalizeArabic(raw);

  const withAction = (content, visualHint, action = null, mathConcept = null) => ({
    role: "assistant",
    content: normalizeMixedSpacing(content),
    visual_hint: normalizeMixedSpacing(visualHint),
    mathConcept: normalizeMixedSpacing(mathConcept),
    action: action ? { ...action, label: getActionLabel(action) } : null
  });

  const presets = [
    { key: "circle", re: /(circle|دائرة|دائره)/ },
    { key: "figure8", re: /(figure\s*8|رقم\s*8|ثمانية)/ },
    { key: "lemniscate", re: /(lemniscate|لا نهائي|لانهاية|infinity)/ },
    { key: "trefoil", re: /(trefoil|عقدة|عقده)/ },
    { key: "spiral", re: /(spiral|حلزوني|حلزون)/ },
    { key: "ellipse", re: /(ellipse|قطع\s*ناقص)/ },
    { key: "squircle", re: /(squircle|مربع)/ }
  ];
  const presetMatch = presets.find((entry) => entry.re.test(lower) || entry.re.test(ar));
  if (presetMatch) {
    return withAction(
      `تم اختيار منحنى ${PRESET_CURVES[presetMatch.key]?.name || presetMatch.key}.`,
      "لاحظ كيف تتغير نقاط التصادم البرتقالية مع تغير شكل المنحنى.",
      { type: "change_curve", params: { preset: presetMatch.key } },
      "كل زوج نقاط على المنحنى يتحول إلى نقطة في الفضاء (Mx, My, D)."
    );
  }

  const resolutionMatch = raw.match(/(?:resolution|الدقة|دقة)\s*(?:to|=|الى|إلى)?\s*(\d{2,3})/i);
  if (resolutionMatch) {
    const value = clampResolution(Number(resolutionMatch[1]));
    return withAction(
      `تم ضبط دقة السطح إلى ${value}.`,
      "الدقة الأعلى تعطي سطحًا أنعم لكنها تزيد وقت الحساب.",
      { type: "set_resolution", params: { value } },
      "زيادة resolution تزيد كثافة الشبكة على السطح الطوبولوجي."
    );
  }

  if (/(ملء الشاشه|مليء الشاشه|fullscreen|full screen|شاشه كامله|وضع كامل)/.test(ar + lower)) {
    return withAction(
      "تم تبديل وضع ملء الشاشة للمختبر مع الإبقاء على الأدوات والشات.",
      "يمكنك الخروج من ملء الشاشة بزر Esc أو من زر الهيدر.",
      { type: "toggle_fullscreen", params: {} }
    );
  }

  if (/(انزل|انزال|scroll|down)/.test(ar + lower)) {
    return withAction(
      "تم تنفيذ إنزال الصفحة داخل محتوى المختبر.",
      "سيتم التركيز على الأدوات والشات في الأسفل.",
      { type: "scroll_to_bottom", params: {} }
    );
  }

  if (/(اخف|اخفاء|hide).*(شرح|ماذا يحدث|info|panel)/.test(ar + lower)) {
    return withAction(
      "بطاقة (ماذا يحدث هنا) تم حذفها من الواجهة.",
      "الشرح الآن داخل العرض التعريفي التفاعلي مباشرة فوق الرسم.",
      null
    );
  }

  if (/(اظهر|show).*(شرح|ماذا يحدث|info|panel)/.test(ar + lower)) {
    return withAction(
      "بطاقة الشرح الثابتة لم تعد موجودة.",
      "استخدم زر العرض التعريفي للحصول على شرح متدرج مع مؤشرات على الرسم.",
      null
    );
  }

  if (/(اخف|hide).*(بطاق|cards|ai)/.test(ar + lower)) {
    return withAction(
      "تم إخفاء بطاقات الشرح الذكية فوق الرسم.",
      "يمكنك إرجاعها في أي وقت.",
      { type: "toggle_ai_cards", params: { show: false } }
    );
  }

  if (/(اظهر|show).*(بطاق|cards|ai)/.test(ar + lower)) {
    return withAction(
      "تم إظهار بطاقات الشرح الذكية.",
      "ستظهر ملاحظات AI مباشرة فوق نافذتي 2D و3D.",
      { type: "toggle_ai_cards", params: { show: true } }
    );
  }

  if (/(اخف|hide).*(تقاطع|collision|intersection)/.test(ar + lower)) {
    return withAction(
      "تم إخفاء نقاط التصادم.",
      "يمكنك إعادتها للمقارنة بين 2D و3D.",
      { type: "toggle_collisions", params: { show: false } }
    );
  }

  if (/(اظهر|show).*(تقاطع|collision|intersection)/.test(ar + lower)) {
    return withAction(
      "تم إظهار نقاط التصادم.",
      "كل نقطة تصادم تمثل مستطيلاً على المنحنى الأصلي.",
      { type: "toggle_collisions", params: { show: true } }
    );
  }

  if (/(رسم حر|draw|drawing|ارسم بنفسي)/.test(ar + lower)) {
    return withAction(
      "تم تفعيل وضع الرسم الحر.",
      "اسحب داخل نافذة 2D لرسم منحنى مغلق.",
      { type: "toggle_drawing", params: { show: true } }
    );
  }

  if (/self|intersection|تقاطع|ذاتي/.test(lower + ar)) {
    return withAction(
      "التقاطع الذاتي في فضاء (Mx, My, D) يعني أن زوجين مختلفين من نقاط المنحنى لهما نفس المنتصف ونفس الطول.",
      "عندما يتحقق الشرطان معًا، رؤوس الزوجين الأربعة تشكل مستطيلاً على المنحنى 2D.",
      null,
      "بدلاً من البحث المباشر عن 4 نقاط، نبحث عن تصادم نقطة-بنقطة في الفضاء 3D."
    );
  }

  if (/(كيف|اشرح|وضح).*(بعد ثالث|3d|التحويل|المستطيل|طوبولوجيا)/.test(ar + lower)) {
    return withAction(
      "الفكرة الأساسية: كل زوج نقاط على المنحنى يتحول إلى نقطة واحدة في 3D: (Mx, My, D).",
      "إذا اصطدمت نقطتان 3D آتيتان من زوجين مختلفين فهذا يعني نفس المنتصف ونفس المسافة، وبالتالي مستطيل في 2D.",
      null,
      "هذا تحويل هندسي إلى صياغة طوبولوجية: التصادم في بعد أعلى يكشف البنية في بعد أقل."
    );
  }

  if (/(فرق|difference|compare).*(circle|figure8|trefoil|دائره|رقم|عقده)/.test(ar + lower)) {
    return withAction(
      "الدائرة غالبًا تعطي تناظرًا أعلى، بينما figure8 وtrefoil يكشفان تقاطعات بنمط أكثر تعقيدًا.",
      "جرّب التبديل بين المنحنيات مع نفس الدقة لمقارنة توزيع نقاط التصادم.",
      null,
      `النتيجة الحالية: ${context.rectanglesCount} مستطيلات على منحنى ${context.curveType}.`
    );
  }

  return withAction(
    `لدينا الآن ${context.rectanglesCount} مستطيلًا مكتشفًا على منحنى ${context.curveType}.`,
    "جرّب: اشرح self-intersection، بدّل إلى trefoil، زد الدقة إلى 100، أو فعّل ملء الشاشة.",
    null,
    "الطوبولوجيا تركز على البنية المستمرة للشكل أثناء التحويلات."
  );
}

export default function TopologyLabRenderer() {
  const mainScrollRef = useRef(null);
  const [state, setState] = useState(() => ({
    curveType: DEFAULT_PRESET,
    curvePoints: getCurveFromPreset(DEFAULT_PRESET, 160),
    resolution: 52,
    showIntersections: true,
    showAllRectangles: false,
    isDrawingMode: false,
    selectedRectIndex: null,
    chatBusy: false,
    showAICards: true,
    isFullscreen: false,
    showTutorial: false,
    tutorialFocus: null,
    aiCards: {
      curve: "AI: اختر مستطيلاً في 2D لمطابقة نقطة التصادم في 3D.",
      surface: "AI: النقاط البرتقالية تمثل تقاطعات ذاتية في فضاء (Mx, My, D)."
    },
    messages: [
      {
        role: "assistant",
        content:
          "🌀 مرحباً بك في Topology Transform Lab! جرّب: \"ارسم عقدة ثلاثية\" أو \"ما معنى self-intersection؟\" أو \"زد الدقة إلى 100\".",
        visual_hint:
          "الفكرة: كل زوج نقاط على المنحنى يتحول إلى نقطة (Mx, My, D) في 3D، والتقاطع الذاتي يطابق مستطيلاً.",
        mathConcept: "الانتقال لبعد أعلى يجعل كشف المستطيل أوضح من البحث المباشر في 2D."
      }
    ]
  }));

  const topologySurface = useMemo(
    () => buildTopologySurface(state.curvePoints, state.resolution),
    [state.curvePoints, state.resolution]
  );

  const collisionTolerance = useMemo(() => {
    const span = Math.max(
      0.6,
      (topologySurface.xRange?.[1] || 0) - (topologySurface.xRange?.[0] || 0),
      (topologySurface.yRange?.[1] || 0) - (topologySurface.yRange?.[0] || 0)
    );
    return Math.max(0.018, Math.min(0.08, span / 120));
  }, [topologySurface.xRange, topologySurface.yRange]);

  const detectedRectangles = useMemo(
    () => detectRectangles(
      topologySurface.rawPoints,
      collisionTolerance,
      state.showAllRectangles ? 2400 : 320
    ),
    [topologySurface.rawPoints, collisionTolerance, state.showAllRectangles]
  );

  const collisionPoints = useMemo(
    () => detectedRectangles.map((rect) => rect.collisionPoint),
    [detectedRectangles]
  );

  useEffect(() => {
    setState((prev) => {
      if (detectedRectangles.length === 0 && prev.selectedRectIndex !== null) {
        return { ...prev, selectedRectIndex: null };
      }
      if (
        detectedRectangles.length > 0 &&
        (prev.selectedRectIndex === null ||
          prev.selectedRectIndex < 0 ||
          prev.selectedRectIndex >= detectedRectangles.length)
      ) {
        return { ...prev, selectedRectIndex: 0 };
      }
      return prev;
    });
  }, [detectedRectangles.length]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    if (!body) return undefined;
    body.classList.toggle("topology-lock-scroll", state.isFullscreen);
    return () => body.classList.remove("topology-lock-scroll");
  }, [state.isFullscreen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setState((prev) => (prev.isFullscreen ? { ...prev, isFullscreen: false } : prev));
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const displayRectangles = useMemo(() => {
    const indexed = detectedRectangles.map((rect, index) => ({ ...rect, _index: index }));
    if (state.showAllRectangles) return indexed;
    const initial = indexed.slice(0, 18);
    if (state.selectedRectIndex === null) return initial;
    const selected = indexed[state.selectedRectIndex];
    if (!selected) return initial;
    if (initial.some((r) => r._index === selected._index)) return initial;
    return [selected, ...initial.slice(0, 17)];
  }, [detectedRectangles, state.selectedRectIndex, state.showAllRectangles]);

  const selectedRectDisplayIndex = useMemo(
    () => displayRectangles.findIndex((r) => r._index === state.selectedRectIndex),
    [displayRectangles, state.selectedRectIndex]
  );

  const selectedRectangle =
    state.selectedRectIndex !== null ? detectedRectangles[state.selectedRectIndex] : null;

  const liveCurveCard = selectedRectangle
    ? `AI: المستطيل المحدد له منتصف (${selectedRectangle.midpoint.x.toFixed(2)}, ${selectedRectangle.midpoint.y.toFixed(2)}).`
    : state.aiCards.curve;
  const liveSurfaceCard = selectedRectangle
    ? `AI: نقطة التصادم الموافقة في 3D هي D=${selectedRectangle.distance.toFixed(2)}.`
    : state.aiCards.surface;

  const scrollToBottom = () => {
    const node = mainScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  };

  const applyAction = (action) => {
    if (!action || typeof action !== "object") return false;
    const type = String(action.type || "").toLowerCase();
    const params = action.params && typeof action.params === "object" ? action.params : {};

    if (type === "change_curve") {
      const preset = String(params.preset || "").toLowerCase();
      if (!PRESET_CURVES[preset]) return false;
      const points = getCurveFromPreset(preset, 160);
      setState((prev) => ({
        ...prev,
        curveType: preset,
        curvePoints: points,
        selectedRectIndex: null,
        isDrawingMode: false
      }));
      return true;
    }

    if (type === "set_resolution") {
      const value = clampResolution(params.value);
      setState((prev) => ({ ...prev, resolution: value }));
      return true;
    }

    if (type === "toggle_collisions" || type === "toggle_intersections") {
      const show = params.show === undefined ? !state.showIntersections : Boolean(params.show);
      setState((prev) => ({ ...prev, showIntersections: show }));
      return true;
    }

    if (type === "highlight_rectangle") {
      const index = Number(params.index);
      if (!Number.isInteger(index) || index < 0 || index >= detectedRectangles.length) return false;
      setState((prev) => ({
        ...prev,
        selectedRectIndex: index,
        showAllRectangles: false
      }));
      return true;
    }

    if (type === "toggle_all_rectangles") {
      const show = params.show === undefined ? !state.showAllRectangles : Boolean(params.show);
      setState((prev) => ({ ...prev, showAllRectangles: show }));
      return true;
    }

    if (type === "toggle_ai_cards") {
      const show = params.show === undefined ? !state.showAICards : Boolean(params.show);
      setState((prev) => ({ ...prev, showAICards: show }));
      return true;
    }

    if (type === "toggle_drawing") {
      const show = params.show === undefined ? !state.isDrawingMode : Boolean(params.show);
      setState((prev) => ({ ...prev, isDrawingMode: show, curveType: "custom" }));
      return true;
    }

    if (type === "clear_curve") {
      setState((prev) => ({
        ...prev,
        curveType: "custom",
        curvePoints: [],
        selectedRectIndex: null
      }));
      return true;
    }

    if (type === "scroll_to_bottom") {
      scrollToBottom();
      return true;
    }

    if (type === "toggle_fullscreen") {
      const show = params.show === undefined ? !state.isFullscreen : Boolean(params.show);
      setState((prev) => ({ ...prev, isFullscreen: show }));
      return true;
    }

    return false;
  };

  const handlePresetChange = (presetId) => {
    if (presetId === "custom") {
      setState((prev) => ({ ...prev, curveType: "custom", isDrawingMode: true }));
      return;
    }
    if (!PRESET_CURVES[presetId]) return;
    const points = getCurveFromPreset(presetId, 160);
    setState((prev) => ({
      ...prev,
      curveType: presetId,
      curvePoints: points,
      selectedRectIndex: null,
      isDrawingMode: false
    }));
  };

  const handleCurveChange = (points) => {
    const prepared = prepareCurvePoints(points, 150);
    setState((prev) => ({
      ...prev,
      curveType: "custom",
      curvePoints: prepared,
      selectedRectIndex: null,
      isDrawingMode: false
    }));
  };

  const pushAICardHint = (assistantMsg) => {
    const candidate = String(assistantMsg?.visual_hint || assistantMsg?.mathConcept || "").trim();
    if (!candidate) return;
    const target = classifyHintTarget(candidate);
    setState((prev) => ({
      ...prev,
      aiCards: {
        ...prev.aiCards,
        [target]: candidate.slice(0, 260)
      }
    }));
  };

  const handleChatMessage = async (text) => {
    const userMsg = { role: "user", content: text };
    setState((prev) => ({ ...prev, messages: [...prev.messages, userMsg], chatBusy: true }));

    const context = {
      curveType: state.curveType,
      rectangles: detectedRectangles.length,
      collisions: collisionPoints.length,
      resolution: state.resolution,
      showIntersections: state.showIntersections,
      showAllRectangles: state.showAllRectangles,
      drawingMode: state.isDrawingMode,
      showAICards: state.showAICards,
      isFullscreen: state.isFullscreen
    };

    try {
      const response = await fetch("http://localhost:3002/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode: "topology_chat",
          context
        })
      });

      if (!response.ok) {
        throw new Error(`Server ${response.status}`);
      }

      const result = await response.json();
      const localHint = fallbackLocalReply(text, {
        curveType: state.curveType,
        rectanglesCount: detectedRectangles.length
      });
      let action = result?.action && typeof result.action === "object"
        ? { ...result.action, label: getActionLabel(result.action) }
        : null;
      if (!action && localHint?.action) action = localHint.action;

      const modelExplanation =
        typeof result?.explanation === "string" && result.explanation.trim()
          ? normalizeMixedSpacing(result.explanation)
          : "";
      const lowConfidenceExplanation =
        /تعذر|غير واضح|could not parse|try a shorter|لم أفهم/i.test(modelExplanation);

      const assistantMsg = {
        role: "assistant",
        content: lowConfidenceExplanation ? localHint.content : (modelExplanation || localHint.content),
        visual_hint:
          (typeof result?.visual_hint === "string" && result.visual_hint.trim()
            ? normalizeMixedSpacing(result.visual_hint)
            : localHint.visual_hint || null),
        mathConcept:
          (typeof result?.mathConcept === "string" && result.mathConcept.trim()
            ? normalizeMixedSpacing(result.mathConcept)
            : localHint.mathConcept || null),
        action
      };

      setState((prev) => ({
        ...prev,
        chatBusy: false,
        messages: [...prev.messages, assistantMsg]
      }));
      pushAICardHint(assistantMsg);
      if (action) applyAction(action);
    } catch {
      const fallback = fallbackLocalReply(text, {
        curveType: state.curveType,
        rectanglesCount: detectedRectangles.length
      });
      setState((prev) => ({
        ...prev,
        chatBusy: false,
        messages: [...prev.messages, fallback]
      }));
      pushAICardHint(fallback);
      if (fallback.action) applyAction(fallback.action);
    }
  };

  const stats = {
    curvePointsCount: state.curvePoints.length,
    surfacePointsCount: topologySurface.rawPoints.length,
    rectanglesCount: detectedRectangles.length
  };

  return (
    <div className={`topology-lab ${state.isFullscreen ? "is-fullscreen" : ""}`}>
      <div className="topology-header">
        <div>
          <h2>Topology Transform Lab: Inscribed Rectangle</h2>
          <p>2D curve pairs are lifted into 3D topology space as (Mx, My, D).</p>
        </div>
        <div className="topology-header-actions">
          <button
            type="button"
            className="topology-small-btn"
            onClick={() => setState((prev) => ({ ...prev, isFullscreen: !prev.isFullscreen }))}
          >
            {state.isFullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
          </button>
          <button
            type="button"
            className="topology-small-btn"
            onClick={() => setState((prev) => ({ ...prev, showTutorial: true }))}
          >
            عرض تعريفي
          </button>
          <button
            type="button"
            className="topology-small-btn"
            onClick={() => setState((prev) => ({ ...prev, showAICards: !prev.showAICards }))}
          >
            {state.showAICards ? "إخفاء بطاقات AI" : "إظهار بطاقات AI"}
          </button>
          <div className="topology-header-badge">2D to 3D collision mapping</div>
        </div>
      </div>

      <div className="topology-main is-compact" ref={mainScrollRef}>

        <SplitView
          leftClassName={state.tutorialFocus === "curve" ? "topology-pane-highlight" : ""}
          rightClassName={state.tutorialFocus === "surface" ? "topology-pane-highlight" : ""}
          left={
            <>
              <div className="topology-pane-header">
                <h3>2D Curve and Inscribed Rectangles</h3>
                <span>
                  {detectedRectangles.length > 0
                    ? `${detectedRectangles.length} rectangles detected`
                    : "Searching for rectangle collisions..."}
                </span>
              </div>
              <div className="topology-pane-body">
                <CurveCanvas2D
                  curvePoints={state.curvePoints}
                  rectangles={displayRectangles}
                  selectedRectIndex={selectedRectDisplayIndex >= 0 ? selectedRectDisplayIndex : null}
                  drawingEnabled={state.isDrawingMode}
                  onCurveChange={handleCurveChange}
                  onSelectRectangle={(displayIndex) => {
                    const sourceIndex = displayRectangles[displayIndex]?._index;
                    if (Number.isInteger(sourceIndex)) {
                      setState((prev) => ({ ...prev, selectedRectIndex: sourceIndex }));
                    }
                  }}
                />
                {state.showAICards && (
                  <div className="topology-ai-card topology-ai-card-curve">
                    <h5>AI Tip • 2D</h5>
                    <p>{renderMixedText(liveCurveCard)}</p>
                  </div>
                )}
              </div>
            </>
          }
          right={
            <>
              <div className="topology-pane-header">
                <h3>3D Topology Surface</h3>
                <span>Self-intersection points correspond to rectangles</span>
              </div>
              <div className="topology-pane-body">
                <SurfaceView3D
                  surface={topologySurface}
                  collisions={collisionPoints}
                  highlighted={state.selectedRectIndex}
                  showIntersections={state.showIntersections}
                  onSelectCollision={(index) => {
                    if (Number.isInteger(index)) {
                      setState((prev) => ({ ...prev, selectedRectIndex: index }));
                    }
                  }}
                />
                {state.showAICards && (
                  <div className="topology-ai-card topology-ai-card-surface">
                    <h5>AI Tip • 3D</h5>
                    <p>{renderMixedText(liveSurfaceCard)}</p>
                  </div>
                )}
              </div>
            </>
          }
        />

        <CurveControls
          state={state}
          presets={PRESET_CURVES}
          stats={stats}
          onPresetChange={handlePresetChange}
          onToggleDrawing={() =>
            setState((prev) => ({ ...prev, isDrawingMode: !prev.isDrawingMode, curveType: "custom" }))
          }
          onClearCurve={() =>
            setState((prev) => ({
              ...prev,
              curveType: "custom",
              curvePoints: [],
              selectedRectIndex: null
            }))
          }
          onResolutionChange={(value) =>
            setState((prev) => ({ ...prev, resolution: clampResolution(value) }))
          }
          onToggleIntersections={(show) => setState((prev) => ({ ...prev, showIntersections: show }))}
          onToggleAllRectangles={(show) => setState((prev) => ({ ...prev, showAllRectangles: show }))}
        />

        {selectedRectangle && (
          <div className="topology-selection-inline">
            Selected midpoint ({selectedRectangle.midpoint.x.toFixed(2)}, {selectedRectangle.midpoint.y.toFixed(2)})
            , distance {selectedRectangle.distance.toFixed(2)}
          </div>
        )}
      </div>

      <aside className="topology-chat-shell">
        <TopologyChat
          messages={state.messages}
          onSendMessage={handleChatMessage}
          onQuickAction={applyAction}
          isBusy={state.chatBusy}
        />
      </aside>

      {state.showTutorial && (
        <TutorialMode
          onClose={() => setState((prev) => ({ ...prev, showTutorial: false, tutorialFocus: null }))}
          onStepChange={(stepState) => {
            if (!stepState) {
              setState((prev) => ({ ...prev, tutorialFocus: null }));
              return;
            }
            setState((prev) => ({
              ...prev,
              tutorialFocus: stepState.focus || null
            }));
            if (stepState.preset && PRESET_CURVES[stepState.preset]) {
              handlePresetChange(stepState.preset);
            }
            if (stepState.surfaceHint || stepState.curveHint) {
              setState((prev) => ({
                ...prev,
                aiCards: {
                  curve: stepState.curveHint || prev.aiCards.curve,
                  surface: stepState.surfaceHint || prev.aiCards.surface
                }
              }));
            }
          }}
        />
      )}
    </div>
  );
}
