# Math Agent Demo

منصة مختبرات تفاعلية للرياضيات وعلوم الحاسوب، مع وكيل ذكي يفسر الطلبات ويحوّلها إلى مشاهد ورسومات تعليمية.

## ما الذي يوفره المشروع؟
- مختبرات تفاعلية (رياضيات + علوم حاسوب + فيزياء).
- شات ذكي لتفسير الطلبات الرياضية.
- Renderers متعددة (`Canvas`/`SVG`/`Plotly`) حسب نوع المشهد.
- بنية Frontend/Backend منفصلة مناسبة للنشر كـ Public Beta.

## البنية
- `src/`: واجهة React + المختبرات + renderers.
- `server/`: خادم Express ونقطة `interpret`.
- `PROJECT_DOCUMENTATION.md`: التوثيق الكامل للمشروع.

## التشغيل المحلي السريع

### 1) Frontend
```bash
npm install
npm run dev
```

### 2) Backend
```bash
cd server
npm install
npm start
```

## متغيرات البيئة

### Frontend
- `VITE_API_URL`

### Backend
- `OPENAI_API_KEY`
- `CORS_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `MAX_PROMPT_CHARS`
- `MAX_TOKENS`

> لا تضع مفاتيح سرية داخل كود الواجهة.

## Public Beta Deployment
- Frontend: `Vercel`
- Backend: `Render`
- تأكد أن `CORS_ORIGINS` يحتوي دومين الواجهة فقط.

## مراجع إضافية
- التوثيق المفصل: `PROJECT_DOCUMENTATION.md`
