import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  Check,
  CheckCheck,
  Menu,
  ShieldAlert,
  Plus,
  Users as UsersIcon,
  Search,
  X,
  MessageSquare
} from 'lucide-react';
import { Chat, Message, User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { user: profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [existingChats, setExistingChats] = useState<Chat[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isGroupView = location.pathname.startsWith('/groups');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') setIsFocused(true);
      else setIsFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Prevent right click and copy
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);

    // Detect PrintScreen and other restricted keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        toast.warning('Screenshots are restricted for privacy.');
        setIsFocused(false);
        setTimeout(() => setIsFocused(true), 2000);
      }
      // Block Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        toast.error('Saving pages is restricted for privacy.');
      }
      // Block Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toast.error('Printing is restricted for privacy.');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!chatId || !profile) return;

    if (chatId === 'community') {
      setChat({
        chatId: 'community',
        type: 'public',
        name: 'Community Chat',
        members: [],
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Chat);
      setRecipient(null);
    } else {
      // Fetch chat details
      const unsubscribeChat = onSnapshot(doc(db, 'chats', chatId), async (snapshot) => {
        if (snapshot.exists()) {
          const chatData = snapshot.data() as Chat;
          setChat(chatData);

          // Fetch recipient details for private chat
          if (chatData.type === 'private') {
            const recipientId = chatData.members.find(m => m !== profile.uid);
            if (recipientId) {
              const recipientSnap = await getDoc(doc(db, 'users', recipientId));
              if (recipientSnap.exists()) {
                setRecipient(recipientSnap.data() as User);
              }
            }
          }
        } else {
          toast.error('Chat not found.');
          navigate('/dashboard');
        }
      });
      return () => unsubscribeChat();
    }
  }, [chatId, profile, navigate]);

  useEffect(() => {
    if (!chatId || !profile) return;

    // Fetch messages
    const qMessages = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as Message));
    });

    return () => {
      unsubscribeMessages();
    };
  }, [chatId, profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chatId || !profile) return;

    const text = inputText;
    setInputText('');

    try {
      const messageId = doc(collection(db, 'chats', chatId, 'messages')).id;
      const messageData: Message = {
        messageId,
        chatId,
        senderId: profile.uid,
        senderName: profile.fullName,
        text,
        messageType: 'text',
        seenBy: [profile.uid],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'chats', chatId, 'messages', messageId), messageData);
      
      // Update chat last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !chatId || !profile) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');

    setUploading(true);
    try {
      const storageRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      const messageId = doc(collection(db, 'chats', chatId, 'messages')).id;
      const messageData: Message = {
        messageId,
        chatId,
        senderId: profile.uid,
        senderName: profile.fullName,
        text: isImage ? 'Sent an image' : `Sent a file: ${file.name}`,
        messageType: isImage ? 'image' : 'file',
        fileUrl,
        fileName: file.name,
        seenBy: [profile.uid],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'chats', chatId, 'messages', messageId), messageData);
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: isImage ? '📷 Image' : `📄 ${file.name}`,
        lastMessageTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    if (!profile) return;

    // Fetch existing chats for the user
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', profile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => doc.data() as Chat);
      setExistingChats(chats);
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!chatId && profile) {
      const q = query(collection(db, 'users'), where('approvalStatus', '==', 'approved'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMembers(snapshot.docs.map(doc => doc.data() as User).filter(m => m.uid !== profile.uid));
      });
      return () => unsubscribe();
    }
  }, [chatId, profile]);

  const handleCreateGroup = async () => {
    if (!profile || !groupName.trim() || selectedMembers.length === 0) {
      toast.error('Please provide a group name and select at least one member.');
      return;
    }

    setCreatingGroup(true);
    try {
      const newChatId = doc(collection(db, 'chats')).id;
      const newChat: Chat = {
        chatId: newChatId,
        type: 'group',
        name: groupName.trim(),
        description: groupDescription.trim(),
        members: [profile.uid, ...selectedMembers],
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'chats', newChatId), newChat);
      
      // Send initial system message
      const messageId = doc(collection(db, 'chats', newChatId, 'messages')).id;
      await setDoc(doc(db, 'chats', newChatId, 'messages', messageId), {
        messageId,
        chatId: newChatId,
        senderId: 'system',
        senderName: 'System',
        text: `${profile.fullName} created the group "${groupName}"`,
        messageType: 'text',
        seenBy: [profile.uid],
        createdAt: new Date().toISOString(),
      });

      toast.success('Group created successfully!');
      setIsCreateGroupModalOpen(false);
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      navigate(`/groups/${newChatId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create group.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const startPrivateChat = async (recipient: User | { uid: string, fullName: string }) => {
    if (!profile) return;
    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('members', 'array-contains', profile.uid)
      );
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => doc.data().members.includes(recipient.uid));
      if (existingChat) {
        navigate(`/chats/${existingChat.id}`);
        return;
      }
      const newChatId = doc(collection(db, 'chats')).id;
      const newChat: Chat = {
        chatId: newChatId,
        type: 'private',
        members: [profile.uid, recipient.uid],
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'chats', newChatId), newChat);
      navigate(`/chats/${newChatId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to start chat.');
    }
  };

  const [chatUserNames, setChatUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchNames = async () => {
      const names: Record<string, string> = {};
      for (const c of existingChats) {
        if (c.type === 'private') {
          const otherId = c.members.find(m => m !== profile?.uid);
          if (otherId && !chatUserNames[otherId]) {
            const uSnap = await getDoc(doc(db, 'users', otherId));
            if (uSnap.exists()) {
              names[c.chatId] = (uSnap.data() as User).fullName;
            }
          }
        }
      }
      if (Object.keys(names).length > 0) {
        setChatUserNames(prev => ({ ...prev, ...names }));
      }
    };
    if (existingChats.length > 0) fetchNames();
  }, [existingChats, profile]);

  const toggleMemberSelection = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const onEmojiClick = (emojiObject: any) => {
    setInputText(prev => prev + emojiObject.emoji);
  };

  const filteredChats = existingChats.filter(c => isGroupView ? c.type === 'group' : c.type === 'private');

  return (
    <div className={cn(
      "h-screen flex bg-[#0a0a0f] overflow-hidden relative transition-all duration-500",
      !isFocused && "blur-xl grayscale pointer-events-none select-none"
    )}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {!isFocused && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-20 h-20 bg-violet-600/20 rounded-3xl flex items-center justify-center mb-6 border border-violet-500/30 animate-pulse">
            <ShieldAlert className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Privacy Protected</h2>
          <p className="text-gray-400 text-sm">Screenshots and recording are restricted in this chat.</p>
        </div>
      )}

      {/* Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.02] flex flex-wrap gap-20 p-10 overflow-hidden select-none rotate-[-25deg] items-center justify-center content-center">
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} className="text-2xl font-bold whitespace-nowrap uppercase tracking-[0.2em]">
            {profile?.fullName} • {profile?.email}
          </span>
        ))}
      </div>

      {/* Left Column: Chat List */}
      <div className={cn(
        "w-full lg:w-[400px] border-r border-white/5 flex flex-col glass z-10 shrink-0",
        chatId ? "hidden lg:flex" : "flex"
      )}>
        <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">{isGroupView ? 'Groups' : 'Chats'}</h1>
          </div>
          {isGroupView && (
            <button 
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-lg shadow-violet-600/20"
              title="Create New Group"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {/* Existing Chats Section */}
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 px-2">Recent {isGroupView ? 'Groups' : 'Conversations'}</h2>
            <div className="space-y-2">
              {filteredChats.map((c) => {
                const chatName = c.type === 'group' ? c.name : chatUserNames[c.chatId];
                const isActive = chatId === c.chatId;
                return (
                  <button
                    key={c.chatId}
                    onClick={() => navigate(c.type === 'group' ? `/groups/${c.chatId}` : `/chats/${c.chatId}`)}
                    className={cn(
                      "w-full p-4 flex items-center gap-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                      isActive 
                        ? "bg-violet-600/20 border-violet-500/50" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center font-bold border transition-transform duration-500",
                      isActive 
                        ? "bg-violet-600 text-white border-violet-400" 
                        : "bg-violet-600/20 text-violet-400 border-violet-500/30 group-hover:scale-110"
                    )}>
                      {c.type === 'group' ? <UsersIcon className="w-5 h-5" /> : (chatName?.charAt(0) || 'P')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "font-bold text-sm truncate transition-colors",
                        isActive ? "text-white" : "group-hover:text-violet-400"
                      )}>{chatName || (c.type === 'group' ? 'Unnamed Group' : 'Private Chat')}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{c.lastMessage || 'No messages yet'}</p>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]" />}
                  </button>
                );
              })}
              {filteredChats.length === 0 && (
                <div className="py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                  <p className="text-gray-500 text-[10px]">No {isGroupView ? 'groups' : 'chats'} found.</p>
                </div>
              )}
            </div>
          </section>

          {/* New Chat Section */}
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 px-2">
              {isGroupView ? 'Direct Messages' : 'New Conversation'}
            </h2>
            <div className="space-y-2">
              {members.map((member) => (
                <button
                  key={member.uid}
                  onClick={() => startPrivateChat(member)}
                  className="w-full p-3 flex items-center gap-3 rounded-2xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all text-left group"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden border border-white/10">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt={member.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                          {member.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    {member.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a0a0f] rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs group-hover:text-violet-400 transition-colors truncate">{member.fullName}</p>
                    <p className="text-[9px] text-gray-500 truncate">{member.department}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Right Column: Chat Content */}
      <div className={cn(
        "flex-1 flex flex-col relative z-20",
        !chatId ? "hidden lg:flex items-center justify-center bg-[#0a0a0f]" : "flex"
      )}>
        {chatId ? (
          <>
            {/* Chat Header */}
            <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-4 md:px-8 shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => navigate(isGroupView ? '/groups' : '/chats')} 
                  className="lg:hidden p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-violet-600/20 overflow-hidden border border-violet-500/30">
                    {recipient?.profileImage ? (
                      <img src={recipient.profileImage} alt={recipient.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs md:text-sm font-bold text-violet-400">
                        {recipient?.fullName.charAt(0) || chat?.name?.charAt(0) || 'C'}
                      </div>
                    )}
                  </div>
                  {recipient?.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-[#0a0a0f] rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs md:text-sm leading-none mb-1 truncate max-w-[120px] md:max-w-none">{recipient?.fullName || chat?.name || 'Chat'}</h3>
                  <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-tighter truncate">
                    {recipient?.isOnline ? 'Online Now' : recipient?.lastSeen ? `Last seen ${formatDate(recipient.lastSeen)}` : 'Member'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"><Phone className="w-4 h-4 md:w-5 md:h-5" /></button>
                <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"><Video className="w-4 h-4 md:w-5 md:h-5" /></button>
                <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"><MoreVertical className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide bg-[#0a0a0f]">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === profile?.uid;
                  const showSender = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                  
                  return (
                    <motion.div
                      key={msg.messageId}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn("flex items-end gap-2 md:gap-3", isMe ? "flex-row-reverse" : "flex-row")}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 overflow-hidden border border-white/10 shrink-0 mb-1">
                          {recipient?.profileImage ? (
                            <img src={recipient.profileImage} alt={recipient.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-500">
                              {msg.senderName.charAt(0)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className={cn("max-w-[85%] md:max-w-[70%] flex flex-col", isMe ? "items-end" : "items-start")}>
                        {showSender && (
                          <button 
                            onClick={() => !isMe && msg.senderId !== 'system' && startPrivateChat({ uid: msg.senderId, fullName: msg.senderName })}
                            className={cn(
                              "text-[8px] md:text-[10px] font-bold mb-1 uppercase tracking-widest transition-colors",
                              isMe ? "text-violet-400 mr-1" : "text-gray-500 ml-1 hover:text-violet-400"
                            )}
                          >
                            {isMe ? 'You' : msg.senderName}
                          </button>
                        )}
                        <div className={cn(
                          "p-2.5 md:p-3 rounded-2xl text-xs md:text-sm shadow-lg w-full",
                          isMe 
                            ? "bg-violet-600 text-white rounded-br-none" 
                            : "bg-white/5 border border-white/10 text-gray-200 rounded-bl-none"
                        )}>
                          {msg.messageType === 'text' && <p className="leading-relaxed break-words">{msg.text}</p>}
                          {msg.messageType === 'image' && (
                            <div className="space-y-2">
                              <img src={msg.fileUrl} alt="Shared" className="rounded-xl max-h-48 md:max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                            </div>
                          )}
                          {msg.messageType === 'file' && (
                            <div className="flex items-center gap-2 md:gap-3 p-2 rounded-xl bg-black/20 border border-white/5">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 md:w-5 md:h-5 text-violet-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] md:text-xs font-bold truncate">{msg.fileName}</p>
                                <p className="text-[8px] md:text-[10px] text-gray-400">Document</p>
                              </div>
                              <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg transition-all">
                                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className={cn("flex items-center gap-1.5 md:gap-2 px-1", isMe ? "justify-end" : "justify-start")}>
                          <span className="text-[8px] md:text-[9px] text-gray-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            <span className="text-violet-500">
                              {msg.seenBy.length > 1 ? <CheckCheck className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <Check className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 glass border-t border-white/5 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-4 max-w-5xl mx-auto">
                <div className="flex items-center gap-0.5 md:gap-1">
                  <label className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                  </label>
                  <div className="relative" ref={emojiPickerRef}>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                    >
                      <Smile className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl"
                        >
                          <EmojiPicker 
                            onEmojiClick={onEmojiClick}
                            theme={Theme.DARK}
                            lazyLoadEmojis={true}
                            searchDisabled={false}
                            skinTonesDisabled={true}
                            height={400}
                            width={300}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 md:px-6 py-2.5 md:py-3.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                  />
                  {uploading && (
                    <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] text-violet-400 font-bold uppercase tracking-widest">
                      <Loader2 className="w-2.5 h-2.5 md:w-3 md:h-3 animate-spin" />
                      <span className="hidden sm:inline">Uploading...</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || uploading}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="text-center space-y-6 max-w-md px-6">
            <div className="w-24 h-24 bg-violet-600/10 rounded-[32px] flex items-center justify-center mx-auto border border-violet-500/20 relative">
              <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full animate-pulse" />
              <MessageSquare className="w-12 h-12 text-violet-400 relative z-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Your Messages</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Select a conversation from the list or start a new one to begin chatting with your friends.
              </p>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all"
            >
              View Conversations
            </button>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateGroupModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateGroupModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-2xl p-8 md:p-12 rounded-[40px] relative z-10 shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Create New Group</h3>
                <button onClick={() => setIsCreateGroupModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto pr-2 scrollbar-hide">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Group Name</label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Description (Optional)</label>
                  <textarea 
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="What is this group about?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all h-24 resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Select Members ({selectedMembers.length})</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" placeholder="Search..." className="bg-white/5 border border-white/5 rounded-full py-2 pl-9 pr-4 text-[10px] focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.map((member) => (
                      <button
                        key={member.uid}
                        onClick={() => toggleMemberSelection(member.uid)}
                        className={cn(
                          "p-3 rounded-2xl border transition-all flex items-center gap-3 text-left group",
                          selectedMembers.includes(member.uid)
                            ? "bg-violet-600/20 border-violet-500/50"
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden border border-white/10 shrink-0">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={member.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                              {member.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate group-hover:text-violet-400 transition-colors">{member.fullName}</p>
                          <p className="text-[9px] text-gray-500 truncate">{member.department}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                          selectedMembers.includes(member.uid)
                            ? "bg-violet-600 border-violet-400"
                            : "border-white/10"
                        )}>
                          {selectedMembers.includes(member.uid) && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-white/5">
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
                  className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-[24px] font-bold text-lg transition-all shadow-2xl shadow-violet-600/30 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {creatingGroup ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>Create Group Chat</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
