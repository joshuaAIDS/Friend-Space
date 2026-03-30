// src/server/ai/triggerDetector.ts
export const isBotTriggered = (text: string, botName: string = "FriendSpaceAI"): boolean => {
  const lowerText = text.toLowerCase();
  const lowerBotName = botName.toLowerCase();
  const wakePhrases = ["hey bot", "friendspace ai"];
  const commands = ["/ai"];

  // Check for mentions
  if (lowerText.includes(`@${lowerBotName}`)) return true;

  // Check for commands
  if (commands.some(cmd => lowerText.startsWith(cmd))) return true;

  // Check for wake phrases
  if (wakePhrases.some(phrase => lowerText.includes(phrase))) return true;

  return false;
};
