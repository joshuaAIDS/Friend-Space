import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';
import { Clock, LogOut, RefreshCw, ShieldCheck, User, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

const PendingPage = () => {
  const { user: profile, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (profile?.approvalStatus === 'approved') {
      toast.success('Your request has been approved! Welcome to FriendSpace.');
      navigate('/dashboard');
    } else if (profile?.approvalStatus === 'rejected') {
      navigate('/rejected');
    }
  }, [profile, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout.');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) return null;

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8 relative overflow-hidden scrollbar-hide flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-violet-600/10 blur-[150px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full relative z-10"
      >
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-violet-500/10 border border-violet-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Clock className="w-10 h-10 text-violet-400" />
          </div>

          <h2 className="text-3xl font-bold mb-4 tracking-tight">Request Under Review</h2>
          <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Your join request has been sent to the admin. Please wait while we verify your details.
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
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-tighter">
                  Status: Pending
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {profile?.email?.toLowerCase() === 'ideathonigirs@gmail.com' ? (
              <button
                onClick={() => navigate('/admin')}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Go to Admin Dashboard</span>
              </button>
            ) : (
              <button
                onClick={handleRefresh}
                className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Check Status</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-violet-500/50" />
            <span>Secure & Private • FriendSpace</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PendingPage;
