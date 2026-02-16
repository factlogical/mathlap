import { FOURIER_INTRO_SLIDES as FOURIER_RAW } from "./FourierIntroSlides";
import { NEURAL_INTRO_SLIDES as NEURAL_RAW } from "./NeuralIntroSlides";
import { NEAT_INTRO_SLIDES as NEAT_RAW } from "./NEATIntroSlides";
import { ACTIVATION_INTRO_SLIDES as ACTIVATION_RAW } from "./ActivationIntroSlides";
import { REGRESSION_INTRO_SLIDES as REGRESSION_RAW } from "./RegressionIntroSlides";
import { DERIVATIVE_INTRO_SLIDES as DERIVATIVE_RAW } from "./DerivativeIntroSlides";
import { LIMITS_INTRO_SLIDES as LIMITS_RAW } from "./LimitsIntroSlides";
import { TOPOLOGY_INTRO_SLIDES as TOPOLOGY_RAW } from "./TopologyIntroSlides";

const tx = (ar, en) => ({ ar, en });

function enrichSlides(rawSlides, options) {
  const { extraBullet, notesById = {}, fallbackNote = null, maxBullets = 4 } = options;

  return rawSlides.map((slide) => {
    const bullets = Array.isArray(slide.bullets) ? [...slide.bullets] : [];
    if (extraBullet && bullets.length > 0 && bullets.length < maxBullets) {
      bullets.push(extraBullet);
    }

    const contextualNote = notesById[slide.id] || null;

    return {
      ...slide,
      bullets,
      note: slide.note || contextualNote || fallbackNote || undefined
    };
  });
}

export const FOURIER_INTRO_SLIDES = enrichSlides(FOURIER_RAW, {
  extraBullet: tx(
    "ركّز على العلاقة بين عدد الترددات وجودة إعادة البناء، فهي نفس الفكرة المستخدمة في الضغط الرقمي.",
    "Focus on the relation between frequency count and reconstruction quality; it is the same idea behind digital compression."
  ),
  notesById: {
    portrait: tx(
      "البعد التاريخي هنا مهم: المسألة بدأت في الفيزياء الحرارية وانتهت بأداة عامة لمعالجة الإشارات.",
      "The historical path matters: it started in heat physics and became a general signal-processing tool."
    ),
    equation: tx(
      "لا تحفظ الصيغة فقط؛ الأهم أن كل حد فيها يمثل ترددًا يمكن قياس مساهمته مباشرة.",
      "Do not just memorize the formula; each term is a measurable frequency contribution."
    ),
    intuition: tx(
      "كلما زاد عدد الترددات النشطة، اقترب الشكل المعاد بناؤه من الشكل الأصلي بصورة أوضح.",
      "As active frequencies increase, reconstruction approaches the original shape more closely."
    ),
    "real-world": tx(
      "هذا هو سبب انتقال فورييه من نظرية رياضية إلى تقنية يومية في الصوت والصورة والاتصالات.",
      "This is why Fourier moved from pure math to everyday technology in audio, imaging, and communications."
    ),
    lab: tx(
      "ابدأ بأقل عدد ترددات ثم زدها تدريجيًا لرؤية أثر الدقة بصريًا بشكل مباشر.",
      "Start with few frequencies and increase gradually to observe fidelity changes directly."
    )
  },
  fallbackNote: tx(
    "هذه الشريحة جزء من بناء الحدس قبل بدء التفاعل العملي داخل المختبر.",
    "This slide builds intuition before starting hands-on interaction."
  )
});

export const NEURAL_INTRO_SLIDES = enrichSlides(NEURAL_RAW, {
  extraBullet: tx(
    "قيّم النموذج بخسارة التدريب والاختبار معًا، وليس بالخسارة وحدها.",
    "Evaluate with both train and test loss, not training loss alone."
  ),
  notesById: {
    brain: tx(
      "التشبيه بالدماغ مفيد مفاهيميًا، لكن النموذج الرياضي هو شبكة تحويلات عددية قابلة للتدريب.",
      "Brain analogy helps conceptually, but the mathematical model is a trainable numeric transformation network."
    ),
    neuron: tx(
      "العصبون الواحد بسيط؛ القوة الحقيقية تظهر عند تراكم وحدات متعددة في طبقات متتالية.",
      "A single neuron is simple; real power emerges from stacking many units across layers."
    ),
    layers: tx(
      "الطبقات المبكرة تلتقط أنماطًا أولية، بينما الطبقات الأعمق تلتقط تراكيب أعلى تجريدًا.",
      "Early layers capture primitive patterns; deeper layers capture higher-level abstractions."
    ),
    learning: tx(
      "إذا كان التدرج غير مستقر فغالبًا يلزم ضبط معدل التعلم أو البنية أو دالة الخسارة.",
      "If gradients are unstable, you usually need to tune learning rate, architecture, or loss."
    ),
    lab: tx(
      "جرّب نفس البيانات مع بنى مختلفة لتفهم متى نحتاج شبكة أعمق ومتى تكفي بنية أبسط.",
      "Try the same dataset with different architectures to see when depth helps and when simpler is enough."
    )
  },
  fallbackNote: tx(
    "ركّز على العلاقة بين البنية وسلوك التعلم بدل التركيز على رقم خسارة واحد فقط.",
    "Focus on architecture-learning behavior relations rather than a single loss number."
  )
});

export const NEAT_INTRO_SLIDES = enrichSlides(NEAT_RAW, {
  extraBullet: tx(
    "تابع توازن التحسن: صعود اللياقة مع بقاء تنوع الأنواع علامة جيدة على تطور صحي.",
    "Watch for balanced progress: rising fitness with sustained species diversity indicates healthy evolution."
  ),
  notesById: {
    "what-is-neat": tx(
      "قوة NEAT أنه لا يفترض البنية المثلى من البداية، بل يكتشفها أثناء التعلم.",
      "NEAT's strength is that it does not assume the optimal architecture upfront; it discovers it during learning."
    ),
    innovation: tx(
      "أرقام الابتكار تمنع ضياع التوافق بين الجينات عند التهجين بين بنى غير متطابقة.",
      "Innovation numbers keep genes aligned during crossover across mismatched topologies."
    ),
    speciation: tx(
      "الأنواع تحافظ على الأفكار الجديدة حتى قبل أن تصبح الأفضل أداءً.",
      "Species protect novel structures before they become top performers."
    ),
    environment: tx(
      "الهدف ليس الوصول فقط، بل الوصول بكفاءة واستقرار عبر أهداف متعددة.",
      "The goal is not only reaching targets, but doing so efficiently and stably across multiple targets."
    ),
    dashboard: tx(
      "راقب العلاقات لا الأرقام المنفصلة: تغير الأنواع والتعقيد يفسران سلوك اللياقة.",
      "Track relationships, not isolated numbers: species and complexity trends explain fitness behavior."
    ),
    "lab-goals": tx(
      "ابدأ من المجتمع ثم انزل تدريجيًا للتفاصيل: Genome ثم Environment ثم Dashboard.",
      "Start from population, then drill down: Genome, Environment, then Dashboard."
    )
  },
  fallbackNote: tx(
    "هذا التمهيد يساعدك على تفسير ما يحدث أثناء التطور بدل مشاهدة الأرقام فقط.",
    "This intro helps you interpret evolution behavior instead of watching numbers alone."
  )
});

export const ACTIVATION_INTRO_SLIDES = enrichSlides(ACTIVATION_RAW, {
  extraBullet: tx(
    "اختيار دالة التفعيل والخسارة معًا يحدد جودة التدرج واستقرار التدريب.",
    "Activation and loss choices together shape gradient quality and training stability."
  ),
  notesById: {
    problem: tx(
      "بدون اللاخطية، مهما زاد العمق تبقى القدرة التمثيلية محدودة جدًا.",
      "Without nonlinearity, increasing depth still keeps representational power limited."
    ),
    nonlinearity: tx(
      "هذه هي النقطة الفارقة: إدخال اللاخطية يحول النموذج من ملاءمة بسيطة إلى تعلم علاقات معقدة.",
      "This is the turning point: nonlinearity upgrades the model from simple fitting to complex relation learning."
    ),
    families: tx(
      "لا توجد دالة أفضل دائمًا؛ الاختيار يعتمد على نوع البيانات واستقرار التدرج.",
      "No activation is universally best; choice depends on data type and gradient stability."
    ),
    loss: tx(
      "دالة الخسارة يجب أن تطابق نوع المهمة: انحدار أو تصنيف.",
      "Loss must match task type: regression or classification."
    ),
    interaction: tx(
      "قارن الدوال على نفس الإعدادات لترى الفرق الحقيقي بدل المقارنة على سيناريوهات مختلفة.",
      "Compare functions under identical settings to observe real behavioral differences."
    )
  },
  fallbackNote: tx(
    "هذه الشريحة تساعدك على الربط بين الشكل الرياضي والسلوك التدريبي الفعلي.",
    "This slide links mathematical form to practical training behavior."
  )
});

export const REGRESSION_INTRO_SLIDES = enrichSlides(REGRESSION_RAW, {
  extraBullet: tx(
    "الهدف ليس أفضل مطابقة تدريبية فقط، بل نموذج يتعمم جيدًا على بيانات جديدة.",
    "The goal is not only best training fit, but robust generalization to unseen data."
  ),
  notesById: {
    question: tx(
      "ابدأ دائمًا بتصوّر البيانات أولًا قبل اختيار نوع النموذج.",
      "Always inspect data structure first before choosing model family."
    ),
    linear: tx(
      "تفسير معاملات النموذج (الميل والتقاطع) يعطيك فهمًا مباشرًا للسلوك المتوقع.",
      "Interpreting slope and intercept gives direct insight into expected model behavior."
    ),
    logistic: tx(
      "الانحدار اللوجستي ينتج احتمالات، وحد القرار ينتج بعد تطبيق عتبة التصنيف.",
      "Logistic regression outputs probabilities; decision boundary appears after thresholding."
    ),
    gd: tx(
      "سرعة التعلم العالية قد تتجاوز الحد الأدنى، والمنخفضة جدًا قد تجعل التدريب بطيئًا جدًا.",
      "High learning rates may overshoot minima, very low rates may make training too slow."
    ),
    generalization: tx(
      "الفجوة الكبيرة بين Train وTest علامة واضحة على فرط التخصيص.",
      "A large train-test gap is a clear sign of overfitting."
    ),
    lab: tx(
      "جرّب نفس النقاط مع أكثر من نموذج وخسارة لاكتشاف حدود كل اختيار.",
      "Try identical points with different models and losses to understand each choice limits."
    )
  },
  fallbackNote: tx(
    "راقب مؤشرات Train/Test مع الرسم لفهم الأداء الحقيقي للنموذج.",
    "Track train/test metrics with plots to assess real model performance."
  )
});

export const DERIVATIVE_INTRO_SLIDES = enrichSlides(DERIVATIVE_RAW, {
  extraBullet: tx(
    "المشتقة تربط الحدس الهندسي بالتفسير الفيزيائي لمعدل التغير.",
    "Derivative bridges geometric intuition with physical rate-of-change interpretation."
  ),
  notesById: {
    history: tx(
      "الخلاف التاريخي مهم، لكن الأهم اليوم هو وحدة الفكرة الرياضية نفسها.",
      "Historical dispute is notable, but the unified mathematical idea is what matters now."
    ),
    question: tx(
      "تقليل h تدريجيًا هو الجسر بين الميل المتوسط والميل اللحظي.",
      "Shrinking h gradually bridges average slope and instantaneous slope."
    ),
    definition: tx(
      "هذه الصيغة هي أساس كثير من خوارزميات التحسين في التعلم الآلي.",
      "This definition underpins many optimization algorithms in machine learning."
    ),
    "2d-3d": tx(
      "الانتقال إلى 3D لا يغير الفكرة؛ بل يوسعها من خط مماس إلى مستوى مماس.",
      "Moving to 3D does not change the core idea; it extends tangent line to tangent plane."
    ),
    lab: tx(
      "استخدم المختبر لملاحظة كيف تتغير قيمة الميل محليًا عند تغيير موضع النقطة.",
      "Use the lab to observe how local slope changes as point position changes."
    )
  },
  fallbackNote: tx(
    "ركز على العلاقة بين الرسم والصيغة ليتحول المفهوم من تجريدي إلى بصري واضح.",
    "Focus on plot-formula correspondence to turn abstract concepts into clear visual intuition."
  )
});

export const LIMITS_INTRO_SLIDES = enrichSlides(LIMITS_RAW, {
  extraBullet: tx(
    "التمييز بين قيمة الدالة والنهاية عند النقطة هو مفتاح فهم الاستمرارية والانقطاعات.",
    "Distinguishing function value from limit at a point is key to continuity and discontinuities."
  ),
  notesById: {
    cauchy: tx(
      "الصياغة الصارمة للنهايات هي ما جعل التحليل الرياضي قابلًا للبرهان المنهجي.",
      "Rigorous limit formulation made analysis provable in a systematic way."
    ),
    idea: tx(
      "السؤال ليس ماذا تساوي الدالة عند النقطة، بل ماذا يحدث لها قرب النقطة.",
      "The key question is not value at the point, but behavior near the point."
    ),
    "epsilon-delta": tx(
      "هذا التعريف هو المعيار الذهبي لإثبات النهايات بشكل رسمي.",
      "This is the gold-standard formal criterion for proving limits."
    ),
    intuition: tx(
      "كل اختيار لـ ε يقابله اختيار مناسب لـ δ إذا كانت النهاية موجودة.",
      "For each epsilon, a suitable delta exists when the limit truly exists."
    ),
    cases: tx(
      "الحالات الخاصة مهمة لأنها تكشف متى يفشل الحدس البسيط.",
      "Special cases are crucial because they reveal where simple intuition fails."
    ),
    lab: tx(
      "جرّب الاقتراب من الجهتين لتتأكد بصريًا من وجود النهاية الكلية.",
      "Approach from both sides to visually verify a two-sided limit."
    )
  },
  fallbackNote: tx(
    "هذه الشرائح تمهد للانتقال من الحدس إلى البرهان خطوة بخطوة.",
    "These slides prepare a step-by-step transition from intuition to proof."
  )
});

export const TOPOLOGY_INTRO_SLIDES = enrichSlides(TOPOLOGY_RAW, {
  extraBullet: tx(
    "أحيانًا حل المشكلة يصبح أوضح بعد رفعها إلى فضاء أعلى وإعادة قراءتها كبنية.",
    "Sometimes a problem becomes clearer after lifting to a higher space and reading it structurally."
  ),
  notesById: {
    question: tx(
      "صعوبة المسألة ليست في الرسم فقط، بل في البحث العددي غير المباشر عن أربع نقاط متوافقة.",
      "Difficulty lies not only in geometry, but in numerically finding four compatible points."
    ),
    reformulation: tx(
      "إعادة الصياغة تقلل شروط البحث من أربعة نقاط إلى زوجين بشروط مكافئة أقوى.",
      "Reformulation reduces search from four points to two equivalent constrained pairs."
    ),
    lift: tx(
      "التحويل (Mx, My, D) هو المفتاح الذي يجعل المشكلة قابلة للتتبع الطوبولوجي.",
      "The (Mx, My, D) mapping is the key enabling topological tracking."
    ),
    surface: tx(
      "السطح الناتج ليس رسمًا تجميليًا؛ بل تمثيل مباشر لبنية جميع الأزواج الممكنة.",
      "The resulting surface is not cosmetic; it directly represents all possible pairs."
    ),
    collision: tx(
      "نقاط التصادم الذاتي تمثل الحلول المرشحة، ثم يجري التحقق الهندسي من صحتها.",
      "Self-collision points are candidate solutions, then validated geometrically."
    ),
    lab: tx(
      "اختيار مستطيل في 2D ومتابعته في 3D يوضح معنى الربط الطوبولوجي عمليًا.",
      "Selecting a rectangle in 2D and tracking it in 3D clarifies topological coupling in practice."
    )
  },
  fallbackNote: tx(
    "تابع التزامن بين نافذة 2D و3D لفهم التحويل بدل حفظه كصيغة فقط.",
    "Follow 2D-3D synchronization to understand transformation beyond formula memorization."
  )
});
