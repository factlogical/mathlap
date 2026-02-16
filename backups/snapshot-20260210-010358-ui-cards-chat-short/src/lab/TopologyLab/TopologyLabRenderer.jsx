import React, { useEffect, useMemo, useRef, useState } from "react";
import SplitView from "./components/SplitView";
import CurveCanvas2D from "./components/CurveCanvas2D";
import SurfaceView3D from "./components/SurfaceView3D";
import TopologyChat from "./components/TopologyChat";
import CurveControls from "./components/CurveControls";
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
  if (type === "toggle_info_panel") return "إظهار/إخفاء الشرح";
  if (type === "toggle_ai_cards") return "إظهار/إخفاء بطاقات AI";
  if (type === "toggle_drawing") return "تبديل الرسم الحر";
  if (type === "clear_curve") return "مسح المنحنى";
  if (type === "scroll_to_bottom") return "إنزال الصفحة";
  return "تطبيق";
}

function fallbackLocalReply(text, context) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  const ar = normalizeArabic(raw);

  const withAction = (content, visualHint, action = null, mathConcept = null) => ({
    role: "assistant",
    content,
    visual_hint: visualHint,
    mathConcept,
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

  if (/(انزل|انزال|scroll|down)/.test(ar + lower)) {
    return withAction(
      "تم تجهيز إنزال الصفحة إلى الجزء السفلي من المختبر.",
      "سيتم التركيز على الأدوات والشات في الأسفل.",
      { type: "scroll_to_bottom", params: {} }
    );
  }

  if (/(اخف|اخفاء|hide).*(شرح|ماذا يحدث|info|panel)/.test(ar + lower)) {
    return withAction(
      "تم إخفاء بطاقة الشرح.",
      "يمكنك إظهارها مرة أخرى متى أردت.",
      { type: "toggle_info_panel", params: { show: false } }
    );
  }

  if (/(اظهر|show).*(شرح|ماذا يحدث|info|panel)/.test(ar + lower)) {
    return withAction(
      "تم إظهار بطاقة الشرح.",
      "ستجد فيها ملخص الفكرة الطوبولوجية.",
      { type: "toggle_info_panel", params: { show: true } }
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
      "التقاطع الذاتي في فضاء (Mx, My, D) يعني وجود زوجين مختلفين لهما نفس المنتصف والطول، وهذا يكافئ مستطيلاً على المنحنى.",
      "ابحث عن النقاط البرتقالية في 3D ثم قارن المستطيل المقابل في 2D.",
      null,
      "هذه إعادة صياغة طوبولوجية للمشكلة الهندسية في بعد أعلى."
    );
  }

  return withAction(
    `لدينا الآن ${context.rectanglesCount} مستطيلًا مكتشفًا على منحنى ${context.curveType}.`,
    "جرّب: ارسم عقدة ثلاثية، ما معنى self-intersection، زد الدقة إلى 100.",
    null,
    "الطوبولوجيا تركز على البنية المستمرة للشكل أثناء التحويلات."
  );
}

export default function TopologyLabRenderer() {
  const bottomPanelRef = useRef(null);
  const [state, setState] = useState(() => ({
    curveType: DEFAULT_PRESET,
    curvePoints: getCurveFromPreset(DEFAULT_PRESET, 160),
    resolution: 52,
    showIntersections: true,
    showAllRectangles: false,
    isDrawingMode: false,
    selectedRectIndex: null,
    chatBusy: false,
    showInfoPanel: true,
    showAICards: true,
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
    () => detectRectangles(topologySurface.rawPoints, collisionTolerance, 260),
    [topologySurface.rawPoints, collisionTolerance]
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

  const displayRectangles = useMemo(() => {
    const indexed = detectedRectangles.map((rect, index) => ({ ...rect, _index: index }));
    if (state.showAllRectangles) return indexed.slice(0, 180);
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
    bottomPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const show = Boolean(params.show);
      setState((prev) => ({ ...prev, showAllRectangles: show }));
      return true;
    }

    if (type === "toggle_info_panel") {
      const show = params.show === undefined ? !state.showInfoPanel : Boolean(params.show);
      setState((prev) => ({ ...prev, showInfoPanel: show }));
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
      showInfoPanel: state.showInfoPanel,
      showAICards: state.showAICards
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
      const action = result?.action && typeof result.action === "object"
        ? { ...result.action, label: getActionLabel(result.action) }
        : null;
      const assistantMsg = {
        role: "assistant",
        content:
          typeof result?.explanation === "string" && result.explanation.trim()
            ? result.explanation
            : "تعذر تحليل الطلب بدقة. جرّب صياغة أقصر.",
        visual_hint: typeof result?.visual_hint === "string" ? result.visual_hint : null,
        mathConcept: typeof result?.mathConcept === "string" ? result.mathConcept : null,
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
    <div className="topology-lab">
      <div className="topology-header">
        <div>
          <h2>Topology Transform Lab: Inscribed Rectangle</h2>
          <p>2D curve pairs are lifted into 3D topology space as (Mx, My, D).</p>
        </div>
        <div className="topology-header-actions">
          <button type="button" className="topology-small-btn" onClick={scrollToBottom}>
            ⬇ إنزال الصفحة
          </button>
          <button
            type="button"
            className="topology-small-btn"
            onClick={() => setState((prev) => ({ ...prev, showInfoPanel: !prev.showInfoPanel }))}
          >
            {state.showInfoPanel ? "إخفاء الشرح" : "إظهار الشرح"}
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

      {state.showInfoPanel && (
        <div className="topology-info-panel">
          <button
            type="button"
            className="topology-info-close"
            onClick={() => setState((prev) => ({ ...prev, showInfoPanel: false }))}
            title="إخفاء البطاقة"
          >
            ✕
          </button>
          <h4>💡 ماذا يحدث هنا؟</h4>
          <ul>
            <li><strong>المنحنى 2D:</strong> نحلل أزواج نقاط على المنحنى المغلق.</li>
            <li><strong>التحويل 3D:</strong> كل زوج يصبح نقطة (Mx, My, D).</li>
            <li><strong>التقاطعات الذاتية:</strong> النقاط البرتقالية تمثل مستطيلات مكتشفة.</li>
            <li><strong>الفكرة الطوبولوجية:</strong> بعد أعلى يجعل البنية أوضح من البحث المباشر.</li>
          </ul>
        </div>
      )}

      <SplitView
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
                  <p>{liveCurveCard}</p>
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
                  <p>{liveSurfaceCard}</p>
                </div>
              )}
            </div>
          </>
        }
      />

      <div className="topology-bottom-panel" ref={bottomPanelRef}>
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

        <TopologyChat
          messages={state.messages}
          onSendMessage={handleChatMessage}
          onQuickAction={applyAction}
          isBusy={state.chatBusy}
        />
      </div>

      {selectedRectangle && (
        <div className="topology-header-badge topology-selection-badge">
          Selected midpoint ({selectedRectangle.midpoint.x.toFixed(2)}, {selectedRectangle.midpoint.y.toFixed(2)})
          , distance {selectedRectangle.distance.toFixed(2)}
        </div>
      )}
    </div>
  );
}

