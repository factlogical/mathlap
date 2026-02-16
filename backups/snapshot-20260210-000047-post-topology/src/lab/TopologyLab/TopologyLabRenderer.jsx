import React, { useEffect, useMemo, useState } from "react";
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

function normalizeArabic(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function getCurveFromPreset(id, resolution = 150) {
  const preset = PRESET_CURVES[id];
  if (!preset) return [];
  return prepareCurvePoints(preset.generate(resolution), resolution);
}

function buildLocalReply(text, context) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  const ar = normalizeArabic(raw);

  const withAction = (content, visual_hint, action = null) => ({
    role: "assistant",
    content,
    visual_hint,
    action
  });

  if (/circle|دائره|دائرة/.test(lower + ar)) {
    return withAction(
      "الدائرة تعطي عددًا كبيرًا من المستطيلات لأن أزواجًا كثيرة تشترك في نفس المنتصف ونفس الطول.",
      "لاحظ نقاط التصادم البرتقالية في نافذة 3D؛ كل نقطة تمثل مستطيلاً على المنحنى.",
      {
        type: "change_curve",
        params: { preset: "circle" },
        label: "Load circle"
      }
    );
  }

  if (/ellipse|قطع ناقص/.test(lower + ar)) {
    return withAction(
      "القطع الناقص أيضًا يحتوي مستطيلات، لكن توزيعها يختلف عن الدائرة بسبب اختلاف المحورين.",
      "راقب شكل السطح 3D وكيف تتغير أماكن التصادم عند الانتقال من الدائرة للقطع الناقص.",
      {
        type: "change_curve",
        params: { preset: "ellipse" },
        label: "Load ellipse"
      }
    );
  }

  if (/trefoil|عقد/.test(lower + ar)) {
    return withAction(
      "المنحنى المركب يجعل سطح الطوبولوجيا أكثر تعقيدًا ويُظهر تقاطعات ذاتية أغنى.",
      "جرّب تدوير السطح لرؤية نقاط التصادم المخفية.",
      {
        type: "change_curve",
        params: { preset: "trefoil" },
        label: "Load trefoil"
      }
    );
  }

  if (/squircle|مربع/.test(lower + ar)) {
    return withAction(
      "منحنى squircle يجمع خصائص الدائرة والمربع، لذلك يعطي توزيعًا وسيطًا للتصادمات.",
      "في 2D راقب المستطيلات القريبة من الأركان الأكثر انحناءً.",
      {
        type: "change_curve",
        params: { preset: "squircle" },
        label: "Load squircle"
      }
    );
  }

  if (/منتصف|midpoint|مساف|distance/.test(lower + ar)) {
    return withAction(
      "لكل زوج نقطتين نحسب: (Mx, My, D). إذا زوجان مختلفان أعطيا نفس الثلاثي، فالرؤوس الأربعة تشكل مستطيلاً.",
      "اختر أي مستطيل في 2D ثم قارن نقطة التصادم المقابلة له في 3D.",
      context.rectanglesCount > 0
        ? {
            type: "highlight_rectangle",
            params: { index: 0 },
            label: "Highlight first rectangle"
          }
        : null
    );
  }

  if (/تقاطع|collision|self|intersection/.test(lower + ar)) {
    return withAction(
      "التقاطع الذاتي للسطح في فضاء (Mx, My, D) يعني أن زوجين مختلفين يملكان نفس المنتصف والطول، وهذا يثبت وجود مستطيل.",
      "كل Marker برتقالي في 3D هو ترجمة مباشرة لمستطيل في المنحنى 2D."
    );
  }

  if (/اوقف|وقف|stop|freeze/.test(lower + ar) && /دور|spin|rotate/.test(lower + ar)) {
    return withAction(
      "تم إيقاف تدوير السطح.",
      "يمكنك تدوير المشهد يدويًا بالماوس.",
      {
        type: "rotate_surface",
        params: { speed: "off" },
        label: "Stop rotation"
      }
    );
  }

  if (/دور|rotate|spin/.test(lower + ar)) {
    return withAction(
      "تم تفعيل تدوير السطح لعرض التقاطعات من زوايا مختلفة.",
      "راقب كيف تظهر نقاط تصادم كانت مخفية خلف السطح.",
      {
        type: "rotate_surface",
        params: { speed: "slow" },
        label: "Rotate surface"
      }
    );
  }

  if (/(اخف|hide).*(تقاطع|intersection)/.test(lower + ar)) {
    return withAction(
      "تم إخفاء نقاط التقاطع.",
      "يمكنك إظهارها مرة أخرى للمقارنة.",
      {
        type: "toggle_intersections",
        params: { show: false },
        label: "Hide collisions"
      }
    );
  }

  if (/(اظهر|show).*(تقاطع|intersection)/.test(lower + ar)) {
    return withAction(
      "تم إظهار نقاط التقاطع.",
      "كل نقطة تمثل مستطيلاً مكتشفًا.",
      {
        type: "toggle_intersections",
        params: { show: true },
        label: "Show collisions"
      }
    );
  }

  if (/كل.*مستطيل|all rectangles/.test(lower + ar)) {
    return withAction(
      "سأعرض جميع المستطيلات المكتشفة على منحنى 2D.",
      "إذا أصبح الرسم مزدحمًا يمكنك الرجوع لوضع التحديد الفردي.",
      {
        type: "toggle_all_rectangles",
        params: { show: true },
        label: "Show all rectangles"
      }
    );
  }

  if (/اول مستطيل|first rectangle|highlight/.test(lower + ar) && context.rectanglesCount > 0) {
    return withAction(
      "تم اختيار أول مستطيل مكتشف وربطه مع نقطة التصادم المقابلة في 3D.",
      "تتبع نفس اللون في النافذتين.",
      {
        type: "highlight_rectangle",
        params: { index: 0 },
        label: "Highlight rectangle #1"
      }
    );
  }

  return withAction(
    `تم تحليل المنحنى الحالي: ${context.curvePointsCount} نقطة، ووجدنا ${context.rectanglesCount} مستطيلًا.`,
    "جرّب: دائرة، قطع ناقص، تدوير السطح، أو شرح معنى midpoint والمسافة."
  );
}

export default function TopologyLabRenderer() {
  const [state, setState] = useState(() => ({
    curveType: DEFAULT_PRESET,
    curvePoints: getCurveFromPreset(DEFAULT_PRESET, 150),
    resolution: 48,
    showIntersections: true,
    showAllRectangles: false,
    animateSurface: true,
    isDrawingMode: false,
    selectedRectIndex: null,
    messages: [
      {
        role: "assistant",
        content:
          "Topology Transform Lab جاهز. اكتب: دائرة، قطع ناقص، كيف يساعد البعد الثالث؟",
        visual_hint:
          "الفكرة: كل زوج نقاط على المنحنى يتحول إلى نقطة (Mx, My, D) في 3D."
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
    return Math.max(0.02, Math.min(0.08, span / 120));
  }, [topologySurface.xRange, topologySurface.yRange]);

  const detectedRectangles = useMemo(
    () => detectRectangles(topologySurface.rawPoints, collisionTolerance, 220),
    [topologySurface.rawPoints, collisionTolerance]
  );

  useEffect(() => {
    setState((prev) => {
      if (detectedRectangles.length === 0) {
        if (prev.selectedRectIndex === null) return prev;
        return { ...prev, selectedRectIndex: null };
      }

      if (
        prev.selectedRectIndex === null ||
        prev.selectedRectIndex < 0 ||
        prev.selectedRectIndex >= detectedRectangles.length
      ) {
        return { ...prev, selectedRectIndex: 0 };
      }

      return prev;
    });
  }, [detectedRectangles.length]);

  const displayRectangles = useMemo(() => {
    const indexed = detectedRectangles.map((rect, index) => ({ ...rect, _index: index }));
    if (state.showAllRectangles) return indexed.slice(0, 140);
    const initial = indexed.slice(0, 16);
    if (state.selectedRectIndex === null) return initial;
    const selected = indexed[state.selectedRectIndex];
    if (!selected) return initial;
    if (initial.some((r) => r._index === selected._index)) return initial;
    return [selected, ...initial.slice(0, 15)];
  }, [detectedRectangles, state.selectedRectIndex, state.showAllRectangles]);

  const selectedRectDisplayIndex = useMemo(
    () => displayRectangles.findIndex((r) => r._index === state.selectedRectIndex),
    [displayRectangles, state.selectedRectIndex]
  );

  const selectedRectangle =
    state.selectedRectIndex !== null ? detectedRectangles[state.selectedRectIndex] : null;

  const collisionPoints = useMemo(
    () => detectedRectangles.map((rect) => rect.collisionPoint),
    [detectedRectangles]
  );

  const applyAction = (action) => {
    if (!action || typeof action !== "object") return false;
    const type = String(action.type || "").toLowerCase();
    const params = action.params && typeof action.params === "object" ? action.params : {};

    if (type === "change_curve") {
      const preset = String(params.preset || "").toLowerCase();
      if (!PRESET_CURVES[preset]) return false;
      const points = getCurveFromPreset(preset, 150);
      setState((prev) => ({
        ...prev,
        curveType: preset,
        curvePoints: points,
        selectedRectIndex: null,
        isDrawingMode: false
      }));
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

    if (type === "rotate_surface") {
      const speed = String(params.speed || "").toLowerCase();
      const shouldRotate = speed !== "off";
      setState((prev) => ({ ...prev, animateSurface: shouldRotate }));
      return true;
    }

    if (type === "toggle_intersections") {
      const show = Boolean(params.show);
      setState((prev) => ({ ...prev, showIntersections: show }));
      return true;
    }

    if (type === "toggle_all_rectangles") {
      const show = Boolean(params.show);
      setState((prev) => ({ ...prev, showAllRectangles: show }));
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
    const points = getCurveFromPreset(presetId, 150);
    setState((prev) => ({
      ...prev,
      curveType: presetId,
      curvePoints: points,
      selectedRectIndex: null,
      isDrawingMode: false
    }));
  };

  const handleCurveChange = (points) => {
    const prepared = prepareCurvePoints(points, 140);
    setState((prev) => ({
      ...prev,
      curveType: "custom",
      curvePoints: prepared,
      selectedRectIndex: null,
      isDrawingMode: false
    }));
  };

  const handleChatMessage = async (text) => {
    const userMsg = { role: "user", content: text };
    setState((prev) => ({ ...prev, messages: [...prev.messages, userMsg] }));

    const response = buildLocalReply(text, {
      curvePointsCount: state.curvePoints.length,
      surfacePointsCount: topologySurface.rawPoints.length,
      rectanglesCount: detectedRectangles.length
    });

    setState((prev) => ({ ...prev, messages: [...prev.messages, response] }));
    if (response.action) {
      applyAction(response.action);
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
        <div className="topology-header-badge">2D to 3D collision mapping</div>
      </div>

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
                animateSurface={state.animateSurface}
                onSelectCollision={(index) => {
                  if (Number.isInteger(index)) {
                    setState((prev) => ({ ...prev, selectedRectIndex: index }));
                  }
                }}
              />
            </div>
          </>
        }
      />

      <div className="topology-bottom-panel">
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
            setState((prev) => ({ ...prev, resolution: Math.max(20, Math.min(100, value)) }))
          }
          onToggleIntersections={(show) => setState((prev) => ({ ...prev, showIntersections: show }))}
          onToggleAllRectangles={(show) => setState((prev) => ({ ...prev, showAllRectangles: show }))}
          onToggleAnimateSurface={(show) => setState((prev) => ({ ...prev, animateSurface: show }))}
        />

        <TopologyChat
          messages={state.messages}
          onSendMessage={handleChatMessage}
          onQuickAction={applyAction}
          isBusy={false}
        />
      </div>

      {selectedRectangle && (
        <div className="topology-header-badge">
          Selected: midpoint ({selectedRectangle.midpoint.x.toFixed(2)}, {selectedRectangle.midpoint.y.toFixed(2)})
          , distance {selectedRectangle.distance.toFixed(2)}
        </div>
      )}
    </div>
  );
}

