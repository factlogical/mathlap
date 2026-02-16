const tx = (ar, en) => ({ ar, en });

export const ACTIVATION_INTRO_SLIDES = [
  {
    id: "problem",
    title: tx("المشكلة الأساسية", "The Core Problem"),
    subtitle: tx(
      "بدون دوال تفعيل تصبح الشبكات العميقة مكافئة تقريباً لتحويل خطي بسيط.",
      "Without activation functions, deep networks collapse into near-linear mappings."
    ),
    bullets: [
      tx("اللاخطية شرط أساسي لتمثيل العلاقات المعقدة.", "Nonlinearity is essential to model complex relationships."),
      tx("زيادة الطبقات وحدها لا تكفي إن كانت جميعها خطية.", "Adding layers alone is insufficient if all operations are linear.")
    ],
    visual: {
      type: "activation"
    }
  },
  {
    id: "nonlinearity",
    title: tx("الحل: إدخال اللاخطية", "Solution: Add Nonlinearity"),
    equation: "a = φ(z)",
    equationParts: [
      {
        label: tx("z", "z"),
        text: tx("الإدخال الصافي قبل التفعيل.", "Pre-activation net input.")
      },
      {
        label: tx("φ", "φ"),
        text: tx("دالة التفعيل (ReLU, Sigmoid, Tanh...).", "Activation function (ReLU, Sigmoid, Tanh...).")
      },
      {
        label: tx("a", "a"),
        text: tx("المخرج بعد التفعيل الذي ينتقل للطبقة التالية.", "Post-activation output passed to next layer.")
      }
    ],
    visual: {
      type: "equation-parts"
    }
  },
  {
    id: "families",
    title: tx("عائلة دوال التفعيل", "Activation Families"),
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🔷",
          title: tx("ReLU", "ReLU"),
          text: tx("سريعة وشائعة في الشبكات العميقة.", "Fast and widely used in deep models.")
        },
        {
          icon: "🟢",
          title: tx("Sigmoid", "Sigmoid"),
          text: tx("تضغط الخرج بين 0 و1، مناسبة للاحتمالات.", "Maps output to [0,1], useful for probabilities.")
        },
        {
          icon: "🟠",
          title: tx("Tanh", "Tanh"),
          text: tx("تضغط الخرج بين -1 و1 حول الصفر.", "Maps output to [-1,1], centered around zero.")
        },
        {
          icon: "🟣",
          title: tx("Leaky ReLU", "Leaky ReLU"),
          text: tx("تخفف مشكلة العصبون الميت في ReLU.", "Mitigates the dying-ReLU problem.")
        }
      ]
    }
  },
  {
    id: "loss",
    title: tx("دوال الخسارة", "Loss Functions"),
    equation: "Loss(y, ŷ)",
    bullets: [
      tx("MSE و MAE غالباً لمسائل الانحدار.", "MSE and MAE are common for regression."),
      tx("BCE و Cross-Entropy لمسائل التصنيف.", "BCE and Cross-Entropy are common for classification."),
      tx("اختيار دالة الخسارة يؤثر على شكل التدرج وسرعة التقارب.", "Loss choice strongly affects gradients and convergence.")
    ],
    visual: {
      type: "loss"
    }
  },
  {
    id: "interaction",
    title: tx("التجربة التفاعلية", "Interactive Exploration"),
    bullets: [
      tx("حرّك قيمة z لتشاهد المخرج والمشتقة لحظياً.", "Adjust z and inspect output/derivative instantly."),
      tx("بدّل بين دوال التفعيل وشاهد الفرق على نفس الإدخال.", "Switch activations and compare behavior on the same input."),
      tx("راقب تأثير اختيار دالة الخسارة على سلوك التدريب.", "Observe how loss choice affects optimization behavior.")
    ],
    visual: {
      type: "activation"
    }
  },
  {
    id: "lab",
    title: tx("ما ستجده داخل المختبر", "What You Will Find"),
    bullets: [
      tx("مستعرض دوال التفعيل مع رسم حي عالي الدقة.", "High-fidelity activation function explorer."),
      tx("بناء شبكة وحدات ومراقبة مساهمة كل وحدة.", "Unit-based network builder with contribution tracking."),
      tx("مختبر دوال الخسارة لفهم حساسية النماذج للأخطاء.", "Loss function lab to understand error sensitivity.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🔍",
          title: tx("مستعرض الدوال", "Function Explorer"),
          text: tx("فهم سلوك كل دالة بشكل بصري.", "Visual understanding of each function.")
        },
        {
          icon: "🧠",
          title: tx("بناء الشبكة", "Network Builder"),
          text: tx("تركيب وحدات متعددة وتعديلها مباشرة.", "Compose and tune multiple units interactively.")
        },
        {
          icon: "⚡",
          title: tx("مختبر الخسارة", "Loss Lab"),
          text: tx("مقارنة دوال الخسارة على نفس البيانات.", "Compare loss functions on identical data.")
        }
      ]
    }
  }
];
