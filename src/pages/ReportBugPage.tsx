import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  limit
} from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { Bug, Send, Loader2, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatDate } from '../lib/utils';

interface BugReport {
  bugId: string;
  userId: string;
  userName: string;
  description: string;
  status: 'pending' | 'fixed' | 'investigating';
  createdAt: any;
}

const ReportBugPage = () => {
  const { user: profile } = useAuth();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bugs'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBugs(snapshot.docs.map(doc => ({ bugId: doc.id, ...doc.data() } as BugReport)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !profile) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bugs'), {
        userId: profile.uid,
        userName: profile.fullName,
        description: description.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Bug reported successfully! Thank you for your feedback.');
      setDescription('');
    } catch (error) {
      console.error('Error reporting bug:', error);
      toast.error('Failed to report bug. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center border border-violet-500/30 shadow-2xl shadow-violet-600/20">
            <Bug className="text-violet-400 w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Report a Bug</h1>
          <p className="text-white/40 text-lg max-w-2xl">
            Facing issues? Let us know. Your reports help us make FriendSpace better for everyone.
          </p>
        </div>

        {/* Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 rounded-[40px] border border-white/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] rounded-full pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400 ml-2">
                Issue Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the bug in detail... What happened? How can we reproduce it?"
                className="w-full bg-white/5 border border-white/10 rounded-[32px] px-8 py-6 text-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all h-48 resize-none placeholder:text-white/10"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="w-full py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-[32px] font-bold text-xl transition-all shadow-2xl shadow-violet-600/30 disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Submit Report
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Recent Reports */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Recent Reports
            <span className="text-[10px] bg-white/5 px-3 py-1 rounded-full text-white/40 uppercase tracking-widest">
              Live Feed
            </span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium uppercase tracking-widest">Loading reports...</p>
              </div>
            ) : bugs.length === 0 ? (
              <div className="py-20 text-center glass-card rounded-[40px] border border-dashed border-white/10">
                <p className="text-white/20 font-medium">No bugs reported yet. Everything seems smooth!</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {bugs.map((bug) => (
                  <motion.div
                    key={bug.bugId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card p-6 rounded-[32px] border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-violet-600/10 transition-colors">
                          <UserIcon className="w-5 h-5 text-white/40 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{bug.userName}</span>
                            <span className="text-[10px] text-white/20">•</span>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">
                              {bug.createdAt ? formatDate(bug.createdAt) : 'Just now'}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {bug.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        {bug.status === 'pending' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            Pending
                          </div>
                        )}
                        {bug.status === 'fixed' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Fixed
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBugPage;
