const tx = (ar, en) => ({ ar, en });

export const TOPOLOGY_INTRO_SLIDES = [
  {
    id: "question",
    title: tx("سؤال المستطيل المدرج", "Inscribed Rectangle Question"),
    subtitle: tx(
      "هل كل منحنى مغلق بسيط يحتوي أربع نقاط تشكل مستطيلاً؟",
      "Does every simple closed curve contain four points forming a rectangle?"
    ),
    bullets: [
      tx("البحث المباشر عن أربع نقاط صعب وغير مستقر عددياً.", "Directly searching for four points is difficult and numerically unstable."),
      tx("الحل الأفضل: إعادة صياغة المسألة بطريقة طوبولوجية.", "A better approach is to reformulate the problem topologically.")
    ],
    visual: {
      type: "topology"
    }
  },
  {
    id: "reformulation",
    title: tx("إعادة الصياغة الذكية", "Smart Reformulation"),
    bullets: [
      tx("بدلاً من 4 نقاط، نبحث عن زوجين مختلفين من النقاط.", "Instead of 4 points, we search for two different pairs."),
      tx("الشرط: نفس نقطة المنتصف ونفس المسافة بين كل زوج.", "Condition: same midpoint and same pair distance."),
      tx("هذا الشرط يكفي لضمان وجود مستطيل.", "This condition is sufficient to guarantee a rectangle.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "①",
          title: tx("زوج أول", "First Pair"),
          text: tx("نقطتان على المنحنى.", "Two points on the curve.")
        },
        {
          icon: "②",
          title: tx("زوج ثانٍ", "Second Pair"),
          text: tx("زوج مختلف عن الأول.", "A different pair from the first.")
        },
        {
          icon: "⟂",
          title: tx("منتصف مشترك", "Shared Midpoint"),
          text: tx("الزوجان يتقاطعان في نفس المركز.", "Both pairs share the same center.")
        },
        {
          icon: "↔",
          title: tx("مسافة متساوية", "Equal Distance"),
          text: tx("طول القطعتين متساوٍ.", "Both segment lengths are equal.")
        }
      ]
    }
  },
  {
    id: "lift",
    title: tx("الرفع إلى الفضاء الثلاثي", "Lifting to 3D Space"),
    equation: "(Mx, My, D)",
    equationParts: [
      {
        label: tx("Mx, My", "Mx, My"),
        text: tx("إحداثيات منتصف الزوج.", "Midpoint coordinates of the pair.")
      },
      {
        label: tx("D", "D"),
        text: tx("المسافة بين نقطتي الزوج.", "Distance between the two points.")
      },
      {
        label: tx("التحويل", "Mapping"),
        text: tx("كل زوج في 2D يتحول إلى نقطة في 3D.", "Each pair in 2D maps to a point in 3D.")
      }
    ],
    visual: {
      type: "equation-parts"
    }
  },
  {
    id: "surface",
    title: tx("تشكّل السطح الطوبولوجي", "Topology Surface Formation"),
    bullets: [
      tx("جميع الأزواج الممكنة تعطي سطحاً في فضاء (Mx, My, D).", "All possible pairs form a surface in (Mx, My, D) space."),
      tx("هذا السطح يحمل بنية المسألة بدل التعامل مع النقاط مباشرة.", "The surface encodes the problem structure better than direct point search.")
    ],
    visual: {
      type: "topology"
    }
  },
  {
    id: "collision",
    title: tx("التقاطع الذاتي يعني مستطيلاً", "Self-Intersection Means Rectangle"),
    bullets: [
      tx("إذا تقاطع السطح مع نفسه: زوجان مختلفان أنتجا نفس (Mx, My, D).", "If the surface self-intersects, two distinct pairs produced the same (Mx, My, D)."),
      tx("هنا نحصل على مستطيل على المنحنى الأصلي في 2D.", "This corresponds to a rectangle on the original 2D curve.")
    ],
    note: tx("النقاط البرتقالية في العرض الثلاثي تمثل حالات التصادم المهمة.", "Orange points in 3D indicate critical collision cases."),
    visual: {
      type: "topology"
    }
  },
  {
    id: "lab",
    title: tx("ما ستجربه داخل المختبر", "What You Will Explore"),
    bullets: [
      tx("عرض متزامن للمنحنى في 2D والسطح الطوبولوجي في 3D.", "Synchronized 2D curve and 3D topology surface."),
      tx("اختيار مستطيل في 2D ومتابعة نقطة التصادم المقابلة في 3D.", "Select a rectangle in 2D and inspect its matching 3D collision."),
      tx("تجربة منحنيات مختلفة لفهم أثر البنية الهندسية.", "Switch curve presets to study structural effects.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "📐",
          title: tx("عرض ثنائي", "2D View"),
          text: tx("رسم المنحنى والمستطيلات المكتشفة.", "Curve rendering with detected rectangles.")
        },
        {
          icon: "🌐",
          title: tx("عرض ثلاثي", "3D View"),
          text: tx("سطح التحويل ونقاط التقاطع الذاتي.", "Mapped surface and self-intersections.")
        },
        {
          icon: "🔁",
          title: tx("مزامنة كاملة", "Full Sync"),
          text: tx("ربط مباشر بين العنصر المختار في 2D و3D.", "Direct linkage between selected 2D and 3D elements.")
        }
      ]
    }
  }
];
