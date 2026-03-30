// src/server/chat/postBotMessage.ts
import admin from "firebase-admin";
import { Message } from "../../types.js";
import firebaseConfig from "../../../firebase-applet-config.json" assert { type: "json" };

const db = new admin.firestore.Firestore({
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId
});

export const postBotMessage = async (chatId: string, text: string, replyToMessageId?: string, providerUsed?: string, triggerReason?: string) => {
  try {
    const messageRef = db.collection("chats").doc(chatId).collection("messages").doc();
    const messageId = messageRef.id;
    
    const botMessage: Message = {
      messageId,
      chatId,
      senderId: "community-ai-bot",
      senderName: "FriendSpace AI",
      text,
      messageType: "text",
      seenBy: ["community-ai-bot"],
      createdAt: new Date().toISOString(),
      // Extended fields
      isBot: true,
      senderType: "ai",
      providerUsed,
      replyToMessageId,
      triggerReason
    } as any;

    await messageRef.set(botMessage);

    await db.collection("chats").doc(chatId).update({
      lastMessage: `FriendSpace AI: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      botIsTyping: false
    });

    console.log(`Bot message posted to chat ${chatId}`);
  } catch (error) {
    console.error("Failed to post bot message:", error);
  }
};

export const setBotTyping = async (chatId: string, isTyping: boolean) => {
  try {
    await db.collection("chats").doc(chatId).update({
      botIsTyping: isTyping
    });
  } catch (error) {
    console.error("Failed to set bot typing status:", error);
  }
};
