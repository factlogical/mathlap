import bioNeuronImg from "../../../assets/intro/biological-neuron.svg";
import aiNeuronImg from "../../../assets/intro/artificial-neuron.svg";

const tx = (ar, en) => ({ ar, en });

export const NEURAL_INTRO_SLIDES = [
  {
    id: "brain",
    title: tx("إلهام من الدماغ البشري", "Inspired by the Human Brain"),
    subtitle: tx(
      "الشبكات العصبية الاصطناعية تستلهم فكرة الترابط بين العصبونات، لا البنية الحيوية حرفيًا.",
      "Artificial neural networks imitate connectivity principles, not biological structure literally."
    ),
    bullets: [
      tx("الهدف: تحويل المدخلات إلى قرار أو تنبؤ.", "Goal: map inputs to a decision or prediction."),
      tx("القوة الحقيقية تأتي من تكديس الطبقات والتعلم التدريجي.", "Real power comes from layered learning.")
    ],
    visual: { type: "network" }
  },
  {
    id: "neuron",
    title: tx("مقارنة: العصبون الحيوي والاصطناعي", "Biological vs Artificial Neuron"),
    subtitle: tx(
      "العصبون الاصطناعي نموذج رياضي مبسط لفكرة حيوية: استقبال إشارات متعددة، دمجها، ثم إرسال خرج.",
      "The artificial neuron is a mathematical abstraction of a biological idea: receive many signals, integrate, then emit output."
    ),
    equation: "z = Σ(wᵢxᵢ) + b,   a = φ(z)",
    bullets: [
      tx("التغصنات (Dendrites) تقابل المدخلات xᵢ.", "Dendrites correspond to inputs xᵢ."),
      tx("جسم الخلية (Soma) يقابل الجمع الخطي Σwᵢxᵢ + b.", "Soma corresponds to linear integration Σwᵢxᵢ + b."),
      tx("المحور العصبي (Axon) يقابل الخرج a بعد دالة التفعيل φ.", "Axon corresponds to output a after activation φ.")
    ],
    note: tx(
      "هذه المقارنة لفهم الفكرة فقط؛ التدريب والتعلم يتمان عبر خوارزميات رياضية على الأوزان.",
      "This analogy is conceptual; actual learning is done by mathematical optimization over weights."
    ),
    visual: {
      type: "portrait",
      src: bioNeuronImg,
      alt: tx("رسم عصبون حيوي", "Biological neuron diagram"),
      caption: tx("عصبون حيوي: تغصنات، جسم خلية، محور", "Biological neuron: dendrites, soma, axon"),
      secondarySrc: aiNeuronImg,
      secondaryAlt: tx("رسم عصبون اصطناعي", "Artificial neuron diagram"),
      secondaryCaption: tx("عصبون اصطناعي: مدخلات، أوزان، تفعيل، خرج", "Artificial neuron: inputs, weights, activation, output")
    }
  },
  {
    id: "layers",
    title: tx("تدفق المعلومات عبر الطبقات", "Flow Through Layers"),
    bullets: [
      tx("طبقة الإدخال تستقبل البيانات الخام.", "Input layer receives raw data."),
      tx("الطبقات المخفية تستخرج أنماطًا وتجريدات.", "Hidden layers extract patterns and abstractions."),
      tx("طبقة الإخراج تعطي القرار النهائي.", "Output layer produces the final decision.")
    ],
    visual: { type: "layers" }
  },
  {
    id: "learning",
    title: tx("كيف تتعلم الشبكة؟", "How a Network Learns"),
    bullets: [
      tx("Forward Pass: إنتاج تخمين أولي.", "Forward pass: produce an initial guess."),
      tx("Loss: قياس الفرق عن الهدف.", "Loss: measure error versus target."),
      tx("Backward Pass: حساب التدرجات وتحديث الأوزان.", "Backward pass: compute gradients and update weights."),
      tx("تكرار العملية حتى الاستقرار أو التحسن.", "Repeat until convergence or sufficient improvement.")
    ],
    note: tx("التعلم هو نزول منظم على سطح الخسارة.", "Learning is controlled descent on a loss surface."),
    visual: { type: "gradient" }
  },
  {
    id: "applications",
    title: tx("تطبيقات عملية", "Real Applications"),
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🖼️",
          title: tx("الرؤية الحاسوبية", "Computer Vision"),
          text: tx("تصنيف الصور واكتشاف الأجسام.", "Image classification and object detection.")
        },
        {
          icon: "💬",
          title: tx("معالجة اللغة", "Language Processing"),
          text: tx("فهم النصوص وتوليد المحتوى.", "Text understanding and generation.")
        },
        {
          icon: "🏥",
          title: tx("التطبيقات الطبية", "Medical AI"),
          text: tx("مساندة التشخيص وتحليل الصور الطبية.", "Diagnosis support and medical imaging.")
        },
        {
          icon: "🚗",
          title: tx("الأنظمة الذاتية", "Autonomous Systems"),
          text: tx("القيادة الذكية واتخاذ القرار اللحظي.", "Smart driving and real-time decision making.")
        }
      ]
    }
  },
  {
    id: "lab",
    title: tx("ما ستجربه داخل المختبر", "What You Will Explore"),
    bullets: [
      tx("تعديل العمق وعدد العصبونات ومراقبة الأثر مباشرة.", "Change depth and neuron count with immediate feedback."),
      tx("تجربة مجموعات بيانات مختلفة وحدود قرار متنوعة.", "Try multiple datasets and compare decision boundaries."),
      tx("متابعة الخسارة والتدريب خطوة بخطوة.", "Track loss and training behavior step by step.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🧠",
          title: tx("بنية الشبكة", "Network Architecture"),
          text: tx("تحكم كامل بالطبقات والمعاملات.", "Full control over layers and parameters.")
        },
        {
          icon: "📉",
          title: tx("سلوك التعلم", "Learning Behavior"),
          text: tx("متابعة التقارب والاستقرار أثناء التدريب.", "Monitor convergence and stability during training.")
        },
        {
          icon: "🎯",
          title: tx("حدود القرار", "Decision Boundaries"),
          text: tx("فهم كيف تتشكل الحدود بين الفئات.", "Understand how class boundaries emerge.")
        }
      ]
    }
  }
];

