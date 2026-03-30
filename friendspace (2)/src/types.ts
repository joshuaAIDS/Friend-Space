export type UserRole = 'admin' | 'member' | 'pending' | 'rejected' | 'new';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'new';

export interface User {
  uid: string;
  fullName: string;
  email: string;
  department: string;
  year: string;
  bio?: string;
  profileImage?: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  joinedAt: any;
  lastSeen: any;
  isOnline: boolean;
}

export interface JoinRequest {
  requestId: string;
  uid: string;
  fullName: string;
  email: string;
  department: string;
  year: string;
  reason: string;
  messageToAdmin?: string;
  profileImage?: string;
  status: ApprovalStatus;
  requestedAt: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface Chat {
  chatId: string;
  type: 'private' | 'group' | 'public';
  name?: string;
  members: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  groupImage?: string;
  description?: string;
  botIsTyping?: boolean;
}

export interface Message {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  seenBy: string[];
  createdAt: string;
  edited?: boolean;
  editedAt?: string;
  // AI related fields
  isBot?: boolean;
  senderType?: 'user' | 'ai';
  providerUsed?: string;
  replyToMessageId?: string;
  triggerReason?: string;
  moderationFlag?: boolean;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface BugReport {
  id: string;
  userId: string;
  userName: string;
  description: string;
  status: 'pending' | 'investigating' | 'fixed';
  createdAt: any;
}
