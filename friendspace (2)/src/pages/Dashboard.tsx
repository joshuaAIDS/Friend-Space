import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Users, 
  Bug, 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Plus,
  Search
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Chat, User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user: profile } = useAuth();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const startPrivateChat = async (recipient: User) => {
    if (!profile) return;
    
    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('members', 'array-contains', profile.uid)
      );
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => doc.data().members.includes(recipient.uid));
      
      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      // Create new chat
      const chatId = doc(collection(db, 'chats')).id;
      const newChat: Chat = {
        chatId,
        type: 'private',
        members: [profile.uid, recipient.uid],
        createdBy: profile.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'chats', chatId), newChat);
      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to start chat.');
    }
  };

  useEffect(() => {
    if (profile) {
      // Fetch recent chats
      const qChats = query(
        collection(db, 'chats'),
        where('members', 'array-contains', profile.uid),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );
      const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
        setRecentChats(snapshot.docs.map(doc => doc.data() as Chat));
      });

      // Fetch members
      const qMembers = query(
        collection(db, 'users'),
        where('approvalStatus', '==', 'approved'),
        limit(8)
      );
      const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
        setMembers(snapshot.docs.map(doc => doc.data() as User).filter(m => m.uid !== profile.uid));
        setLoading(false);
      });

      return () => {
        unsubscribeChats();
        unsubscribeMembers();
      };
    }
  }, [profile]);

  return (
    <div className="p-4 md:p-8 w-full h-full overflow-y-auto space-y-8 md:space-y-10 scrollbar-hide">
        {/* Welcome Header */}
        <section className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">Welcome back, {profile?.fullName.split(' ')[0]}! 👋</h1>
            <p className="text-gray-400 max-w-lg text-sm md:text-base">
              Your private college space is active. Connect with your friends, share notes, and help us improve by reporting any bugs you find.
            </p>
          </div>
          <div className="absolute right-[-5%] top-[-20%] w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Left Column: Chats */}
          <div className="lg:col-span-2 space-y-8 md:space-y-10">
            {/* Recent Chats */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-violet-400" />
                  Recent Conversations
                </h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate('/groups')}
                    className="text-xs md:text-sm text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Create Group
                  </button>
                  <Link to="/chats" className="text-xs md:text-sm text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              
              <div className="space-y-3">
                {recentChats.length > 0 ? (
                  recentChats.map((chat) => (
                    <Link 
                      key={chat.chatId} 
                      to={chat.type === 'private' ? `/chat/${chat.chatId}` : `/group/${chat.chatId}`}
                      className="glass-card p-4 flex items-center gap-4 hover:border-violet-500/30 transition-all group"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                        {chat.groupImage ? (
                          <img src={chat.groupImage} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-lg font-bold text-gray-500">
                            {chat.name?.charAt(0) || <Users className="w-6 h-6" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-sm truncate">{chat.name || 'Private Chat'}</h3>
                          <span className="text-[10px] text-gray-500">{chat.lastMessageTime && formatDate(chat.lastMessageTime)}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="glass-card p-8 md:p-10 text-center space-y-4">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-gray-500 text-sm">No recent conversations. Start a chat with a friend!</p>
                    <button className="btn-primary py-2 px-4 text-xs">Find Friends</button>
                  </div>
                )}
              </div>
            </section>

            {/* Bug Report CTA */}
            <section className="glass-card p-6 md:p-8 border-l-4 border-l-amber-500 bg-amber-500/5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-amber-400 flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    Found a bug?
                  </h3>
                  <p className="text-xs md:text-sm text-gray-400">Help us make FriendSpace better by reporting any issues you encounter.</p>
                </div>
                <Link to="/report-bug" className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white border border-amber-500/20 rounded-xl text-xs font-bold transition-all shrink-0">
                  Report Now
                </Link>
              </div>
            </section>
          </div>

          {/* Right Column: Members & Stats */}
          <div className="space-y-8 md:space-y-10">
            {/* Member List */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-pink-400" />
                  Members
                </h2>
                <Link to="/members" className="text-xs text-pink-400 hover:text-pink-300 font-medium">View All</Link>
              </div>

              <div className="glass-card p-4 space-y-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Find a friend..." 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>
                
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.uid} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 overflow-hidden border border-white/10 shrink-0">
                            {member.profileImage ? (
                              <img src={member.profileImage} alt={member.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                                {member.fullName.charAt(0)}
                              </div>
                            )}
                          </div>
                          {member.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0a0a0f] rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold group-hover:text-violet-400 transition-colors truncate max-w-[120px]">{member.fullName}</p>
                          <p className="text-[10px] text-gray-500 truncate">{member.department}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => startPrivateChat(member)}
                        className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-violet-500/20 hover:text-violet-400 transition-all shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Quick Stats */}
            <section className="grid grid-cols-2 gap-4">
              <StatCard icon={<Clock className="w-4 h-4" />} label="Joined" value={profile?.joinedAt ? formatDate(profile.joinedAt) : '-'} />
              <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Status" value="Approved" />
            </section>
          </div>
        </div>
      </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="glass-card p-4 flex flex-col items-center text-center">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-2 text-violet-400">
      {icon}
    </div>
    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{label}</p>
    <p className="text-sm font-bold">{value}</p>
  </div>
);

export default Dashboard;
