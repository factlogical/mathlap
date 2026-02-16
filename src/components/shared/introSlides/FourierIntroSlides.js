const tx = (ar, en) => ({ ar, en });

export const FOURIER_INTRO_SLIDES = [
  {
    id: "portrait",
    title: tx("جوزيف فورييه: بداية الفكرة", "Joseph Fourier: The Origin"),
    subtitle: tx(
      "سؤال فورييه كان بسيطاً وعميقاً: هل يمكن تمثيل أي إشارة كمجموع موجات جيبية؟",
      "Fourier asked a simple, profound question: can any signal be represented as a sum of sines and cosines?"
    ),
    bullets: [
      tx("الفكرة بدأت أثناء دراسة انتقال الحرارة في المعادن.", "The idea began while studying heat flow in metals."),
      tx("ثم أصبحت أساساً للصوت والصور والاتصالات الحديثة.", "It later became foundational for audio, imaging, and communications.")
    ],
    note: tx("هذه الفكرة غيّرت فهمنا للإشارات في الفيزياء والهندسة.", "This idea changed how we understand signals in physics and engineering."),
    visual: {
      type: "portrait",
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Joseph_Fourier.jpg/512px-Joseph_Fourier.jpg.webp",
      alt: tx("صورة جوزيف فورييه", "Portrait of Joseph Fourier"),
      caption: tx("Jean-Baptiste Joseph Fourier (1768-1830)", "Jean-Baptiste Joseph Fourier (1768-1830)")
    }
  },
  {
    id: "problem",
    title: tx("المشكلة التاريخية", "The Historical Problem"),
    subtitle: tx(
      "كيف تنتشر الحرارة داخل جسم معدني مع الزمن؟",
      "How does heat spread inside a metal object over time?"
    ),
    bullets: [
      tx("التوزيع الحراري المعقد يمكن تفكيكه إلى مركبات ترددية أبسط.", "A complex heat profile can be decomposed into simpler frequency components."),
      tx("كل مركبة تتطور بقانون واضح، ثم نعيد جمعها.", "Each component evolves cleanly, then we recombine them.")
    ],
    visual: {
      type: "heat",
      caption: tx("تمثيل بصري لانتشار الحرارة على قضيب معدني.", "A visual simulation of heat diffusion on a metal rod.")
    }
  },
  {
    id: "equation",
    title: tx("معادلة فورييه مشروحة", "Fourier Series Explained"),
    equation: "f(t) = A₀ + Σ [Aₙ cos(2πnt) + Bₙ sin(2πnt)]",
    equationParts: [
      {
        label: tx("f(t)", "f(t)"),
        text: tx("الإشارة أو الشكل الذي نحاول تمثيله.", "The signal or shape we want to represent.")
      },
      {
        label: tx("A₀", "A₀"),
        text: tx("المركبة الثابتة أو متوسط الإشارة (DC component).", "The constant component or signal mean (DC component).")
      },
      {
        label: tx("Aₙ و Bₙ", "Aₙ and Bₙ"),
        text: tx("قوة كل تردد في الإشارة.", "The strength of each frequency component.")
      },
      {
        label: tx("cos / sin", "cos / sin"),
        text: tx("الموجات الأساسية التي نبني منها الإشارة.", "The basis waves used to build the signal.")
      },
      {
        label: tx("Σ", "Σ"),
        text: tx("نجمع مساهمة جميع الترددات.", "Sum contributions of all frequencies.")
      }
    ],
    bullets: [
      tx("كلما أضفنا ترددات أكثر، زادت دقة إعادة البناء.", "Adding more frequencies improves reconstruction fidelity.")
    ],
    visual: {
      type: "equation-parts"
    }
  },
  {
    id: "intuition",
    title: tx("الحدس البصري", "Visual Intuition"),
    subtitle: tx(
      "أي شكل معقد يمكن تركيبه من موجات بسيطة إذا استخدمنا ترددات كافية.",
      "Any complex shape can be composed from simple waves with enough frequencies."
    ),
    bullets: [
      tx("ترددات قليلة: شكل مبسط وخشن.", "Few frequencies: coarse approximation."),
      tx("ترددات أكثر: تفاصيل أعلى وشكل أدق.", "More frequencies: finer detail and closer match.")
    ],
    visual: {
      type: "wave"
    }
  },
  {
    id: "real-world",
    title: tx("فورييه في الحياة اليومية", "Fourier in Real Life"),
    bullets: [
      tx("MP3: حذف الترددات الأقل أهمية سمعياً.", "MP3: remove perceptually less important frequencies."),
      tx("JPEG: ضغط الصور بتحويلها إلى مركبات ترددية.", "JPEG: compress images using frequency-domain transforms."),
      tx("WiFi: تمثيل البيانات وإرسالها كموجات.", "Wi-Fi: represent and transmit data as waves."),
      tx("MRI: إعادة بناء صور طبية عالية الدقة.", "MRI: reconstruct high-quality medical images.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🎵",
          title: tx("الصوت والموسيقى", "Audio and Music"),
          text: tx("التحليل الطيفي للنغمات والهارمونيك.", "Spectral analysis of notes and harmonics.")
        },
        {
          icon: "📷",
          title: tx("الصور", "Images"),
          text: tx("ضغط الصور وتقليل الحجم مع حفظ الجودة.", "Image compression with controlled quality.")
        },
        {
          icon: "📡",
          title: tx("الاتصالات", "Communications"),
          text: tx("تضمين الإشارات ونقل البيانات ترددياً.", "Frequency-domain modulation and data transfer.")
        },
        {
          icon: "🏥",
          title: tx("التطبيقات الطبية", "Medical Imaging"),
          text: tx("إعادة بناء الإشارة في MRI وCT.", "Signal reconstruction in MRI and CT.")
        }
      ]
    }
  },
  {
    id: "lab",
    title: tx("ماذا ستجد في المختبر؟", "What You Will Do in the Lab"),
    bullets: [
      tx("ترسم شكلاً حراً ثم تشاهد طيفه الترددي فوراً.", "Draw freely and instantly inspect its spectrum."),
      tx("تبني موجة من الصفر بمركبات جيبية.", "Build a wave from scratch using sinusoidal terms."),
      tx("تجرب تطبيقات حقيقية للصوت والضغط.", "Explore real audio and compression applications.")
    ],
    note: tx(
      "ابدأ بتقليل عدد الترددات تدريجياً، ولاحظ كيف تتدهور الدقة مثل ضغط الملفات.",
      "Start by reducing frequency count and watch fidelity degrade, like compression."
    ),
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🎨",
          title: tx("وضع الرسم", "Draw Mode"),
          text: tx("ارسم وشاهد كيف تبني الدوائر الشكل.", "Draw and watch epicycles rebuild the shape.")
        },
        {
          icon: "🎛️",
          title: tx("بناء موجة", "Builder Mode"),
          text: tx("ركّب الموجة من مركبات ترددية.", "Compose a waveform from frequency components.")
        },
        {
          icon: "🌍",
          title: tx("تطبيقات حقيقية", "Applications Mode"),
          text: tx("اربط المفهوم بملفات الصوت والصورة.", "Connect theory to audio/image workflows.")
        }
      ]
    }
  }
];
