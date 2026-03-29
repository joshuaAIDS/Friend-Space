import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  User, 
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { Announcement } from '../types';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const AnnouncementsPage = () => {
  const { user: profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as Announcement['priority'],
  });

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => doc.data() as Announcement));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Announcement updated!');
      } else {
        const id = doc(collection(db, 'announcements')).id;
        await addDoc(collection(db, 'announcements'), {
          announcementId: id,
          ...formData,
          createdBy: profile.uid,
          createdAt: new Date().toISOString(),
        });
        toast.success('Announcement posted!');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ title: '', content: '', priority: 'medium' });
    } catch (error) {
      console.error(error);
      toast.error('Failed to save announcement.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success('Announcement deleted.');
    } catch (error) {
      toast.error('Failed to delete.');
    }
  };

  return (
    <>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 md:space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">Announcements</h1>
            <p className="text-gray-400 text-sm md:text-base">Stay updated with the latest college news and FriendSpace updates.</p>
          </div>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>New Announcement</span>
            </button>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-violet-500" /></div>
          ) : announcements.length > 0 ? (
            announcements.map((ann) => (
              <motion.div
                key={ann.announcementId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-8 border-l-4 border-l-violet-500 relative group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                      ann.priority === 'important' ? "bg-red-500/20 text-red-400" : 
                      ann.priority === 'high' ? "bg-amber-500/20 text-amber-400" :
                      "bg-violet-500/20 text-violet-400"
                    )}>
                      {ann.priority} Priority
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(ann.createdAt)}
                    </div>
                  </div>
                  {profile?.role === 'admin' && (
                    <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingId(ann.announcementId);
                          setFormData({ title: ann.title, content: ann.content, priority: ann.priority });
                          setShowModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(ann.announcementId)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <h2 className="text-lg md:text-xl font-bold mb-4">{ann.title}</h2>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
              </motion.div>
            ))
          ) : (
            <div className="glass-card p-10 md:p-20 text-center space-y-4">
              <Megaphone className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-gray-500 text-sm">No announcements yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl glass-card p-6 md:p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-bold">{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-medium text-gray-300">Title</label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="glass-input w-full text-sm"
                    placeholder="e.g. Upcoming Tech Fest 2026"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-medium text-gray-300">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="glass-input w-full appearance-none bg-[#1a1a24] text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="important">Important</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-medium text-gray-300">Content</label>
                  <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="glass-input w-full resize-none text-sm"
                    placeholder="Write your announcement details here..."
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-3 text-sm">
                  {editingId ? 'Update Announcement' : 'Post Announcement'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AnnouncementsPage;
