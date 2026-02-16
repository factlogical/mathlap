import neatTopologyImg from "../../../assets/intro/neat-topology.svg";
import neatEvolutionImg from "../../../assets/intro/neat-evolution.svg";
import neatFounderImg from "../../../assets/intro/kenneth-o-stanley-official.jpeg";

const tx = (ar, en) => ({ ar, en });

export const NEAT_INTRO_SLIDES = [
  {
    id: "what-is-neat",
    title: tx("منشأ خوارزمية NEAT وفكرتها", "NEAT Origin & Core Idea"),
    subtitle: tx(
      "ظهرت NEAT في ورقة عام 2002 على يد Kenneth O. Stanley وRisto Miikkulainen، وفكرتها أن بنية الشبكة نفسها تتطور مع الأوزان.",
      "NEAT was introduced in a 2002 paper by Kenneth O. Stanley and Risto Miikkulainen, with the core idea that topology evolves with weights."
    ),
    bullets: [
      tx("لا تفرض بنية نهائية من البداية: تبدأ الشبكات صغيرة جدًا.", "Do not force a final architecture upfront: networks start minimal."),
      tx("خلال التطور تتم إضافة عقد ووصلات فقط عندما تفيد الأداء.", "Nodes and connections are added only when they improve performance."),
      tx("تقسيم المجتمع إلى أنواع (Species) يحمي الأفكار الجديدة من الاختفاء المبكر.", "Species preserve novel structures from early elimination.")
    ],
    visual: {
      type: "portrait",
      src: neatFounderImg,
      fallbackSrc: neatTopologyImg,
      alt: tx("توضيح Kenneth O. Stanley أحد مبتكري NEAT", "Illustration of Kenneth O. Stanley, NEAT co-creator"),
      caption: tx("Kenneth O. Stanley - أحد مبتكري NEAT", "Kenneth O. Stanley - NEAT co-creator")
    }
  },
  {
    id: "history",
    title: tx("كيف تتطور البنية العصبية؟", "How Does Topology Evolve?"),
    subtitle: tx(
      "الصورة التالية تشرح جوهر NEAT: الشبكة لا تكبر عشوائيًا، بل تنمو تدريجيًا وفق الانتقاء والطفرات المفيدة.",
      "This view captures the core of NEAT: topology does not grow randomly, it expands gradually through useful mutations and selection."
    ),
    bullets: [
      tx("طفرة الأوزان تضبط السلوك سريعًا في الأجيال المبكرة.", "Weight mutation quickly adjusts behavior in early generations."),
      tx("طفرة إضافة وصلة أو عقدة تسمح بقدرات جديدة عند الحاجة.", "Adding a connection or node enables new capabilities when needed."),
      tx("التهجين (Crossover) يجمع مزايا جينومات ناجحة داخل المجتمع.", "Crossover combines useful genes from successful genomes.")
    ],
    visual: {
      type: "portrait",
      src: neatTopologyImg,
      alt: tx("رسم تطور بنية NEAT", "NEAT topology evolution illustration"),
      caption: tx("الصورة البنائية: تطور العقد والوصلات عبر الأجيال", "Topology view: nodes and links evolve across generations"),
      secondarySrc: neatEvolutionImg,
      secondaryAlt: tx("رسم سلوك التطور في المختبر", "Evolution behavior in the lab"),
      secondaryCaption: tx("الهدف: أداء أعلى مع تعقيد محسوب", "Goal: higher performance with controlled complexity")
    }
  },
  {
    id: "interactive-goal",
    title: tx("الرسم التفاعلي: تطور عصبي حي", "Interactive Visual: Live Neuroevolution"),
    subtitle: tx(
      "في هذه البطاقة سترى شعارًا عصبيًا رمزيًا يوضح كيف تتبدل قوة الوصلات وتظهر مسارات جديدة أثناء التطور.",
      "This card shows a symbolic neural emblem that visualizes changing link strengths and emerging pathways during evolution."
    ),
    bullets: [
      tx("العقد تمثل وحدات عصبية، والوصلات تمثل جينات الاتصال بينها.", "Nodes represent neural units, links represent connection genes."),
      tx("النبض والوميض يعبّران عن نشاط الشبكة وتدفق الإشارة.", "Pulse and glow reflect activation flow through the network."),
      tx("هذا تصور تعليمي لفهم NEAT قبل بدء محاكاة اللعبة داخل البيئة.", "This is a teaching visual to understand NEAT before running the game simulation.")
    ],
    visual: { type: "neuroevolution" }
  },
  {
    id: "tabs-guide",
    title: tx("ماذا تعني كل شاشة؟", "What Does Each View Mean?"),
    bullets: [
      tx("المجتمع: بطاقات الأفراد مرتبة حسب اللياقة مع خريطة الأنواع.", "Population: genome cards ranked by fitness with species map."),
      tx("الجينوم: فحص DNA الشبكة (عقد + وصلات + أوزان).", "Genome: inspect network DNA (nodes + links + weights)."),
      tx("البيئة: 150 طائرًا يتعلمون Flappy Bird في الوقت الحقيقي.", "Environment: 150 birds learning Flappy Bird in real time."),
      tx("الإحصائيات: منحنيات التحسن والتنوع والتعقيد عبر الأجيال.", "Dashboard: progress, diversity, and complexity trends.")
    ],
    visual: {
      type: "icon-grid",
      items: [
        {
          icon: "🫧",
          title: tx("المجتمع", "Population"),
          text: tx("اختيار أفضل جينوم وفهم الأنواع", "Pick top genomes and inspect species")
        },
        {
          icon: "🧬",
          title: tx("الجينوم", "Genome"),
          text: tx("مشاهدة البنية العصبية بالتفصيل", "See topology and weights in detail")
        },
        {
          icon: "🐦",
          title: tx("Flappy", "Flappy"),
          text: tx("مشاهدة الطيور تتطور جيلًا بعد جيل", "Watch birds improve generation after generation")
        },
        {
          icon: "⚙️",
          title: tx("الإعدادات", "Settings"),
          text: tx("تحكم في الطفرات وحجم المجتمع", "Tune mutations and population size")
        }
      ]
    }
  },
  {
    id: "stats-read",
    title: tx("كيف تقرأ النتائج؟", "How To Read Results"),
    subtitle: tx(
      "لا تركز على رقم واحد فقط. راقب اللياقة + عدد الأنواع + نمو الشبكة معًا.",
      "Do not focus on one metric only. Track fitness, species count, and topology growth together."
    ),
    equation: "δ = (E + D) / N + 0.4W",
    bullets: [
      tx("صعود أفضل لياقة مع بقاء عدة أنواع = تطور صحي.", "Rising best fitness with multiple species = healthy evolution."),
      tx("اختفاء الأنواع مبكرًا قد يعني فقدان التنوع.", "Early species collapse may indicate loss of diversity."),
      tx("زيادة العقد والوصلات يجب أن تقابلها فائدة فعلية في الأداء.", "Growth in nodes/links should lead to measurable gains.")
    ],
    visual: {
      type: "portrait",
      src: neatEvolutionImg,
      alt: tx("لوحة تطور NEAT", "NEAT evolution dashboard"),
      caption: tx("تتبع اللياقة والتنوع والتعقيد عبر الأجيال", "Track fitness, diversity, and complexity over generations")
    }
  },
  {
    id: "start-plan",
    title: tx("خطة تجربة سريعة", "Quick Start Plan"),
    bullets: [
      tx("1) شغّل التطور وراقب كيف تموت الطيور بسرعة في الجيل الأول.", "1) Start evolution and observe early generations failing quickly."),
      tx("2) بعد عدة أجيال ستبدأ بعض الطيور بتجاوز أنبوب واحد أو أكثر.", "2) After a few generations, some birds will pass one or more pipes."),
      tx("3) جرّب Presets مختلفة وقارن سرعة التحسن مقابل الاستقرار.", "3) Try different presets and compare speed vs. stability."),
      tx("4) اختر أفضل جينوم وافتحه في شاشة الجينوم لفحص البنية الناتجة.", "4) Open the best genome and inspect the evolved topology.")
    ],
    note: tx(
      "هدف المختبر: فهم سلوك التطور العصبي بصريًا، وليس فقط الوصول لرقم كبير.",
      "The lab goal is visual understanding of neuroevolution behavior, not just chasing one large score."
    ),
    visual: { type: "layers" }
  }
];

