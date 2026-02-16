const tx = (ar, en) => ({ ar, en });

export const LIMITS_INTRO_SLIDES = [
  {
    id: "cauchy",
    title: tx("أوغستان كوشي وبداية الصرامة", "Cauchy and Mathematical Rigor"),
    subtitle: tx(
      "كوشي وضع صياغة دقيقة لمفهوم النهاية، فنقل التحليل من الحدس إلى البرهان.",
      "Cauchy formalized limits rigorously, moving analysis from intuition to proof."
    ),
    bullets: [
      tx("الهدف: تعريف واضح لمعنى «الاقتراب» في الرياضيات.", "Goal: a precise definition of mathematical approach."),
      tx("هذا الأساس مكّن التفاضل والتكامل الحديث.", "This foundation enabled modern calculus.")
    ],
    visual: {
      type: "portrait",
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Augustin_Louis_Cauchy.jpg/512px-Augustin_Louis_Cauchy.jpg.webp",
      alt: tx("صورة أوغستان كوشي", "Portrait of Augustin Cauchy"),
      caption: tx("Augustin-Louis Cauchy (1789-1857)", "Augustin-Louis Cauchy (1789-1857)")
    }
  },
  {
    id: "idea",
    title: tx("الفكرة الأساسية للنهاية", "Core Idea of Limits"),
    subtitle: tx(
      "نسأل: إلى ماذا تقترب f(x) عندما x تقترب من a؟ وليس بالضرورة قيمة f(a).",
      "We ask what f(x) approaches as x approaches a, not necessarily f(a)."
    ),
    bullets: [
      tx("قد توجد النهاية حتى مع ثغرة عند النقطة.", "A limit may exist even if the point itself is missing."),
      tx("النهايتان اليمنى واليسرى يجب أن تتطابقا لوجود نهاية كلية.", "Left and right limits must agree for a two-sided limit.")
    ],
    visual: {
      type: "limit"
    }
  },
  {
    id: "epsilon-delta",
    title: tx("تعريف إبسيلون-دلتا", "Epsilon-Delta Definition"),
    equation: "∀ε>0 ∃δ>0: |x-a|<δ ⇒ |f(x)-L|<ε",
    equationParts: [
      {
        label: tx("ε", "ε"),
        text: tx("هامش مسموح في قيم المخرجات حول L.", "Output tolerance around L.")
      },
      {
        label: tx("δ", "δ"),
        text: tx("هامش مسموح في قيم الإدخال حول a.", "Input neighborhood around a.")
      },
      {
        label: tx("|x-a|<δ", "|x-a|<δ"),
        text: tx("نجبر x على البقاء قريباً من a.", "Force x to remain near a.")
      },
      {
        label: tx("|f(x)-L|<ε", "|f(x)-L|<ε"),
        text: tx("فتقترب قيم الدالة من L كما نريد.", "Then f(x) gets as close to L as required.")
      }
    ],
    visual: {
      type: "equation-parts"
    }
  },
  {
    id: "intuition",
    title: tx("الحدس الهندسي", "Geometric Intuition"),
    bullets: [
      tx("كلما صغّرنا ε نحتاج غالباً δ أصغر.", "As ε shrinks, δ usually must shrink."),
      tx("العلاقة بينهما هي قلب برهان النهاية.", "Their relationship is central to limit proofs.")
    ],
    visual: {
      type: "limit"
    }
  },
  {
    id: "cases",
    title: tx("حالات مهمة", "Important Cases"),
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "↗",
          title: tx("نهاية لا نهائية", "Infinite Limit"),
          text: tx("قيمة الدالة تزداد دون حد.", "Function value grows without bound.")
        },
        {
          icon: "⇢",
          title: tx("نهاية طرفية", "One-Sided Limit"),
          text: tx("الاقتراب من جهة واحدة فقط.", "Approach from one side only.")
        },
        {
          icon: "○",
          title: tx("ثغرة قابلة للإزالة", "Removable Hole"),
          text: tx("النهاية موجودة رغم غياب قيمة النقطة.", "Limit exists despite missing point value.")
        }
      ]
    }
  },
  {
    id: "lab",
    title: tx("ما ستجده داخل مختبر النهايات", "Inside Limits Lab"),
    bullets: [
      tx("ضبط ε و δ بصرياً مع ملاحظات فورية.", "Adjust ε and δ visually with instant feedback."),
      tx("تجربة دوال متعددة مع حالات طرفية وثغرات.", "Try multiple functions with one-sided cases and holes."),
      tx("الانتقال من الحدس البصري إلى الصياغة الصارمة.", "Move from visual intuition to formal rigor.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🎯",
          title: tx("نطاقات ε و δ", "ε/δ Bands"),
          text: tx("رؤية مباشرة لعلاقة الإدخال بالمخرج.", "Direct view of input-output tolerance.")
        },
        {
          icon: "🧪",
          title: tx("حالات اختبار", "Case Testing"),
          text: tx("فحص السلوك من اليمين واليسار.", "Test left/right approach behavior.")
        },
        {
          icon: "📚",
          title: tx("فهم البرهان", "Proof Insight"),
          text: tx("تحويل الرسم إلى صياغة رياضية دقيقة.", "Translate visual behavior into formal statements.")
        }
      ]
    }
  }
];
