// src/server/ai/moderation.ts
export const isSafe = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  const restrictedKeywords = [
    "insult", "humiliate", "bully", "harass", "threaten", "troll", "abuse",
    "hate speech", "sexual harassment", "dox", "pile-on"
  ];

  // Simple keyword check for moderation
  // In a real app, you'd use a more sophisticated moderation API
  const containsRestricted = restrictedKeywords.some(keyword => lowerText.includes(keyword));
  
  // Check for targeted abuse patterns
  const targetedAbusePatterns = [
    /make fun of/i,
    /make .* cry/i,
    /humiliate .*/i,
    /abuse .*/i,
    /troll .*/i
  ];

  const containsTargetedAbuse = targetedAbusePatterns.some(pattern => pattern.test(lowerText));

  return !containsRestricted && !containsTargetedAbuse;
};

export const getModerationRefusalMessage = (): string => {
  return "I can keep it playful, but I won’t target or harass someone. If you want, I can give a light, friendly joke instead.";
};
