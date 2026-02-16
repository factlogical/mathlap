# PROJECT_DOCUMENTATION.md

توثيق موحّد للمشروع (Single Source of Truth)
آخر تحديث: 2026-02-16

---

## 1) نظرة عامة
`Math Agent Demo` منصة تعليمية تفاعلية تجمع بين:
- تفسير الطلبات الرياضية بالنص (عربي/إنجليزي).
- تحويل الطلب إلى مواصفات رسم JSON.
- عرض النتائج عبر Renderers متخصصة (Plotly / Canvas / SVG).
- مختبرات تعليمية متقدمة في الرياضيات وعلوم الحاسوب والفيزياء.

---

## 2) المكدس التقني
- Frontend: `React 19` + `Vite`
- Backend: `Express` + `OpenAI SDK`
- Validation: `zod`
- Visualization: `plotly.js`, `Canvas API`, `SVG`, `recharts`

---

## 3) هيكل المشروع
```text
math-agent-demo/
├─ src/
│  ├─ App.jsx
│  ├─ main.jsx
│  ├─ agent/                 # interpret client
│  ├─ config/                # API base + shared config
│  ├─ context/               # UI settings/context
│  ├─ components/            # shared UI components
│  ├─ pages/                 # Home / Chat / Labs containers
│  ├─ renderers/             # SceneRouter + Dispatcher + Renderers
│  │  └─ lab/                # animation / epsilon-delta / manifold / ...
│  └─ lab/                   # lab implementations (Activation, NEAT, ...)
├─ server/
│  ├─ index.js               # API + OpenAI orchestration + security middleware
│  ├─ schema.js              # spec validation + normalization
│  └─ .env.example
├─ .env.example
└─ PROJECT_DOCUMENTATION.md
```

---

## 4) تدفق العمل (End-to-End)
1. المستخدم يرسل طلبًا من واجهة الشات.
2. `src/agent/interpret.js` يستدعي `POST /api/interpret`.
3. `server/index.js` يبني prompt حسب `mode` ويرسل إلى OpenAI.
4. الخادم يعيد JSON منظم بعد التطبيع/التحقق.
5. الواجهة تستقبل spec وتوجّهها إلى `SceneRouter`.
6. `RenderDispatcher` يختار renderer حسب `math.kind`.
7. الرسم يظهر تفاعليًا، مع إمكانية تعديل الإعدادات أو إعادة التنفيذ.

---

## 5) طبقة الواجهة (Frontend)
### App State الأساسية في `src/App.jsx`
- `activeView`: الصفحة الحالية (`home`, `chat`, `lab`, `neural`, `physics`).
- `spec`: آخر مواصفة رسم مستلمة.
- `history`: سجل طلبات المستخدم (LocalStorage).
- `isOnline`: حالة الاتصال.
- `loading`, `apiError`, `chatMessages`.

### سلوك مهم
- lazy loading للمختبرات الثقيلة.
- `LabErrorBoundary` لمنع سقوط التطبيق بالكامل إذا مختبر واحد فشل.
- Offline banner: المختبرات المحلية تعمل، والشات يتوقف بدون إنترنت.

---

## 6) طبقة الخادم (Backend)
### Endpoints
- `GET /api/health`
- `POST /api/interpret`

### حماية وأمان
- Rate limiting على `/api/` عبر `express-rate-limit`.
- CORS مقيد (Origins من env).
- حد لطول الـ prompt وحد أقصى للـ tokens.
- headers أمان أساسية (`X-Frame-Options`, `nosniff`, `Referrer-Policy`).

### متطلبات تشغيل حرجة
- يجب توفر `OPENAI_API_KEY`.
- في الإنتاج: يجب ضبط `CORS_ORIGINS` وإلا يتوقف الخادم.

---

## 7) Routing و Renderers
- `SceneRouter.jsx`: يحدد renderer حسب `scene`.
- `RenderDispatcher.jsx`: يحدد renderer حسب `math.kind`.

### Renderers رئيسية
- `ScalarPlotRenderer.jsx`: دوال وحقول قياسية 2D/3D.
- `VectorPlotRenderer.jsx`: متجهات وعمليات متجهية.
- Renderers مختبرات في `src/renderers/lab/` مثل:
  - `AnimationLabRenderer.jsx`
  - `EpsilonDeltaRenderer.jsx`
  - `HypercubeRenderer.jsx`
  - `LinearStudioSVG.jsx`
  - `ManifoldRenderer.jsx`

---

## 8) المختبرات الأساسية
### Math Lab
- Derivative Studio
- Epsilon-Delta Lab
- Fourier Lab
- Topology Lab
- Regression Lab
- Activation Lab

### Computer Science Lab
- Neural Playground
- NEAT Evolution Lab (`src/lab/NEATLab`)

### Physics Lab
- تجارب مرتبطة بتحليل الإشارات/الموجات حسب إعدادات المشروع الحالية.

---

## 9) NEAT Lab (ملخص معماري)
داخل `src/lab/NEATLab/`:
- `core/`: `NEATEngine`, `Genome`, `Species`, `neat.worker.js`.
- `environments/`: بيئة Flappy للتقييم والتطور.
- `components/`: المجتمع، الجينوم، البيئة، الإحصائيات، الإعدادات، الهيدر.
- `NEATLabRenderer.jsx`: الحاوي الرئيسي وربط الـ Worker بالحالة.

### منطق التشغيل
- التطور يعمل في Web Worker لتجنب تجميد الواجهة.
- snapshots دورية تنتقل للواجهة للتحديث.
- الواجهة تعرض population + best genome + dashboard.

---

## 10) متغيرات البيئة
### Frontend
- `VITE_API_URL`

### Backend
- `OPENAI_API_KEY`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `MAX_PROMPT_CHARS`
- `MAX_TOKENS`

---

## 11) التشغيل المحلي
### Frontend
```powershell
npm install
npm run dev
```

### Backend
```powershell
cd server
npm install
npm start
```

---

## 12) فحص سريع بعد التشغيل
1. `GET /api/health` يجب أن يرجع `ok: true`.
2. من الشات: `Plot sin(x)`.
3. من الشات: `Visualize vectors v=(1,2) and w=(-1,3)`.
4. اختبار Offline: فصل النت والتأكد من رسالة الشات.
5. تشغيل NEAT وإيقافه وإعادة الشبكة للتأكد من الاستقرار.

---

## 13) صيانة وتوسعة
لإضافة مختبر/ميزة جديدة:
1. تعريف contract واضح للبيانات (scene/math/view).
2. تحديث `server/schema.js` عند الحاجة.
3. ربط renderer في `SceneRouter`/`RenderDispatcher`.
4. إضافة fallback/error handling.
5. اختبار النجاح + الفشل + offline.

---

## 14) ملاحظة توثيقية
الملفات التالية أصبحت مراجع تحويلية فقط:
- `README.md`
- `PROJECT_STRUCTURE.md`
- `PROJECT_LOGIC.md`
- `PROJECT_FEATURES.md`
- `PROJECT_HANDOFF.md`

المرجع المعتمد الوحيد: `PROJECT_DOCUMENTATION.md`.
