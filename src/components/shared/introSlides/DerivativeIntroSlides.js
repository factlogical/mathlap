const tx = (ar, en) => ({ ar, en });

export const DERIVATIVE_INTRO_SLIDES = [
  {
    id: "history",
    title: tx("نيوتن ولايبنتز", "Newton and Leibniz"),
    subtitle: tx(
      "طوّر كل منهما حساب التفاضل بصورة مستقلة تقريباً في القرن السابع عشر.",
      "Both developed calculus independently in the 17th century."
    ),
    bullets: [
      tx("التفاضل يجيب عن سؤال: ما معدل التغير اللحظي؟", "Differentiation answers: what is the instantaneous rate of change?"),
      tx("هذا المفهوم أصبح أساس الفيزياء والهندسة والتعلم الآلي.", "This concept became foundational in physics, engineering, and ML.")
    ],
    visual: {
      type: "portrait",
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Sir_Isaac_Newton_%281643-1727%29.jpg/512px-Sir_Isaac_Newton_%281643-1727%29.jpg.webp",
      alt: tx("صورة إسحاق نيوتن", "Portrait of Isaac Newton"),
      caption: tx("إسحاق نيوتن (1643-1727)", "Isaac Newton (1643-1727)"),
      secondarySrc: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Gottfried_Wilhelm_von_Leibniz.jpg/512px-Gottfried_Wilhelm_von_Leibniz.jpg.webp",
      secondaryAlt: tx("صورة غوتفريد لايبنتز", "Portrait of Gottfried Leibniz"),
      secondaryCaption: tx("غوتفريد لايبنتز (1646-1716)", "Gottfried Leibniz (1646-1716)")
    }
  },
  {
    id: "question",
    title: tx("من القاطع إلى المماس", "From Secant to Tangent"),
    subtitle: tx(
      "نبدأ بميل بين نقطتين (قاطع)، ثم نصغّر المسافة حتى نصل لميل المماس.",
      "Start with secant slope between two points, then shrink distance toward the tangent slope."
    ),
    bullets: [
      tx("المعامل h يمثل المسافة الأفقية بين النقطتين.", "h represents horizontal separation."),
      tx("عندما h يقترب من الصفر نحصل على المشتقة.", "As h approaches zero, we get the derivative.")
    ],
    visual: {
      type: "derivative"
    }
  },
  {
    id: "definition",
    title: tx("التعريف الرسمي للمشتقة", "Formal Derivative Definition"),
    equation: "f'(x) = lim(h→0) [f(x+h) - f(x)] / h",
    equationParts: [
      {
        label: tx("f(x+h)-f(x)", "f(x+h)-f(x)"),
        text: tx("التغير في قيمة الدالة.", "Change in function value.")
      },
      {
        label: tx("h", "h"),
        text: tx("التغير في المدخل.", "Change in input.")
      },
      {
        label: tx("النسبة", "Ratio"),
        text: tx("معدل تغير تقريبي (ميل القاطع).", "Approximate rate of change (secant slope).")
      },
      {
        label: tx("lim h→0", "lim h→0"),
        text: tx("الانتقال من التقريب إلى المعدل اللحظي الدقيق.", "Transition from approximation to exact instantaneous rate.")
      }
    ],
    visual: {
      type: "equation-parts"
    }
  },
  {
    id: "2d-3d",
    title: tx("من 2D إلى 3D", "From 2D to 3D"),
    bullets: [
      tx("في 2D: المماس يحدد الاتجاه المحلي للمنحنى.", "In 2D: tangent gives local curve direction."),
      tx("في 3D: مستوى المماس يقرّب السطح حول النقطة.", "In 3D: tangent plane approximates the surface locally."),
      tx("المتجه العمودي يحدد الاتجاه المتعامد على مستوى المماس.", "Normal vector gives direction perpendicular to tangent plane.")
    ],
    visual: {
      type: "derivative"
    }
  },
  {
    id: "applications",
    title: tx("لماذا المشتقة مهمة؟", "Why Derivatives Matter"),
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🚗",
          title: tx("السرعة والتسارع", "Velocity and Acceleration"),
          text: tx("مشتقة المسافة تعطي السرعة، ومشتقة السرعة تعطي التسارع.", "Derivative of position gives velocity, derivative of velocity gives acceleration.")
        },
        {
          icon: "📈",
          title: tx("التحسين الرياضي", "Optimization"),
          text: tx("نبحث عن القيم التي تجعل المشتقة صفراً لاكتشاف القمم والقيعان.", "Set derivative to zero to locate maxima and minima.")
        },
        {
          icon: "🤖",
          title: tx("التعلم الآلي", "Machine Learning"),
          text: tx("التدرج هو محرك تحديث الأوزان أثناء التدريب.", "Gradients drive weight updates during training.")
        }
      ]
    }
  },
  {
    id: "lab",
    title: tx("ما ستجده في مختبر المشتقات", "Inside Derivative Lab"),
    bullets: [
      tx("تحريك a و h ومشاهدة القاطع والمماس في الزمن الحقيقي.", "Move a and h and inspect secant/tangent in real time."),
      tx("الانتقال بين المشهد ثنائي وثلاثي الأبعاد.", "Switch between 2D and 3D visual modes."),
      tx("ربط الشرح الذكي مباشرة مع الرسم التفاعلي.", "Connect smart explanations directly to the interactive graph.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "✏️",
          title: tx("تفاعل مباشر", "Direct Interaction"),
          text: tx("غيّر نقاط القياس وشاهد أثرها فوراً.", "Adjust measurement points and see immediate effects.")
        },
        {
          icon: "🌐",
          title: tx("عرض ثلاثي", "3D View"),
          text: tx("تمثيل مستوى المماس والمتجه العمودي بوضوح.", "Clear tangent-plane and normal-vector visualization.")
        },
        {
          icon: "💬",
          title: tx("شرح سياقي", "Contextual Guidance"),
          text: tx("المساعد يفسر ما يحدث بناءً على الحالة الحالية.", "Assistant explains based on current state.")
        }
      ]
    }
  }
];
