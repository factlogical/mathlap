# توثيق الميزات الفعلية لمشروع Math Agent Demo
آخر تحديث: 2026-02-08

## 1) ماذا يقدم المشروع
- منصة تفاعلية لشرح الرياضيات بصريًا عبر اللغة الطبيعية (عربي/إنجليزي).
- تحويل الطلب النصي إلى JSON دلالي ثم رسم تفاعلي 2D/3D.
- مختبرات تعليمية متخصصة (Animation, Epsilon-Delta, Derivative Studio, 4D, Manifolds).
- مختبر علوم الحاسب (Neural Playground) لشرح الشبكات العصبية من منظور تعليمي بصري.

## 2) المسار الأساسي للتنفيذ (من الطلب إلى الرسم)
- المستخدم يكتب الطلب في Chat Agent.
- `src/agent/interpret.js` يرسل الطلب إلى `POST /api/interpret`.
- السيرفر (`server/index.js`) يطلب JSON من OpenAI بصيغة strict JSON.
- الـ JSON ينتقل إلى `SceneRouter` ثم `RenderDispatcher` لتحديد الـ Renderer المناسب.
- الرسوم تُعرض عبر Plotly/Canvas/SVG بحسب نوع المشهد.

## 3) الميزات الأساسية في Chat Agent
- دعم رسم دوال 2D/3D، خرائط حرارية، خطوط كونتور، أسطح ثلاثية.
- دعم المتجهات: Head-to-Tail، Sum/Resultant، Labels، التحويل بين 2D و 3D، ومقياس الرسم.
- تحليل متجهات تلقائي: مقدار المتجهات، الضرب النقطي، الزاوية.
- سجل طلبات محفوظ محليًا (LocalStorage) مع إعادة الاستخدام بضغطة واحدة.
- واجهة تحليل منفصلة عن المحادثة مع أوضاع عرض نظيفة.

## 4) قدرات الرسم العام (Generic Plot)
- رسم دوال 1D بخطوط ناعمة مع دعم تكبير/تصغير/سحب.
- اشتقاق جزئي عبر `mathjs` وإظهار الدالة الأصلية والمشتقة معًا.
- رسم حقول قياسية 2D كـ Heatmap/Contour/Surface.
- دعم متتاليات (Sequence/Recurrence) عبر معادلات `a(n)`.
- دعم بيانات جاهزة (data_set) لرسوم مبنية على نقاط.

## 5) مختبرات Math Lab
### Animation Lab
- توليد DSL للرسوم المتحركة من خلال الذكاء الاصطناعي.
- أوامر `plot2d` و `animate` (draw/morph) مع Timeline قابل للتعديل.
- تشغيل/إيقاف، تحكم بالزوم، ومحرر DSL متقدم.
- اقتراحات سريعة للتجربة (Invert, Shift Right, Derivative).

### Epsilon-Delta Lab
- تفاعل حي مع مفهوم النهاية عبر ε و δ على Canvas مخصص.
- وضع تلقائي/يدوي لـ δ مع حسابات ذكية ومرجعية.
- أوضاع خطوة بخطوة، ومؤشر إثبات، وتحدي عملي.
- تفاعل مباشر بالسحب لتغيير ε/δ والنقطة (a, L).
- Tooltip ذكي مع Pin/Compact/Hidden، وإظهار حالة الدخول في النطاقات.
- وضع ملء الشاشة ومؤثرات شرح عربية داخلية.
- مساعد AI داخلي بواجهة دردشة لتنفيذ أوامر على الرسم.

### Derivative Studio
- عرض القاطع والمماس والمثلث القائم على Canvas حي.
- تحكم مباشر في `a` و `h` مع أنيميشن اقتراب `h → 0`.
- شات تفاعلي يدعم أوامر محلية وأوامر عبر AI.
- إجراءات سريعة (Quick Actions) لتجريب أنماط تعليمية.

### 4D Viewer (Hypercube)
- إسقاط 4D إلى 3D مع تحكم دوران في مستويي XW و YW.
- تتبع نقطة مرجعية لتوضيح مفهوم البعد الرابع.
- لوحة شرح مبسطة داخل المختبر.

### Manifold Lab
- أسطح: Möbius, Torus, Klein Bottle.
- تحكم بالدقة، مدى الدوران (U)، والشفافية.

### Linear Studio
- تحويلات خطية بـ SVG (تمهيد بصري للـ Linear Algebra).

## 6) مختبر علوم الحاسب: Neural Playground
- Presets جاهزة + بناء معماريات مخصصة (Layers/Neurons).
- مجموعات بيانات تعليمية: XOR, Circle, Spiral, Linear.
- محاكاة تدريب حي مع Loss/Accuracy وسرعة التحكم.
- Decision Boundary تفاعلي وإضافة نقاط بالنقر.
- وضعين: Neural و Symbolic Logic مع شروحات داخلية.
- Tooltips تعليمية لكل عقدة (Math Inspector).

## 7) المشاهد المدعومة فعليًا
- `generic_plot` (Scalar/Vector/Sequence/Data).
- `regression_3d_plane` (Fitted Plane + تنظيم بسيط).
- `geometry_3d` (نقاط/متجهات + دوران + إدخال يدوي).
- `function_2d` (واجهة قديمة لكنها موجودة).
- `derivative_2d` (واجهة قديمة لكنها موجودة).
- `epsilon_delta_limit` (مختبر النهاية).

## 8) أوامر التشغيل المحلية
### السيرفر
```powershell
cd server
npm install
npm start
```
يتطلب متغير بيئة `OPENAI_API_KEY` داخل `server/.env`. المنفذ الافتراضي: `3002`.

### الواجهة
```powershell
npm install
npm run dev
```
الواجهة تعمل افتراضيًا على `http://localhost:5173`.

## 9) أوامر وتجارب جاهزة
أمثلة أوامر Chat Agent:
- `Plot sin(x)`
- `Surface z = x*y`
- `Heatmap x^2 + y^2`
- `Visualize vectors v=(2,1) and w=(-1,3)`
- `Show derivative of sin(x)`

أمثلة Animation Lab:
- `Plot x^2 then morph to x^3`
- `Plot sin(x) then morph to cos(x)`
- `Draw tan(x)`

أمثلة Epsilon-Delta (داخل الشات):
- `eps 0.5`
- `delta 0.2`
- `lim 4`
- `a 2`
- `reset`
- العربية: `ابسلون 0.5`، `دلتا 0.2`، `نهاية 4`، `نقطة 2`

أمثلة Derivative Studio (داخل الشات):
- `h 0.1`
- `a 1`
- `animate`
- `toggle secant`
- `toggle tangent`
- `ارسم sin(x)`
- `اشتق x^3 عند 2`

## 10) أفضل المختبرات للعرض (Demo Picks)
- Epsilon-Delta Lab: الأكثر تفاعلًا بصريًا وتعليميًا مع أدوات شرح عربية.
- Derivative Studio: ممتاز لشرح مفهوم المماس والتحويل من القاطع.
- Animation Lab: يبرز الذكاء الاصطناعي وDSL بصري جذاب.
- Neural Playground: عرض بصري قوي للتعلم الآلي مع بيانات وخسارة.
- 4D Viewer: لقطة مبهرة وسريعة لمفهوم البعد الرابع.

## 11) ملاحظات مهمة (فجوات/تقنيات)
- `README.md` عام (قالب Vite) ولا يعكس الميزات الفعلية.
- `Function2DRenderer` يولد اقتراحات عبر `mode = "math_suggestions"` لكن السيرفر لا يدعم هذا الـ mode حاليًا.
- بعض الملفات التوثيقية القديمة لا تغطي المختبرات الجديدة، لذا يُعتمد هذا الملف كمرجع فعلي.
