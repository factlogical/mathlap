# شرح هيكل المشروع وآلية العمل

هذا الملف يلخص بنية مشروع **Math Agent Demo** وكيفية تدفق البيانات من طلب المستخدم إلى الرسم التفاعلي.

---

## 1) الفكرة العامة
التطبيق عبارة عن واجهة React تعرض مختبرات ورسومات رياضية تفاعلية.  
المستخدم يكتب طلبًا رياضيًا، والخادم يحوله إلى JSON دلالي، ثم الواجهة تختار الـ Renderer المناسب وتعرض الرسم.

---

## 2) نظرة معمارية سريعة
**Frontend (React + Vite)**
- نقطة الدخول: `src/main.jsx` ⟶ `src/App.jsx`
- الواجهات: `Home`, `ChatAgent`, `MathLab`, `NeuralPlayground`
- التوجيه داخلي عبر حالة `activeView` داخل `App.jsx`

**Backend (Express)**
- الملف الأساسي: `server/index.js`
- نقطة الخدمة: `POST /api/interpret`
- يعتمد على OpenAI (النموذج الافتراضي: `gpt-4o`)
- يرجع JSON يتم التحقق منه عبر Zod في `server/schema.js`

---

## 3) تدفق البيانات (من الطلب للرسم)
1. المستخدم يكتب الطلب في واجهة **ChatAgent**.
2. `src/agent/interpret.js` يرسل الطلب إلى `http://localhost:3002/api/interpret`.
3. الخادم يبني Prompt مناسب ثم يطلب من OpenAI JSON فقط.
4. الخادم يتحقق من JSON ويعيده كـ `{ success: true, json: ... }`.
5. الواجهة تمرر JSON إلى `SceneRouter`.
6. `SceneRouter` يحدد الـ Renderer المناسب.
7. `RenderDispatcher` يقرأ `math.kind` ويوجه إلى Renderer مختص.

---

## 4) هيكل المجلدات الأساسي
**الجذر**
- `src/` واجهة React كاملة
- `server/` خادم Express + OpenAI
- `public/` ملفات ثابتة
- `PROJECT_HANDOFF.md` و `PROJECT_LOGIC.md` وثائق سابقة

**داخل `src/`**
- `App.jsx` منطق التبديل بين الـ Views
- `agent/interpret.js` عميل API للـ backend
- `renderers/` محركات الرسم (Plotly, Canvas, SVG)
- `lab/` واجهة الـ Labs
- `components/` عناصر UI مشتركة + `SafePlot`
- `pages/` صفحات رئيسية (Chat, Home, Neural)
- `utils/` أدوات مساعدة (مثل أوامر epsilon/delta)

---

## 5) نظام الـ Renderers
**المسار الأساسي**
- `SceneRouter` يقرأ `spec.scene` ويختار الـ Renderer.
- `RenderDispatcher` يقرأ `spec.math.kind`.

**أهم الـ Renderers**
- `ScalarPlotRenderer.jsx`
  - يحسب الدوال والسطوح باستخدام `mathjs`
  - يرسم عبر Plotly مع أدوات تحكم مخصصة
- `VectorPlotRenderer.jsx`
  - يرسم المتجهات 2D/3D
  - يدعم Head-to-Tail و Resultant و Labels
- `Geometry3DRenderer.jsx`, `Regression3DRenderer.jsx`, `Function2DRenderer.jsx`, `Derivative2DRenderer.jsx`
  - Renderers مخصصة أو Legacy

**مكوّن مساعد مهم**
- `SafePlot.jsx` يغلف Plotly لتجنب أخطاء بسبب قيم `layout` غير معرفة.

---

## 6) المختبرات (MathLab)
- **Linear Studio**: تحويلات خطية باستخدام SVG (`LinearStudioSVG.jsx`).
- **4D Viewer**: استكشاف Hypercube (`HypercubeRenderer.jsx`).
- **Animation Lab**: توليد DSL للرسوم المتحركة عبر الذكاء الاصطناعي (`AnimationLabRenderer.jsx`).
- **Manifold Lab**: استكشاف أسطح متعددة (`ManifoldRenderer.jsx`).
- **Epsilon-Delta Lab**: مختبر تعريف النهاية بتفاعل Canvas + دردشة (`EpsilonDeltaRenderer.jsx`).

---

## 7) واجهة Chat Agent
- الصفحة: `src/pages/ChatAgent.jsx`.
- تعرض الرسم في لوحة يسار + المحادثة والتحليل في لوحة يمين.
- عند كون `math.kind` متجهات تظهر أدوات تحكم خاصة بالمتجهات.
- تبويب **Analysis** يحسب الزوايا والضرب النقطي للمُتجهات.

---

## 8) الخادم (server/)
- نقطة الصحة: `GET /api/health`.
- نقطة التفسير: `POST /api/interpret`.
- يدعم أوضاع مخصصة:
  - `chat` (افتراضي) لرسم الـ JSON الدلالي العام.
  - `lab_animation` لتوليد DSL للرسوم المتحركة.
  - `lab_chat` لدردشة Epsilon-Delta مع ردود وأوامر.
- التحقق يتم عبر `server/schema.js` باستخدام Zod.

---

## 9) شكل الـ JSON المتوقع (مختصر)
**مثال لرسمة عامة (generic_plot):**
```json
{
  "scene": "generic_plot",
  "math": {
    "kind": "scalar_field",
    "expression": "x^2 + y^2",
    "variables": ["x", "y"]
  },
  "transform": { "op": "none" },
  "view": { "type": "heatmap", "dimension": "2D" },
  "domain": { "x": [-5, 5], "y": [-5, 5], "resolution": 100 }
}
```

**ملاحظة مهمة**
- `server/schema.js` يعرف `scene`, `mode`, `spec` لكنه يستخدم `.passthrough()` فيسمح بمرور حقول إضافية مثل `math` و `view`.
- الواجهة تقرأ البيانات من `spec.payload` أو `spec.params` أو من الجذر مباشرة، لذلك الصيغتين تعملان.

---

## 10) تشغيل المشروع محليًا
**الخادم**
```powershell
cd server
node index.js
```
يتطلب وجود متغير بيئة `OPENAI_API_KEY` داخل `server/.env`.  
المنفذ الافتراضي: `3002`.

**الواجهة**
```powershell
npm run dev
```
واجهة Vite تعمل افتراضيًا على `http://localhost:5173`.

---

## 11) ملاحظات وتباينات مهمة
- `PROJECT_HANDOFF.md` يذكر Gemini و`/api/chat`، بينما الكود الحالي يستخدم OpenAI و`/api/interpret`.
- مكتبة `src/scenes/` موجودة لكنها ليست المسار الرئيسي للتوجيه حاليًا.
- يوجد `GenericPlotRenderer.jsx` لكنه غير مستخدم مباشرة في `SceneRouter`.

