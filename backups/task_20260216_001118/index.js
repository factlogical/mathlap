import { FOURIER_INTRO_SLIDES as FOURIER_RAW } from "./FourierIntroSlides";
import { NEURAL_INTRO_SLIDES as NEURAL_RAW } from "./NeuralIntroSlides";
import { ACTIVATION_INTRO_SLIDES as ACTIVATION_RAW } from "./ActivationIntroSlides";
import { REGRESSION_INTRO_SLIDES as REGRESSION_RAW } from "./RegressionIntroSlides";
import { DERIVATIVE_INTRO_SLIDES as DERIVATIVE_RAW } from "./DerivativeIntroSlides";
import { LIMITS_INTRO_SLIDES as LIMITS_RAW } from "./LimitsIntroSlides";
import { TOPOLOGY_INTRO_SLIDES as TOPOLOGY_RAW } from "./TopologyIntroSlides";

const tx = (ar, en) => ({ ar, en });

function enrichSlides(rawSlides, options) {
  const {
    extraBullet,
    defaultNote,
    maxBullets = 4
  } = options;

  return rawSlides.map((slide) => {
    const bullets = Array.isArray(slide.bullets) ? [...slide.bullets] : [];
    if (extraBullet && bullets.length > 0 && bullets.length < maxBullets) {
      bullets.push(extraBullet);
    }

    return {
      ...slide,
      bullets,
      note: slide.note || defaultNote
    };
  });
}

export const FOURIER_INTRO_SLIDES = enrichSlides(FOURIER_RAW, {
  extraBullet: tx(
    "ركّز على العلاقة بين عدد الترددات وجودة إعادة البناء؛ هذه الفكرة هي قلب الضغط الرقمي للصوت والصورة.",
    "Focus on the link between frequency count and reconstruction quality; this is the core of digital compression."
  ),
  defaultNote: tx(
    "الهدف من هذه الشرائح هو بناء حدس بصري قبل البدء بالأدوات التفاعلية داخل المختبر.",
    "These slides build visual intuition before using the interactive lab tools."
  )
});

export const NEURAL_INTRO_SLIDES = enrichSlides(NEURAL_RAW, {
  extraBullet: tx(
    "لا تقيّم النموذج بالخسارة فقط، بل راقب أيضًا شكل حد القرار وقدرته على التعميم على بيانات جديدة.",
    "Do not evaluate by loss alone; inspect the decision boundary and generalization on new data."
  ),
  defaultNote: tx(
    "يمكنك الانتقال بين بنى شبكية مختلفة ومقارنة تأثير العمق والسعة على التعلّم بشكل مباشر.",
    "You can switch architectures and compare how depth/capacity affect learning directly."
  )
});

export const ACTIVATION_INTRO_SLIDES = enrichSlides(ACTIVATION_RAW, {
  extraBullet: tx(
    "اختيار دالة التفعيل ودالة الخسارة معًا يحدد جودة التدرج واستقرار التدريب، وليس كل اختيار يناسب كل مسألة.",
    "Activation and loss choices together shape gradient quality and training stability; no single pair fits all tasks."
  ),
  defaultNote: tx(
    "جرّب نفس البيانات مع تفعيل مختلف لتلاحظ كيف يتغير شكل الاستجابة وحساسية المخرجات.",
    "Try the same data with different activations to see how response shape and sensitivity change."
  )
});

export const REGRESSION_INTRO_SLIDES = enrichSlides(REGRESSION_RAW, {
  extraBullet: tx(
    "التحليل الجيد لا يعني أفضل مطابقة تدريبية فقط؛ المهم هو التوازن بين الملاءمة والبساطة وقابلية التعميم.",
    "Good modeling is not only best training fit; it balances fit, simplicity, and generalization."
  ),
  defaultNote: tx(
    "في التطبيق العملي ستلاحظ أثر معدل التعلم، دالة الخسارة، ونوع النموذج على سرعة واستقرار التقارب.",
    "In practice, you will observe how learning rate, loss type, and model family affect convergence speed and stability."
  )
});

export const DERIVATIVE_INTRO_SLIDES = enrichSlides(DERIVATIVE_RAW, {
  extraBullet: tx(
    "فهم المماس كلحظة محلية يساعدك لاحقًا في فهم الأمثلية، حيث نبحث عن نقاط يكون عندها الميل صفريًا أو قريبًا من الصفر.",
    "Understanding tangent as local behavior helps later in optimization, where we seek near-zero slope points."
  ),
  defaultNote: tx(
    "المختبر يربط بين التعريف الرسمي للمشتقة والحدس الهندسي عبر تحكم تفاعلي مباشر على الرسم.",
    "The lab bridges formal derivative definition and geometric intuition through direct interactive control."
  )
});

export const LIMITS_INTRO_SLIDES = enrichSlides(LIMITS_RAW, {
  extraBullet: tx(
    "الفارق بين قيمة الدالة والنهاية عند النقطة هو مفتاح فهم الثغرات والاستمرارية والانقطاعات.",
    "The difference between function value and limit at a point is key to understanding holes, continuity, and discontinuities."
  ),
  defaultNote: tx(
    "كل شريحة هنا تمهّد للتحقق الرسمي بشرط إبسيلون-دلتا بطريقة تدريجية وواضحة.",
    "Each slide gradually prepares you for formal epsilon-delta reasoning."
  )
});

export const TOPOLOGY_INTRO_SLIDES = enrichSlides(TOPOLOGY_RAW, {
  extraBullet: tx(
    "الفكرة المركزية: أحيانًا يصبح حل مسألة ثنائية الأبعاد أوضح بعد نقلها إلى فضاء أعلى ثم قراءة تقاطعات البنية الناتجة.",
    "Core idea: a 2D problem can become clearer after lifting it to a higher space and reading structural intersections."
  ),
  defaultNote: tx(
    "سترى كيف يتحول الوصف الهندسي للمستطيل إلى وصف طوبولوجي قائم على التصادمات الذاتية للسطح.",
    "You will see geometric rectangle conditions become topological self-collision conditions on a surface."
  )
});

