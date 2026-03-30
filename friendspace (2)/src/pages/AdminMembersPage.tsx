import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  doc, 
  updateDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Search, 
  Filter,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Ban,
  CheckCircle2,
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  Edit3,
  X
} from 'lucide-react';
import { User } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const AdminMembersPage = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'member'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('approvalStatus', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as User);
      // Sort in memory to avoid index requirement
      data.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setMembers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members. Please check your connection or permissions.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleRole = async (user: User) => {
    setProcessingId(user.uid);
    try {
      const newRole = user.role === 'admin' ? 'member' : 'admin';
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      toast.success(`User role updated to ${newRole}.`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update role.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevokeAccess = async (user: User) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${user.fullName}?`)) return;
    
    setProcessingId(user.uid);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        approvalStatus: 'rejected',
        role: 'rejected',
        updatedAt: new Date().toISOString()
      });
      toast.success('Access revoked successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to revoke access.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteMember = async (user: User) => {
    if (!window.confirm(`PERMANENT DELETE: Are you sure you want to delete ${user.fullName} and all their data from Firestore? This cannot be undone. Note: This will NOT delete their login account from Firebase Auth.`)) return;
    
    setProcessingId(user.uid);
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      toast.success('User record deleted from Firestore.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete user record.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || m.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 w-full h-full overflow-y-auto scrollbar-hide">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Manage Members</h1>
            <p className="text-gray-500 text-xs md:text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage roles and access for all approved students
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group flex-1 sm:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-12 pr-6 py-2.5 w-full sm:w-64 text-sm"
              />
            </div>
            <div className="flex items-center bg-white/5 border border-white/5 rounded-2xl p-1 overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setFilterRole('all')}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap", filterRole === 'all' ? "bg-violet-600 text-white" : "text-gray-500 hover:text-white")}
              >
                All
              </button>
              <button 
                onClick={() => setFilterRole('admin')}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap", filterRole === 'admin' ? "bg-violet-600 text-white" : "text-gray-500 hover:text-white")}
              >
                Admins
              </button>
              <button 
                onClick={() => setFilterRole('member')}
                className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap", filterRole === 'member' ? "bg-violet-600 text-white" : "text-gray-500 hover:text-white")}
              >
                Members
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            <p className="text-gray-500 font-medium">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="glass-card p-10 md:p-20 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/5 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2">No Members Found</h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm">Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredMembers.map((m) => (
                <motion.div
                  key={m.uid}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card p-5 md:p-6 group hover:border-violet-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 overflow-hidden border border-white/10">
                          {m.profileImage ? (
                            <img src={m.profileImage} alt={m.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base md:text-xl font-bold text-gray-600">
                              {m.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        {m.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-[#0a0a0f] rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm group-hover:text-violet-400 transition-colors truncate max-w-[120px] md:max-w-none">{m.fullName}</h4>
                        <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest font-bold">{m.role}</p>
                      </div>
                    </div>
                    
                    <div className="relative group/menu">
                      <button className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-48 glass-card p-2 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-40 shadow-2xl">
                        <button 
                          onClick={() => handleToggleRole(m)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-all"
                        >
                          {m.role === 'admin' ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          {m.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                        <button 
                          onClick={() => handleRevokeAccess(m)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-xs text-red-400 hover:text-red-300 transition-all"
                        >
                          <Ban className="w-4 h-4" />
                          Revoke Access
                        </button>
                        <button 
                          onClick={() => handleDeleteMember(m)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-600/20 text-xs text-red-500 hover:text-red-400 transition-all font-bold"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Record
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <Mail className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <GraduationCap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span className="truncate">{m.department} • {m.year}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span>Joined {new Date(m.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    <button className="flex-1 py-2 rounded-xl bg-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-white/10 hover:text-white transition-all">
                      View Profile
                    </button>
                    <button className="flex-1 py-2 rounded-xl bg-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-white/10 hover:text-white transition-all">
                      Message
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMembersPage;
