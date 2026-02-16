const tx = (ar, en) => ({ ar, en });

export const REGRESSION_INTRO_SLIDES = [
  {
    id: "question",
    title: tx("السؤال الأساسي", "Foundational Question"),
    subtitle: tx(
      "عندما تكون لدينا نقاط بيانات مبعثرة، كيف نبني نموذجاً يفسر العلاقة بينها؟",
      "When points are scattered, how can we build a model that captures their relationship?"
    ),
    bullets: [
      tx("الانحدار الخطي يلائم الاتجاه العام للبيانات.", "Linear regression fits the global trend."),
      tx("الانحدار اللوجستي يحول التنبؤ إلى احتمال وتصنيف.", "Logistic regression turns prediction into probability and classification.")
    ],
    visual: {
      type: "scatter"
    }
  },
  {
    id: "linear",
    title: tx("الانحدار الخطي", "Linear Regression"),
    equation: "ŷ = wx + b",
    bullets: [
      tx("w يحدد الميل، و b يحدد الإزاحة الرأسية.", "w controls slope, b controls vertical shift."),
      tx("نقلل الفروق الرأسية بين النقاط والخط (Residuals).", "We minimize vertical residuals between points and the line.")
    ],
    visual: {
      type: "regression"
    }
  },
  {
    id: "logistic",
    title: tx("الانحدار اللوجستي", "Logistic Regression"),
    equation: "p(y=1|x) = σ(w·x + b)",
    bullets: [
      tx("المخرج احتمال بين 0 و1.", "Output is a probability in [0,1]."),
      tx("حد القرار يفصل بين الفئات في الفضاء.", "A decision boundary separates classes in feature space.")
    ],
    visual: {
      type: "decision"
    }
  },
  {
    id: "gd",
    title: tx("التعلم عبر Gradient Descent", "Learning with Gradient Descent"),
    equationParts: [
      {
        label: tx("Loss", "Loss"),
        text: tx("نقيس الخطأ الحالي للنموذج.", "Measure current model error.")
      },
      {
        label: tx("∇Loss", "∇Loss"),
        text: tx("نحسب اتجاه زيادة الخطأ.", "Compute direction of increasing error.")
      },
      {
        label: tx("Update", "Update"),
        text: tx("نحدّث المعاملات بعكس اتجاه التدرج.", "Update parameters opposite to gradient direction.")
      },
      {
        label: tx("Repeat", "Repeat"),
        text: tx("نكرر حتى الاستقرار أو الوصول لخطأ منخفض.", "Repeat until convergence or low error.")
      }
    ],
    bullets: [
      tx("معدل التعلم العالي قد يسبب تذبذباً.", "High learning rates may cause oscillation."),
      tx("معدل التعلم المنخفض جداً يبطئ التدريب.", "Very low learning rates slow convergence.")
    ],
    visual: {
      type: "gradient"
    }
  },
  {
    id: "generalization",
    title: tx("التعميم مقابل فرط التخصيص", "Generalization vs Overfitting"),
    bullets: [
      tx("قارن دائماً بين خطأ التدريب وخطأ الاختبار.", "Always compare train and test losses."),
      tx("إذا كان Train منخفضاً جداً و Test مرتفعاً فهذا مؤشر فرط تخصيص.", "Very low train loss with high test loss indicates overfitting."),
      tx("زيادة التعقيد لا تعني دائماً نموذجاً أفضل.", "More complexity does not always mean better performance.")
    ],
    note: tx("الجودة الحقيقية هي الأداء على بيانات جديدة، لا بيانات التدريب فقط.", "True quality is performance on unseen data, not training data alone."),
    visual: {
      type: "overfit"
    }
  },
  {
    id: "lab",
    title: tx("ما ستجربه في المختبر", "What You Will Explore"),
    bullets: [
      tx("إضافة نقاط يدوياً وتعديلها ثم تدريب النموذج.", "Add/edit points manually and train the model."),
      tx("اختيار نوع النموذج والخوارزمية ودالة الخسارة.", "Choose model type, optimizer, and loss."),
      tx("متابعة مسار التعلم والسطح ثلاثي الأبعاد للخسارة.", "Track learning trajectory and 3D loss surface.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🖱️",
          title: tx("بيانات تفاعلية", "Interactive Data"),
          text: tx("أنشئ بياناتك بالنقر والسحب مباشرة.", "Create your own dataset by click-and-drag.")
        },
        {
          icon: "📉",
          title: tx("مؤشرات الأداء", "Performance Metrics"),
          text: tx("مراقبة Train/Test لحظياً.", "Monitor train/test behavior live.")
        },
        {
          icon: "🏔️",
          title: tx("سطح الخسارة", "Loss Landscape"),
          text: tx("فهم حركة النموذج على سطح الخطأ.", "Understand parameter motion on the loss surface.")
        }
      ]
    }
  }
];
