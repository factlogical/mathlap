export const parseLocalCommand = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Pattern: "eps 0.5", "epsilon = 0.5", "e 0.5"
    const epsMatch = lower.match(/^(?:epsilon|eps|e|إ?بسيلون|ابسلون|ايه)\s*=?\s*(\d*\.?\d+)$/i);
    if (epsMatch) {
        return { type: "UPDATE_PARAM", param: "epsilon", value: parseFloat(epsMatch[1]) };
    }

    // Pattern: "delta 0.2", "del = 0.2", "d 0.2"
    const deltaMatch = lower.match(/^(?:delta|del|d|دلتا|د)\s*=?\s*(\d*\.?\d+)$/i);
    if (deltaMatch) {
        return { type: "UPDATE_PARAM", param: "delta", value: parseFloat(deltaMatch[1]) };
    }

    // Pattern: "lim 4", "limit = 4", "l -2"
    const limMatch = lower.match(/^(?:limit|lim|l|نهاية|حد)\s*=?\s*(-?\d*\.?\d+)$/i);
    if (limMatch) {
        return { type: "UPDATE_PARAM", param: "L", value: parseFloat(limMatch[1]) };
    }

    // Pattern: "a 2", "point = 2"
    const pointMatch = lower.match(/^(?:point|a|نقطة|س)\s*=?\s*(-?\d*\.?\d+)$/i);
    if (pointMatch) {
        return { type: "UPDATE_PARAM", param: "a", value: parseFloat(pointMatch[1]) };
    }

    // Pattern: "reset", "clear", "اعادة"
    if (["reset", "clear", "اعادة", "إعادة", "صفر"].includes(lower)) {
        return { type: "RESET" };
    }

    return null;
};
