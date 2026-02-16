export const ENVIRONMENT_MODES = {
  target_seeker: {
    id: "target_seeker",
    icon: "🎯",
    name: { ar: "تتبع الهدف", en: "Target Seeker" },
    description: {
      ar: "الوكيل يتعلم الوصول إلى الهدف الذي تختاره.",
      en: "Agent learns to reach the goal you place."
    },
    interaction: {
      ar: "انقر لوضع الهدف واسحبه أثناء التشغيل.",
      en: "Click to place target and drag while running."
    },
    inputCount: 7,
    outputCount: 2,
    difficulty: 1
  },
  obstacle_avoid: {
    id: "obstacle_avoid",
    icon: "🧱",
    name: { ar: "تفادي العوائق", en: "Obstacle Avoidance" },
    description: {
      ar: "الوصول للهدف مع تجنب الاصطدام بالجدران.",
      en: "Reach the goal while avoiding wall collisions."
    },
    interaction: {
      ar: "انقر لإضافة/إزالة عائق.",
      en: "Click to add/remove an obstacle."
    },
    inputCount: 10,
    outputCount: 2,
    difficulty: 2,
    defaultObstacles: [
      { x: 220, y: 110, w: 26, h: 190 },
      { x: 430, y: 210, w: 26, h: 190 }
    ]
  },
  multi_target: {
    id: "multi_target",
    icon: "⭐",
    name: { ar: "أهداف متعددة", en: "Multi Target" },
    description: {
      ar: "جمع عدة أهداف بالترتيب بأقل وقت ممكن.",
      en: "Collect multiple goals in order as fast as possible."
    },
    interaction: {
      ar: "انقر لإضافة هدف (حتى 5)، انقر على هدف لإزالته.",
      en: "Click to add up to 5 targets, click existing target to remove it."
    },
    inputCount: 9,
    outputCount: 2,
    difficulty: 3
  }
};

export const DEFAULT_ENV_MODE = "target_seeker";

export function normalizeEnvironmentMode(mode) {
  if (!mode) return DEFAULT_ENV_MODE;
  return Object.prototype.hasOwnProperty.call(ENVIRONMENT_MODES, mode)
    ? mode
    : DEFAULT_ENV_MODE;
}
