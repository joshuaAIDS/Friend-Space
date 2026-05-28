// src/server/chat/communityChatListener.ts
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Message } from "../../types.js";
import { isBotTriggered } from "../ai/triggerDetector.js";
import { isSafe, getModerationRefusalMessage } from "../ai/moderation.js";
import { buildSystemPrompt, buildUserPrompt } from "../ai/promptBuilder.js";
import { generateAIResponse } from "../ai/providerManager.js";
import { postBotMessage, setBotTyping } from "./postBotMessage.js";
import firebaseConfig from "../../../firebase-applet-config.json" assert { type: "json" };

// Use a helper to get the firestore instance lazily
let _db: admin.firestore.Firestore | null = null;
const getDb = () => {
  if (!_db) {
    _db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  }
  return _db;
};

export const initChatListener = async () => {
  console.log("Initializing Community Chat Listener for AI Bot...");

  const db = getDb();
  // Ensure 'community' chat document exists
  const communityChatRef = db.collection("chats").doc("community");
  const communityChatDoc = await communityChatRef.get();
  
  if (!communityChatDoc.exists) {
    console.log("Creating 'community' chat document...");
    await communityChatRef.set({
      chatId: "community",
      type: "group",
      name: "Community Chat",
      members: [], // Public chat, but we can track active members if needed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: "Welcome to the community chat!",
      lastMessageTime: new Date().toISOString(),
      createdBy: "system"
    });
  }

  // Listen to messages in the 'community' chat specifically
  const communityMessagesRef = communityChatRef.collection("messages");
  
  let isFirstRun = true;

  communityMessagesRef.orderBy("createdAt", "desc").limit(1).onSnapshot(async (snapshot) => {
    if (isFirstRun) {
      isFirstRun = false;
      return; // Skip initial snapshot
    }

    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const messageData = change.doc.data() as Message;
        const chatId = "community"; // We know it's the community chat

        // Skip if message was sent by the bot itself
        if (messageData.senderId === "community-ai-bot") return;

        // Check if bot is triggered
        const triggered = isBotTriggered(messageData.text);
        
        if (triggered) {
          console.log(`Bot triggered by message: "${messageData.text}" in community chat`);

          // Set typing status
          await setBotTyping(chatId, true);

          // 1. Check moderation
          if (!isSafe(messageData.text)) {
            console.log("Message failed moderation. Sending refusal message.");
            await postBotMessage(chatId, getModerationRefusalMessage(), messageData.messageId, "moderation", "unsafe_input");
            return;
          }

          // 2. Collect recent chat history for context
          const historySnap = await db.collection("chats").doc(chatId).collection("messages")
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
            
          const recentMessages = historySnap.docs
            .map(doc => doc.data() as Message)
            .reverse();

          // 3. Build prompts
          const systemPrompt = buildSystemPrompt();
          const userPrompt = buildUserPrompt(recentMessages, messageData);

          // 4. Generate AI response
          const aiResponse = await generateAIResponse(systemPrompt, userPrompt);

          // 5. Check output moderation
          if (!isSafe(aiResponse)) {
            console.log("AI response failed moderation. Sending safe fallback.");
            await postBotMessage(chatId, "I should keep things friendly and safe for everyone. Let's talk about something else!", messageData.messageId, "moderation", "unsafe_output");
            return;
          }

          // 6. Post bot message
          await postBotMessage(chatId, aiResponse, messageData.messageId, "ai", "triggered");
        }
      }
    });
  }, (error) => {
    console.error("Chat listener error:", error);
  });
};
