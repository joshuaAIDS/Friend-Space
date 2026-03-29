import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';
import { XCircle, LogOut, Mail, ShieldAlert, User, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

const RejectedPage = () => {
  const { user: profile, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout.');
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-red-600/10 blur-[150px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>

          <h2 className="text-3xl font-bold mb-4 tracking-tight">Request Not Approved</h2>
          <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            We're sorry, but your request to join FriendSpace was not approved by the admin.
          </p>

          <div className="glass p-6 rounded-2xl border border-white/5 text-left mb-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
              <User className="w-4 h-4" />
              Your Profile Summary
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden border border-white/10">
                {profile?.profileImage ? (
                  <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-600">
                    {profile?.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold">{profile?.fullName}</p>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  {profile?.department} • {profile?.year}
                </p>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-tighter">
                  Status: Rejected
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => window.location.href = 'mailto:admin@college.edu'}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              <span>Contact Admin</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldAlert className="w-4 h-4 text-red-500/50" />
            <span>Secure & Private • FriendSpace</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RejectedPage;
