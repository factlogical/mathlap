# توثيق مختصر لمنطق النظام (System Logic Summary)

هذا المستند يلخص منطق النظام وتدفق البيانات والعقود بين الخادم والواجهة بشكل موجز.

---

## 1) الفكرة العامة
المستخدم يكتب طلبًا رياضيًا، والخادم يحوله إلى JSON دلالي (Semantic JSON) يصف الكائن الرياضي، ثم الواجهة تختار الـ Renderer المناسب وتعرض الرسم التفاعلي.

---

## 2) تدفق التنفيذ (مختصر)
1. **Frontend**: `src/App.jsx` يستقبل الطلب ويستدعي `interpretPromptToJson`.
2. **Request**: `src/agent/interpret.js` يرسل `POST` إلى:
   - `http://localhost:3002/api/interpret`
3. **Server**: `server/index.js`
   - يستخدم OpenAI (`gpt-4o`)
   - يفرض `response_format: { type: "json_object" }`
   - يحول النص إلى JSON ثم يتحقق عبر `server/schema.js`
4. **Response**: يعود `{ success: true, json: {...} }` وتُخزن النتيجة في `spec`.
5. **Routing**:
   - `src/renderers/SceneRouter.jsx` يعتمد على `spec.scene`
   - `generic_plot` يمر إلى `RenderDispatcher.jsx`
6. **Dispatching**:
   - `RenderDispatcher.jsx` يقرأ `spec.math.kind` ويوجه إلى:
     - `VectorPlotRenderer.jsx`
     - `ScalarPlotRenderer.jsx`

---

## 3) العقد (Contracts) – الحد الأدنى المتوقع
```json
{
  "scene": "generic_plot",
  "math": {
    "kind": "vectors | scalar_field | data_set | vector_field | vector_operation",
    "expression": "string",
    "vectors": { "v": [1, 2] }
  },
  "transform": { "op": "none | partial_derivative", "variable": "x" },
  "view": { "type": "line | heatmap | contour | surface | scatter", "dimension": "2D | 3D" },
  "domain": { "x": [-5, 5], "y": [-5, 5], "resolution": 100 }
}
```

**ملاحظة**: التحقق في `server/schema.js` يستخدم `.passthrough()` للسماح بمرور حقول ديناميكية غير معرفة بدقة.

---

## 4) المشاهد والـ Renderers
| Scene | Renderer |
|---|---|
| `generic_plot` | `RenderDispatcher.jsx` |
| `geometry_3d` | `Geometry3DRenderer.jsx` |
| `regression_3d_plane` | `Regression3DRenderer.jsx` |
| `function_2d` | `Function2DRenderer.jsx` (Legacy) |
| `derivative_2d` | `Derivative2DRenderer.jsx` (Legacy) |

داخل `RenderDispatcher`:
- `kind: vectors | vector_field | vector_operation` → `VectorPlotRenderer.jsx`
- `kind: scalar_field | function_1d | sequence` → `ScalarPlotRenderer.jsx`
- `kind: data_set` → `ScalarPlotRenderer.jsx` (مع تحويل تلقائي إن وُجدت vectors)

---

## 5) نقاط حساسة (High Risk)
1. `src/renderers/RenderDispatcher.jsx`: أي خطأ في التوجيه يكسر الرسومات.
2. `server/index.js` (SYSTEM_PROMPT): أي تعديل في صيغة الـ JSON قد يكسر الواجهة.
3. `src/renderers/VectorPlotRenderer.jsx`: يحتوي منطق توحيد بيانات معقد.

---

## 6) اختبارات سريعة بعد التعديل
1. **Scalar**: "Plot sin(x)" → يظهر رسم خطي.
2. **Vector**: "Vector v=(1,2)" → يظهر سهم.
3. **3D**: "Surface z=x*y" → يظهر سطح ثلاثي الأبعاد.
4. **Error**: نص عشوائي → يظهر خطأ لطيف بدل شاشة بيضاء.

