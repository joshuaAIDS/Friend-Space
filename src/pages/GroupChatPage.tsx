import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  limit, 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  Users,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Menu,
  ShieldAlert
} from 'lucide-react';
import { Chat, Message, User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const GroupChatPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user: profile } = useAuth();
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!groupId || !profile) return;

    // Fetch group details
    const unsubscribeChat = onSnapshot(doc(db, 'chats', groupId), async (snapshot) => {
      if (snapshot.exists()) {
        const chatData = snapshot.data() as Chat;
        setChat(chatData);

        // Fetch members details
        const memberPromises = chatData.members.map(uid => getDoc(doc(db, 'users', uid)));
        const memberSnaps = await Promise.all(memberPromises);
        setMembers(memberSnaps.map(snap => snap.data() as User));
      } else {
        toast.error('Group not found.');
        navigate('/dashboard');
      }
    });

    // Fetch messages
    const qMessages = query(
      collection(db, 'chats', groupId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as Message));
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [groupId, profile, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !groupId || !profile) return;

    const text = inputText;
    setInputText('');

    try {
      const messageId = doc(collection(db, 'chats', groupId, 'messages')).id;
      const messageData: Message = {
        messageId,
        chatId: groupId,
        senderId: profile.uid,
        senderName: profile.fullName,
        text,
        messageType: 'text',
        seenBy: [profile.uid],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'chats', groupId, 'messages', messageId), messageData);
      
      await updateDoc(doc(db, 'chats', groupId), {
        lastMessage: `${profile.fullName.split(' ')[0]}: ${text}`,
        lastMessageTime: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !groupId || !profile) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');

    setUploading(true);
    try {
      const storageRef = ref(storage, `chats/${groupId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      const messageId = doc(collection(db, 'chats', groupId, 'messages')).id;
      const messageData: Message = {
        messageId,
        chatId: groupId,
        senderId: profile.uid,
        senderName: profile.fullName,
        text: isImage ? `${profile.fullName.split(' ')[0]} sent an image` : `${profile.fullName.split(' ')[0]} sent a file: ${file.name}`,
        messageType: isImage ? 'image' : 'file',
        fileUrl,
        fileName: file.name,
        seenBy: [profile.uid],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'chats', groupId, 'messages', messageId), messageData);
      
      await updateDoc(doc(db, 'chats', groupId), {
        lastMessage: isImage ? `📷 ${profile.fullName.split(' ')[0]} sent image` : `📄 ${profile.fullName.split(' ')[0]} sent file`,
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

  return (
    <Layout hideTopbar>
      <div className={cn(
        "h-[calc(100vh)] flex flex-col relative transition-all duration-500",
        !isFocused && "blur-xl grayscale pointer-events-none select-none"
      )}>
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

        {/* Chat Header */}
        <header className="h-20 glass border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all hidden md:block">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-indigo-600/20 overflow-hidden border border-indigo-500/30 flex items-center justify-center">
              {chat?.groupImage ? (
                <img src={chat.groupImage} alt={chat.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs md:text-sm leading-none mb-1 truncate max-w-[120px] md:max-w-none">{chat?.name || 'Group Chat'}</h3>
              <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-tighter truncate">
                {chat?.members.length} Members • {members.filter(m => m.isOnline).length} Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={cn("p-2 md:p-2.5 rounded-xl transition-all", showInfo ? "bg-violet-600 text-white" : "hover:bg-white/5 text-gray-400 hover:text-white")}
            >
              <Info className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all"><MoreVertical className="w-4 h-4 md:w-5 md:h-5" /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide bg-[#0a0a0f]">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === profile?.uid;
                const showSender = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                
                return (
                  <motion.div
                    key={msg.messageId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                  >
                    {!isMe && showSender && (
                      <span className="text-[8px] md:text-[10px] font-bold text-gray-500 ml-1 mb-1 uppercase tracking-widest">{msg.senderName}</span>
                    )}
                    <div className={cn(
                      "p-2.5 md:p-3 rounded-2xl text-xs md:text-sm shadow-lg max-w-[85%] md:max-w-[70%]",
                      isMe 
                        ? "bg-violet-600 text-white rounded-br-none" 
                        : "bg-white/5 border border-white/10 text-gray-200 rounded-bl-none"
                    )}>
                      {msg.messageType === 'text' && <p className="leading-relaxed break-words">{msg.text}</p>}
                      {msg.messageType === 'image' && (
                        <div className="space-y-2">
                          <img src={msg.fileUrl} alt="Shared" className="rounded-xl max-h-48 md:max-h-60 object-cover" />
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
                    <span className="text-[8px] md:text-[9px] text-gray-500 mt-1 px-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Group Info Sidebar */}
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: window.innerWidth < 768 ? '100%' : 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className={cn(
                  "glass border-l border-white/5 overflow-hidden flex flex-col z-40",
                  "fixed inset-y-0 right-0 md:relative md:inset-auto"
                )}
              >
                <div className="p-4 md:p-6 flex-1 overflow-y-auto scrollbar-hide">
                  <div className="flex justify-end md:hidden mb-4">
                    <button onClick={() => setShowInfo(false)} className="p-2 rounded-xl bg-white/5 text-gray-400">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-indigo-600/20 mx-auto mb-4 flex items-center justify-center border border-indigo-500/30">
                      {chat?.groupImage ? (
                        <img src={chat.groupImage} alt={chat.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
                      )}
                    </div>
                    <h4 className="text-lg md:text-xl font-bold mb-1">{chat?.name}</h4>
                    <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed">{chat?.description || 'No description provided.'}</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h5 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center justify-between">
                        <span>Members ({members.length})</span>
                        {profile?.role === 'admin' && <Plus className="w-3 h-3 cursor-pointer hover:text-violet-400" />}
                      </h5>
                      <div className="space-y-3">
                        {members.map((m) => (
                          <div key={m.uid} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 overflow-hidden border border-white/10">
                                  {m.profileImage ? (
                                    <img src={m.profileImage} alt={m.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-500">
                                      {m.fullName.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                {m.isOnline && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-2 md:w-2.5 h-2 md:h-2.5 bg-green-500 border-2 border-[#0a0a0f] rounded-full" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] md:text-xs font-bold group-hover:text-violet-400 transition-colors truncate max-w-[120px]">{m.fullName}</p>
                                <p className="text-[8px] md:text-[9px] text-gray-500 truncate">{m.department}</p>
                              </div>
                            </div>
                            {m.role === 'admin' && <ShieldCheck className="w-3 h-3 text-violet-500 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 glass border-t border-white/5">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-0.5 md:gap-1">
              <label className="p-2 md:p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer">
                <input type="file" className="hidden" onChange={handleFileUpload} />
                <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
              </label>
              <button type="button" className="hidden sm:block p-2.5 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message the group..."
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
      </div>
    </Layout>
  );
};

export default GroupChatPage;
