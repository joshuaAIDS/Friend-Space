import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  doc, 
  updateDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Search, 
  Filter,
  MoreVertical,
  Clock,
  Loader2,
  Users,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { JoinRequest } from '../types';
import { toast } from 'sonner';

const AdminRequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'joinRequests'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Fetched join requests snapshot size:", snapshot.size);
      const data = snapshot.docs.map(doc => {
        const d = doc.data() as JoinRequest;
        return d;
      });
      // Sort in memory to avoid index requirement
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching join requests:", error);
      handleFirestoreError(error, OperationType.LIST, 'joinRequests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAction = async (requestId: string, userId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      // Update request status
      await updateDoc(doc(db, 'joinRequests', requestId), {
        status: action,
        updatedAt: new Date().toISOString()
      });

      // Update user profile
      await updateDoc(doc(db, 'users', userId), {
        approvalStatus: action,
        role: action === 'approved' ? 'member' : 'pending',
        ...(action === 'rejected' && { role: 'rejected' }),
        updatedAt: new Date().toISOString()
      });

      // Create notification for user
      const notificationId = doc(collection(db, 'notifications')).id;
      await setDoc(doc(db, 'notifications', notificationId), {
        notificationId,
        userId,
        title: action === 'approved' ? 'Welcome to FriendSpace!' : 'Join Request Update',
        message: action === 'approved' 
          ? 'Your request has been approved. Welcome to the community!' 
          : 'Unfortunately, your join request was not approved at this time.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });

      toast.success(`Request ${action} successfully.`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to process request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteRequest = async (requestId: string, fullName: string) => {
    if (!window.confirm(`Are you sure you want to delete the join request from ${fullName}? This will remove it from the list entirely.`)) return;
    
    setProcessingId(requestId);
    try {
      await deleteDoc(doc(db, 'joinRequests', requestId));
      toast.success('Request deleted successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete request.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 md:p-8 w-full h-full overflow-y-auto scrollbar-hide">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Join Requests</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Review pending applications for FriendSpace
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-xs font-bold sm:hidden">Refresh</span>
            </button>
            <div className="relative group flex-1 sm:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input pl-12 pr-6 py-2.5 w-full sm:w-64 text-sm"
              />
            </div>
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex items-center justify-center">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            <p className="text-gray-500 font-medium">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass-card p-12 md:p-20 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 mx-auto mb-6 flex items-center justify-center">
              <Users className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2">No Pending Requests</h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm md:text-base">All caught up! There are no pending join requests to review at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((req) => (
                <motion.div
                  key={req.requestId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-4 md:p-6 flex flex-col lg:flex-row items-start lg:items-center gap-4 md:gap-8 group hover:border-violet-500/30 transition-all"
                >
                  <div className="flex items-center gap-4 md:gap-5 w-full lg:w-auto lg:flex-1">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 overflow-hidden border border-white/10 shrink-0">
                      {req.profileImage ? (
                        <img src={req.profileImage} alt={req.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg md:text-xl font-bold text-gray-600">
                          {req.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base md:text-lg font-bold mb-1 truncate group-hover:text-violet-400 transition-colors">{req.fullName}</h4>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0" />{req.email}</span>
                        <span className="flex items-center gap-1.5"><GraduationCap className="w-3 h-3 shrink-0" />{req.department} • {req.year}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 shrink-0" />{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:flex-1 bg-white/5 rounded-xl md:rounded-2xl p-4 border border-white/5 italic text-sm text-gray-400 relative mt-2 lg:mt-0">
                    <p className="line-clamp-2">"{req.reason}"</p>
                    <div className="absolute -top-2 -left-2 w-5 h-5 md:w-6 md:h-6 bg-violet-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">“</div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto lg:shrink-0 mt-4 lg:mt-0">
                    <button
                      onClick={() => handleAction(req.requestId, req.uid, 'approved')}
                      disabled={processingId === req.requestId}
                      className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 rounded-xl md:rounded-2xl bg-green-600 text-white font-bold text-xs md:text-sm hover:bg-green-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50"
                    >
                      {processingId === req.requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">Approve</span>
                      <span className="sm:hidden">Approve</span>
                    </button>
                    <button
                      onClick={() => handleAction(req.requestId, req.uid, 'rejected')}
                      disabled={processingId === req.requestId}
                      className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 rounded-xl md:rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 font-bold text-xs md:text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === req.requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      <span className="hidden sm:inline">Reject</span>
                      <span className="sm:hidden">Reject</span>
                    </button>
                    <div className="relative group/menu">
                      <button className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white/5 text-gray-500 hover:text-white transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 top-full mt-2 w-48 glass-card p-2 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-40 shadow-2xl">
                        <button 
                          onClick={() => handleDeleteRequest(req.requestId, req.fullName)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-600/20 text-xs text-red-500 hover:text-red-400 transition-all font-bold"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Request
                        </button>
                      </div>
                    </div>
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

export default AdminRequestsPage;
