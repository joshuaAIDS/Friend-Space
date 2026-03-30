import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { JoinRequest, User, Chat, UserRole, BugReport } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronRight,
  Megaphone,
  TrendingUp,
  Loader2,
  Mail,
  BookOpen,
  GraduationCap,
  Bug,
  AlertCircle,
  Wrench,
  Edit3,
  Save
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn, toJSDate } from '../lib/utils';
import { toast } from 'sonner';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'members' | 'rejected' | 'bugs'>('overview');
  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  
  // Edit Profile State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    bio: '',
    department: '',
    year: ''
  });

  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [bugSearchTerm, setBugSearchTerm] = useState('');
  const [removeConfirmUser, setRemoveConfirmUser] = useState<User | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    // Fetch pending requests
    const qRequests = query(
      collection(db, 'joinRequests'),
      where('status', '==', 'pending')
    );
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      setPendingRequests(snapshot.docs.map(doc => ({ ...doc.data() } as JoinRequest)));
    }, (error) => {
      console.error('Error fetching join requests:', error);
      toast.error('Failed to load join requests.');
    });

    // Fetch approved users
    const qApproved = query(
      collection(db, 'users'),
      where('approvalStatus', '==', 'approved'),
      orderBy('joinedAt', 'desc'),
      limit(50)
    );
    const unsubscribeApproved = onSnapshot(qApproved, (snapshot) => {
      setApprovedUsers(snapshot.docs.map(doc => ({ ...doc.data() } as User)));
    }, (error) => {
      console.error('Error fetching approved users:', error);
    });

    // Fetch rejected users
    const qRejected = query(
      collection(db, 'users'),
      where('approvalStatus', '==', 'rejected'),
      orderBy('joinedAt', 'desc'),
      limit(50)
    );
    const unsubscribeRejected = onSnapshot(qRejected, (snapshot) => {
      setRejectedUsers(snapshot.docs.map(doc => ({ ...doc.data() } as User)));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching rejected users:', error);
      setLoading(false);
    });

    // Fetch bug reports
    const qBugs = query(
      collection(db, 'bugs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribeBugs = onSnapshot(qBugs, (snapshot) => {
      setBugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BugReport)));
    }, (error) => {
      console.error('Error fetching bug reports:', error);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeApproved();
      unsubscribeRejected();
      unsubscribeBugs();
    };
  }, [user]);

  const handleApprove = async (request: JoinRequest) => {
    try {
      // Update join request status
      await updateDoc(doc(db, 'joinRequests', request.requestId), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid
      });

      // Update user status and role
      await updateDoc(doc(db, 'users', request.uid), {
        approvalStatus: 'approved',
        role: 'member',
        joinedAt: serverTimestamp()
      });

      toast.success(`Approved ${request.fullName} successfully!`);
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve user.');
    }
  };

  const handleReject = async (request: JoinRequest) => {
    try {
      // Update join request status
      await updateDoc(doc(db, 'joinRequests', request.requestId), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid
      });

      // Update user status
      await updateDoc(doc(db, 'users', request.uid), {
        approvalStatus: 'rejected',
        role: 'rejected'
      });

      toast.success(`Rejected ${request.fullName}.`);
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject user.');
    }
  };

  const handleRoleUpdate = async () => {
    if (!roleChangeUser || !selectedRole) return;
    
    // Prevent self-demotion for safety
    if (roleChangeUser.uid === user?.uid && selectedRole !== 'admin') {
      toast.error("You cannot demote yourself from Admin status.");
      return;
    }

    setIsUpdatingRole(true);
    try {
      await updateDoc(doc(db, 'users', roleChangeUser.uid), {
        role: selectedRole,
        updatedAt: serverTimestamp()
      });
      toast.success(`Role for ${roleChangeUser.fullName} updated to ${selectedRole}.`);
      setRoleChangeUser(null);
      setSelectedRole(null);
      setIsRoleModalOpen(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!editingUser) return;
    
    setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      toast.success(`Profile for ${editingUser.fullName} updated successfully.`);
      setEditingUser(null);
      setIsEditProfileModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update user profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateBugStatus = async (bugId: string, newStatus: 'pending' | 'investigating' | 'fixed') => {
    try {
      await updateDoc(doc(db, 'bugs', bugId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Bug status updated to ${newStatus}.`);
    } catch (error) {
      console.error('Error updating bug status:', error);
      toast.error('Failed to update bug status.');
    }
  };

  const handleRemoveMember = async () => {
    if (!removeConfirmUser) return;
    
    setIsRemoving(true);
    try {
      await updateDoc(doc(db, 'users', removeConfirmUser.uid), {
        approvalStatus: 'rejected',
        role: 'rejected',
        updatedAt: serverTimestamp()
      });
      toast.success(`Member ${removeConfirmUser.fullName} has been removed.`);
      setRemoveConfirmUser(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member.');
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredRequests = pendingRequests.filter(req => 
    req.fullName.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
    req.email.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
    req.department.toLowerCase().includes(requestSearchTerm.toLowerCase())
  );

  const filteredMembers = approvedUsers.filter(u => 
    u.fullName.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    u.department.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  const filteredBugs = bugs.filter(bug => 
    bug.userName.toLowerCase().includes(bugSearchTerm.toLowerCase()) ||
    bug.description.toLowerCase().includes(bugSearchTerm.toLowerCase())
  );

  const stats = [
    { name: 'Total Users', value: (approvedUsers.length + rejectedUsers.length + pendingRequests.length).toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { name: 'Pending Requests', value: pendingRequests.length.toString(), icon: UserPlus, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { name: 'Approved Members', value: approvedUsers.length.toString(), icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { name: 'Rejected Users', value: rejectedUsers.length.toString(), icon: UserX, color: 'text-red-400', bg: 'bg-red-400/10' },
    { name: 'Bug Reports', value: bugs.length.toString(), icon: Bug, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  ];

  return (
    <div className="p-4 md:p-8 lg:p-12 w-full h-full overflow-y-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative scrollbar-hide">
      {/* Background Blobs for Admin Dashboard */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none animate-float" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-10 relative z-10">
        <div className="space-y-2 md:space-y-4">
          <h1 className="text-2xl md:text-5xl font-bold tracking-tighter flex items-center gap-3 md:gap-5 bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
            <div className="w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-2xl shadow-violet-500/10 group hover:rotate-6 transition-transform duration-500">
              <ShieldCheck className="w-5 h-5 md:w-7 md:h-7 text-violet-400" />
            </div>
            Admin Control
          </h1>
          <p className="text-white/40 text-sm md:text-2xl font-medium tracking-tight ml-1 md:ml-2">Manage users, requests, and community settings.</p>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 bg-white/[0.03] backdrop-blur-3xl p-1.5 md:p-3 rounded-xl md:rounded-[32px] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar max-w-full">
          {(['overview', 'requests', 'members', 'rejected', 'bugs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 md:px-10 py-2.5 md:py-5 rounded-lg md:rounded-[24px] text-[10px] md:text-sm font-bold capitalize transition-all duration-500 relative overflow-hidden group/tab shrink-0",
                activeTab === tab 
                  ? "text-white shadow-2xl shadow-violet-600/30 scale-105" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <span className="relative z-10 tracking-[0.1em]">{tab}</span>
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-8 relative z-10">
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="glass-card p-4 md:p-10 rounded-2xl md:rounded-[48px] shadow-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-colors duration-500"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 md:w-32 md:h-32 bg-white/5 blur-[40px] md:blur-[60px] rounded-full group-hover:bg-white/10 transition-colors duration-700" />
                
                <div className={cn("w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-8 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-2xl relative z-10 border border-white/10", stat.bg, stat.color)}>
                  <stat.icon className="w-5 h-5 md:w-8 md:h-8" />
                </div>
                <div className="relative z-10">
                  <p className="text-[8px] md:text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] md:tracking-[0.3em]">{stat.name}</p>
                  <p className="text-2xl md:text-7xl font-bold mt-1 md:mt-4 tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 relative z-10">
            {/* Recent Requests Widget */}
            <section className="glass-card p-6 md:p-12 rounded-3xl md:rounded-[56px] shadow-2xl relative overflow-hidden group/widget">
              <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-amber-500/5 blur-[80px] md:blur-[100px] rounded-full pointer-events-none group-hover/widget:bg-amber-500/10 transition-colors duration-700" />
              
              <div className="flex items-center justify-between mb-8 md:mb-12 relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                    <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                  </div>
                  Recent Requests
                </h2>
                <button onClick={() => setActiveTab('requests')} className="px-4 md:px-6 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] md:text-xs text-amber-400 font-bold transition-all tracking-widest uppercase">View All</button>
              </div>
              <div className="space-y-4 md:space-y-6 relative z-10">
                {pendingRequests.length > 0 ? (
                  pendingRequests.slice(0, 5).map((req, idx) => (
                    <motion.div 
                      key={req.requestId} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 md:p-8 bg-white/[0.02] hover:bg-white/[0.06] rounded-2xl md:rounded-[36px] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all duration-500 shadow-xl"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-[24px] bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center text-violet-400 font-bold text-lg md:text-2xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                          {req.fullName[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm md:text-xl tracking-tight text-white/90">{req.fullName}</h4>
                          <p className="text-[8px] md:text-[10px] text-white/30 font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] mt-1 md:mt-1.5">{req.department} • {req.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleApprove(req)}
                          className="p-2 md:p-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg md:rounded-[20px] transition-all duration-500 shadow-xl hover:shadow-emerald-500/30"
                        >
                          <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7" />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReject(req)}
                          className="p-2 md:p-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg md:rounded-[20px] transition-all duration-500 shadow-xl hover:shadow-red-500/30"
                        >
                          <XCircle className="w-5 h-5 md:w-7 md:h-7" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 md:py-24 bg-white/[0.01] rounded-2xl md:rounded-[40px] border border-dashed border-white/5">
                    <p className="text-white/20 text-sm md:text-xl font-medium tracking-tight">No pending requests.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Members Widget */}
            <section className="glass-card p-6 md:p-12 rounded-3xl md:rounded-[56px] shadow-2xl relative overflow-hidden group/widget">
              <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-emerald-500/5 blur-[80px] md:blur-[100px] rounded-full pointer-events-none group-hover/widget:bg-emerald-500/10 transition-colors duration-700" />
              
              <div className="flex items-center justify-between mb-8 md:mb-12 relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                    <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                  </div>
                  Newest Members
                </h2>
                <button onClick={() => setActiveTab('members')} className="px-4 md:px-6 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] md:text-xs text-emerald-400 font-bold transition-all tracking-widest uppercase">View All</button>
              </div>
              <div className="space-y-4 md:space-y-6 relative z-10">
                {approvedUsers.length > 0 ? (
                  approvedUsers.slice(0, 5).map((u, idx) => (
                    <motion.div 
                      key={u.uid} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 md:p-8 bg-white/[0.02] hover:bg-white/[0.06] rounded-2xl md:rounded-[36px] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all duration-500 shadow-xl"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-[24px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg md:text-2xl border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                          {u.fullName[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm md:text-xl tracking-tight text-white/90">{u.fullName}</h4>
                          <p className="text-[8px] md:text-[10px] text-white/30 font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] mt-1 md:mt-1.5">{u.department} • {u.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setEditingUser(u);
                            setEditFormData({
                              fullName: u.fullName,
                              bio: u.bio || '',
                              department: u.department,
                              year: u.year
                            });
                            setIsEditProfileModalOpen(true);
                          }}
                          className="p-2 md:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-white/20 bg-white/5 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full border border-white/5 group-hover:text-emerald-400 group-hover:bg-emerald-400/10 group-hover:border-emerald-400/20 transition-all duration-500">
                          {u.joinedAt ? formatDistanceToNow(toJSDate(u.joinedAt)!, { addSuffix: true }) : ''}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 md:py-24 bg-white/[0.01] rounded-2xl md:rounded-[40px] border border-dashed border-white/5">
                    <UserCheck className="mx-auto text-white/5 mb-4 md:mb-6 w-10 h-10 md:w-16 md:h-16" />
                    <p className="text-white/20 font-bold uppercase tracking-widest text-xs">No approved members yet</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-8 md:space-y-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:gap-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Pending Join Requests ({pendingRequests.length})</h2>
            <div className="relative group/search">
              <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-violet-400 transition-colors w-5 h-5 md:w-6 md:h-6" />
              <input 
                type="text" 
                placeholder="Search requests..." 
                value={requestSearchTerm}
                onChange={(e) => setRequestSearchTerm(e.target.value)}
                className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-[32px] py-4 md:py-6 pl-12 md:pl-16 pr-6 md:pr-8 text-sm md:text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full sm:w-96 transition-all shadow-2xl placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
            {filteredRequests.map((req, idx) => (
              <motion.div 
                key={req.requestId}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-6 md:p-12 rounded-3xl md:rounded-[64px] shadow-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-700 border border-white/5 hover:border-white/10"
              >
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-violet-600/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-violet-600/10 transition-colors" />
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 md:mb-12 relative z-10">
                  <div className="flex items-center gap-4 md:gap-8">
                    <div className="w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[40px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl md:text-4xl border border-white/10 shadow-2xl group-hover:rotate-6 transition-transform duration-700">
                      {req.fullName[0]}
                    </div>
                    <div>
                      <h4 className="text-2xl md:text-4xl font-bold tracking-tight text-white/90">{req.fullName}</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4 mt-2 md:mt-4">
                        <span className="px-3 md:px-5 py-1.5 md:py-2 rounded-full bg-white/5 text-[8px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.1em] md:tracking-[0.25em] flex items-center gap-1.5 md:gap-2 border border-white/5 shadow-lg">
                          <BookOpen className="w-3 h-3 md:w-4 md:h-4" /> {req.department}
                        </span>
                        <span className="px-3 md:px-5 py-1.5 md:py-2 rounded-full bg-white/5 text-[8px] md:text-[10px] font-bold text-white/40 uppercase tracking-[0.1em] md:tracking-[0.25em] flex items-center gap-1.5 md:gap-2 border border-white/5 shadow-lg">
                          <GraduationCap className="w-3 h-3 md:w-4 md:h-4" /> {req.year}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.1em] md:tracking-[0.25em] bg-white/5 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full border border-white/5 self-start md:mt-4">
                    {req.requestedAt ? formatDistanceToNow(toJSDate(req.requestedAt)!, { addSuffix: true }) : ''}
                  </span>
                </div>

                <div className="flex-1 space-y-6 md:space-y-8 mb-8 md:mb-14 relative z-10">
                  <div className="p-6 md:p-10 bg-white/[0.02] rounded-2xl md:rounded-[48px] border border-white/5 shadow-inner group-hover:bg-white/[0.04] transition-colors">
                    <p className="text-[8px] md:text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-3 md:mb-5">Reason for joining</p>
                    <p className="text-base md:text-xl text-white/80 leading-relaxed italic font-medium">"{req.reason}"</p>
                  </div>
                  {req.messageToAdmin && (
                    <div className="p-6 md:p-10 bg-violet-500/[0.03] border border-violet-500/10 rounded-2xl md:rounded-[48px] shadow-lg group-hover:bg-violet-500/[0.05] transition-colors">
                      <p className="text-[8px] md:text-[10px] font-bold text-violet-400/50 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-3 md:mb-5">Message to Admin</p>
                      <p className="text-sm md:text-lg text-violet-200/70 leading-relaxed font-medium">{req.messageToAdmin}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8 relative z-10">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleApprove(req)}
                    className="py-4 md:py-7 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl md:rounded-[36px] font-bold text-sm md:text-lg transition-all shadow-2xl shadow-emerald-600/20 flex items-center justify-center gap-2 md:gap-4 group/btn border border-emerald-400/20"
                  >
                    <CheckCircle2 className="w-5 h-5 md:w-8 md:h-8 group-hover/btn:scale-110 transition-transform" /> Approve
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleReject(req)}
                    className="py-4 md:py-7 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl md:rounded-[36px] font-bold text-sm md:text-lg transition-all shadow-2xl shadow-red-600/20 flex items-center justify-center gap-2 md:gap-4 group/btn border border-red-400/20"
                  >
                    <XCircle className="w-5 h-5 md:w-8 md:h-8 group-hover/btn:scale-110 transition-transform" /> Reject
                  </motion.button>
                </div>
              </motion.div>
            ))}
            {pendingRequests.length === 0 && (
              <div className="col-span-full p-20 md:p-40 text-center glass-card rounded-[40px] md:rounded-[80px] border border-dashed border-white/10 shadow-2xl">
                <div className="w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[40px] bg-white/5 flex items-center justify-center mx-auto mb-8 md:mb-12 border border-white/10">
                  <UserPlus className="w-10 h-10 md:w-14 md:h-14 text-white/10" />
                </div>
                <p className="text-white/30 text-xl md:text-3xl font-bold uppercase tracking-[0.2em]">No pending join requests</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-10">
            <h2 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Approved Members ({approvedUsers.length})</h2>
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-violet-400 transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Search members..." 
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] py-6 pl-16 pr-8 text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full sm:w-96 transition-all shadow-2xl placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="glass-card rounded-[64px] border border-white/10 overflow-hidden shadow-2xl relative group/table">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.05] border-b border-white/10">
                    <th className="p-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Member</th>
                    <th className="p-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Department</th>
                    <th className="p-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Year</th>
                    <th className="p-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Joined</th>
                    <th className="p-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((u, idx) => (
                    <motion.tr 
                      key={u.uid} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/5 hover:bg-white/[0.04] transition-all duration-500 group/row"
                    >
                      <td className="p-10">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-2xl group-hover/row:scale-110 group-hover/row:rotate-3 transition-transform duration-500">
                            {u.fullName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-xl tracking-tight text-white/90">{u.fullName}</p>
                            <p className="text-sm text-white/30 font-medium mt-1 uppercase tracking-widest">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-10">
                        <span className="px-5 py-2.5 rounded-full bg-white/5 text-[10px] font-bold text-white/60 uppercase tracking-widest border border-white/5 shadow-lg group-hover/row:bg-violet-500/10 group-hover/row:border-violet-500/20 group-hover/row:text-violet-400 transition-all duration-500">
                          {u.department}
                        </span>
                      </td>
                      <td className="p-10">
                        <span className="px-5 py-2.5 rounded-full bg-white/5 text-[10px] font-bold text-white/60 uppercase tracking-widest border border-white/5 shadow-lg">
                          {u.year}
                        </span>
                      </td>
                      <td className="p-10">
                        <span className="text-sm font-bold text-white/30 uppercase tracking-widest">
                          {u.joinedAt ? format(toJSDate(u.joinedAt)!, 'MMM d, yyyy') : 'N/A'}
                        </span>
                      </td>
                      <td className="p-10">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              setEditingUser(u);
                              setEditFormData({
                                fullName: u.fullName,
                                bio: u.bio || '',
                                department: u.department,
                                year: u.year
                              });
                              setIsEditProfileModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg"
                          >
                            Edit Profile
                          </button>
                          <button 
                            onClick={() => {
                              setRoleChangeUser(u);
                              setSelectedRole(u.role);
                              setIsRoleModalOpen(true);
                            }}
                            className="px-4 py-2 bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white border border-violet-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg"
                          >
                            Change Role
                          </button>
                          {u.uid !== user?.uid && (
                            <button 
                              onClick={() => setRemoveConfirmUser(u)}
                              className="px-4 py-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg"
                            >
                              Remove
                            </button>
                          )}
                          <button className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/40 hover:text-white transition-all duration-500 hover:scale-110 active:scale-95 shadow-xl">
                            <MoreVertical size={24} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rejected' && (
        <div className="space-y-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-10">
            <h2 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Rejected Users ({rejectedUsers.length})</h2>
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-violet-400 transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Search rejected..." 
                className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] py-6 pl-16 pr-8 text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full sm:w-96 transition-all shadow-2xl placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {rejectedUsers.map((u, idx) => (
              <motion.div 
                key={u.uid}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-10 rounded-[48px] shadow-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500 border border-white/5 hover:border-white/10"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-red-600/10 transition-colors" />
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-red-600/20 to-orange-600/20 flex items-center justify-center text-red-400 font-bold text-3xl border border-white/10 shadow-2xl group-hover:rotate-6 transition-transform duration-500">
                    {u.fullName[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-white/90">{u.fullName}</h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1.5">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-[32px] border border-white/5">
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-red-400/60">
                    <XCircle size={18} /> Rejected
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 hover:text-white/60 transition-colors">Re-evaluate</button>
                </div>
              </motion.div>
            ))}
            {rejectedUsers.length === 0 && (
              <div className="col-span-full p-40 text-center glass-card rounded-[80px] border border-dashed border-white/10 shadow-2xl">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-10 border border-white/10">
                  <UserX size={40} className="text-white/10" />
                </div>
                <p className="text-white/30 text-3xl font-bold uppercase tracking-[0.2em]">No rejected users</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="space-y-12 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-10">
            <h2 className="text-5xl font-bold tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Bug Reports ({bugs.length})</h2>
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-violet-400 transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Search bugs..." 
                value={bugSearchTerm}
                onChange={(e) => setBugSearchTerm(e.target.value)}
                className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] py-6 pl-16 pr-8 text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full sm:w-96 transition-all shadow-2xl placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {filteredBugs.map((bug, idx) => (
              <motion.div 
                key={bug.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-8 md:p-12 rounded-[48px] shadow-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500 border border-white/5 hover:border-white/10"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-violet-600/10 transition-colors" />
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
                  <div className="space-y-6 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-lg">
                        <Bug className="w-6 h-6 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white/90">Reported by {bug.userName}</h3>
                        <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">
                          {bug.createdAt ? format(toJSDate(bug.createdAt)!, 'MMM d, yyyy • HH:mm') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-8 bg-white/[0.02] rounded-[32px] border border-white/5 shadow-inner">
                      <p className="text-lg text-white/80 leading-relaxed">{bug.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className={cn(
                        "px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 border shadow-lg",
                        bug.status === 'pending' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        bug.status === 'investigating' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        bug.status === 'fixed' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        {bug.status === 'pending' && <Clock className="w-4 h-4" />}
                        {bug.status === 'investigating' && <Search className="w-4 h-4" />}
                        {bug.status === 'fixed' && <CheckCircle2 className="w-4 h-4" />}
                        {bug.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2 text-center md:text-left">Update Status</p>
                    <button 
                      onClick={() => handleUpdateBugStatus(bug.id, 'investigating')}
                      disabled={bug.status === 'investigating'}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-xl",
                        bug.status === 'investigating' 
                          ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed" 
                          : "bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white"
                      )}
                    >
                      <Search className="w-4 h-4" /> Investigating
                    </button>
                    <button 
                      onClick={() => handleUpdateBugStatus(bug.id, 'fixed')}
                      disabled={bug.status === 'fixed'}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-xl",
                        bug.status === 'fixed' 
                          ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed" 
                          : "bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600 hover:text-white"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Fixed
                    </button>
                    <button 
                      onClick={() => handleUpdateBugStatus(bug.id, 'pending')}
                      disabled={bug.status === 'pending'}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-xl",
                        bug.status === 'pending' 
                          ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed" 
                          : "bg-amber-600/10 text-amber-400 border-amber-500/20 hover:bg-amber-600 hover:text-white"
                      )}
                    >
                      <Clock className="w-4 h-4" /> Pending
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {bugs.length === 0 && (
              <div className="p-40 text-center glass-card rounded-[80px] border border-dashed border-white/10 shadow-2xl">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-10 border border-white/10">
                  <Bug size={40} className="text-white/10" />
                </div>
                <p className="text-white/30 text-3xl font-bold uppercase tracking-[0.2em]">No bug reports found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      <AnimatePresence>
        {isRoleModalOpen && roleChangeUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoleModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-xl p-12 rounded-[56px] relative z-10 shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto border border-violet-500/20 shadow-2xl">
                  <ShieldCheck size={32} className="text-violet-400" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-bold tracking-tight">Change User Role</h3>
                  <p className="text-white/40 text-lg font-medium">
                    Update the role for <span className="text-white font-bold">{roleChangeUser.fullName}</span>. 
                    Current role: <span className="text-violet-400 font-bold uppercase tracking-widest text-sm">{roleChangeUser.role}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4">
                  <button 
                    onClick={() => setSelectedRole('admin')}
                    className={cn(
                      "w-full py-6 rounded-[28px] font-bold text-xl transition-all flex items-center justify-center gap-4 border",
                      selectedRole === 'admin' 
                        ? "bg-violet-600 text-white shadow-2xl shadow-violet-600/20 border-violet-400/20" 
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <ShieldCheck size={28} /> Admin
                  </button>
                  <button 
                    onClick={() => setSelectedRole('member')}
                    className={cn(
                      "w-full py-6 rounded-[28px] font-bold text-xl transition-all flex items-center justify-center gap-4 border",
                      selectedRole === 'member' 
                        ? "bg-violet-600 text-white shadow-2xl shadow-violet-600/20 border-violet-400/20" 
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Users size={28} /> Member
                  </button>
                </div>

                <div className="pt-8">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRoleUpdate}
                    disabled={isUpdatingRole || selectedRole === roleChangeUser.role}
                    className={cn(
                      "w-full py-6 rounded-[28px] font-bold text-xl transition-all flex items-center justify-center gap-4 shadow-2xl",
                      selectedRole === roleChangeUser.role
                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500"
                    )}
                  >
                    {isUpdatingRole ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>Confirm Update</>
                    )}
                  </motion.button>
                </div>

                <button 
                  onClick={() => setIsRoleModalOpen(false)}
                  className="w-full py-4 text-white/30 hover:text-white font-bold uppercase tracking-[0.2em] text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileModalOpen && editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditProfileModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-2xl p-8 md:p-12 rounded-[40px] md:rounded-[56px] relative z-10 shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-2xl">
                    <Edit3 size={24} className="text-blue-400 md:w-8 md:h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-4xl font-bold tracking-tight">Edit Member Profile</h3>
                    <p className="text-white/40 text-sm md:text-lg font-medium">Updating details for <span className="text-white font-bold">{editingUser.fullName}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm md:text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Department</label>
                    <input
                      type="text"
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm md:text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Year</label>
                    <select
                      value={editFormData.year}
                      onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm md:text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Bio / Status</label>
                  <textarea
                    rows={4}
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    className="bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm md:text-base w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                    placeholder="User's bio..."
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleProfileUpdate}
                    disabled={isUpdatingProfile}
                    className="flex-1 py-4 md:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[24px] md:rounded-[32px] font-bold text-base md:text-xl transition-all shadow-2xl flex items-center justify-center gap-3"
                  >
                    {isUpdatingProfile ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    Save Changes
                  </motion.button>
                  <button 
                    onClick={() => setIsEditProfileModalOpen(false)}
                    className="flex-1 py-4 md:py-6 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-[24px] md:rounded-[32px] font-bold text-base md:text-xl transition-all border border-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Member Confirmation Modal */}
      <AnimatePresence>
        {removeConfirmUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRemoveConfirmUser(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-12 rounded-[56px] relative z-10 shadow-2xl border border-red-500/20 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20 shadow-2xl">
                  <UserX size={32} className="text-red-400" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-bold tracking-tight">Remove Member?</h3>
                  <p className="text-white/40 text-lg font-medium">
                    Are you sure you want to remove <span className="text-white font-bold">{removeConfirmUser.fullName}</span> from FriendSpace? 
                    This will revoke their access and move them to the rejected list.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-8">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRemoveMember}
                    disabled={isRemoving}
                    className="w-full py-6 rounded-[28px] bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-xl hover:from-red-500 hover:to-orange-500 transition-all shadow-2xl shadow-red-600/20 flex items-center justify-center gap-4"
                  >
                    {isRemoving ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirm Removal</>}
                  </motion.button>
                  <button 
                    onClick={() => setRemoveConfirmUser(null)}
                    className="w-full py-4 text-white/20 hover:text-white/40 font-bold uppercase tracking-widest text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
