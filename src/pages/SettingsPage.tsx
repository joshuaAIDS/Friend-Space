import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updatePassword, deleteUser, signOut } from 'firebase/auth';
import { Layout } from '../components/Layout';
import { motion } from 'motion/react';
import { 
  Settings, 
  Bell, 
  Lock, 
  Shield, 
  Trash2, 
  Moon, 
  Sun, 
  Globe, 
  HelpCircle,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { user: profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, passwords.new);
        toast.success('Password updated successfully!');
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update password. You may need to re-login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user && profile) {
        await deleteDoc(doc(db, 'users', profile.uid));
        await deleteUser(user);
        toast.success('Account deleted successfully.');
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to delete account. Re-login required.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: Trash2, color: 'text-red-400' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 md:space-y-10">
        <div className="flex items-center gap-4 mb-6 md:mb-10">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center border border-violet-500/30 shrink-0">
            <Settings className="w-5 h-5 md:w-6 md:h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-gray-500 text-xs md:text-sm">Manage your account preferences and security</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
          {/* Tabs Sidebar */}
          <div className="w-full lg:w-64 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-medium whitespace-nowrap lg:w-full",
                  activeTab === tab.id 
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" 
                    : "hover:bg-white/5 text-gray-400 hover:text-white"
                )}
              >
                <tab.icon className={cn("w-4 h-4", tab.color)} />
                <span>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block" />}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="glass-card p-6 md:p-8 min-h-[400px] md:min-h-[500px]">
              {activeTab === 'general' && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <section>
                    <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-violet-400" />
                      App Preferences
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div>
                          <p className="text-sm font-bold">Dark Mode</p>
                          <p className="text-[10px] md:text-xs text-gray-500">The default theme for FriendSpace</p>
                        </div>
                        <div className="w-10 h-5 md:w-12 md:h-6 bg-violet-600 rounded-full relative p-1">
                          <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full ml-auto shadow-sm" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div>
                          <p className="text-sm font-bold">Language</p>
                          <p className="text-[10px] md:text-xs text-gray-500">Choose your preferred language</p>
                        </div>
                        <select className="bg-transparent text-xs md:text-sm font-bold focus:outline-none">
                          <option className="bg-[#1a1a24]">English (US)</option>
                          <option className="bg-[#1a1a24]">Spanish</option>
                          <option className="bg-[#1a1a24]">French</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-violet-400" />
                      Support
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group">
                        <p className="text-sm font-bold group-hover:text-violet-400 transition-colors">Help Center</p>
                        <p className="text-[10px] md:text-xs text-gray-500">Guides and documentation</p>
                      </button>
                      <button className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group">
                        <p className="text-sm font-bold group-hover:text-violet-400 transition-colors">Report a Bug</p>
                        <p className="text-[10px] md:text-xs text-gray-500">Help us improve FriendSpace</p>
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-violet-400" />
                    Notification Settings
                  </h3>
                  <div className="space-y-4">
                    {['New Messages', 'Group Invites', 'Announcements', 'Friend Requests'].map((item) => (
                      <div key={item} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div>
                          <p className="text-sm font-bold">{item}</p>
                          <p className="text-[10px] md:text-xs text-gray-500">Receive alerts for {item.toLowerCase()}</p>
                        </div>
                        <div className="w-10 h-5 md:w-12 md:h-6 bg-violet-600 rounded-full relative p-1 cursor-pointer">
                          <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full ml-auto shadow-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-violet-400" />
                    Change Password
                  </h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4 md:space-y-6 max-w-md">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-gray-400 ml-1">Current Password</label>
                      <input
                        type="password"
                        required
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-gray-400 ml-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-gray-400 ml-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      <span>Update Password</span>
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'danger' && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-5 md:p-6 rounded-3xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-3 text-red-400 mb-4">
                      <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                      <h3 className="text-base md:text-lg font-bold">Delete Account</h3>
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-6">
                      Once you delete your account, there is no going back. All your messages, profile data, and shared files will be permanently removed from FriendSpace.
                    </p>
                    
                    {showDeleteConfirm ? (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Are you absolutely sure?</p>
                        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                          <button 
                            onClick={handleDeleteAccount}
                            disabled={loading}
                            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition-all flex items-center justify-center gap-2"
                          >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Yes, Delete Permanently
                          </button>
                          <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 text-gray-400 font-bold text-sm hover:bg-white/10 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-all border border-red-500/30"
                      >
                        Delete My Account
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default SettingsPage;
