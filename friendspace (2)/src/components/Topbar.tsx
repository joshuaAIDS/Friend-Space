import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Bell, Search, User, LogOut, ShieldCheck, ChevronDown, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Notification } from '../types';
import { cn } from '../lib/utils';

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    if (profile) {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => doc.data() as Notification));
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-20 glass border-b border-white/5 flex items-center justify-between px-4 md:px-8 fixed top-0 right-0 left-0 lg:left-64 z-40">
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-xl">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-500 transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 md:pl-12 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6 ml-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group"
          >
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0a0a0f]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-72 md:w-80 glass-card p-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-bold">Notifications</h3>
                <Link to="/notifications" className="text-xs text-violet-400 hover:text-violet-300">View All</Link>
              </div>
              <div className="space-y-2">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.notificationId} className={cn("p-3 rounded-xl text-sm transition-colors", !n.read ? "bg-violet-500/10 border border-violet-500/20" : "hover:bg-white/5")}>
                      <p className="font-bold text-xs mb-1">{n.title}</p>
                      <p className="text-gray-400 text-xs line-clamp-2">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-xs py-4">No new notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 md:gap-3 p-1 md:p-1.5 md:pr-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-violet-600/20 overflow-hidden border border-violet-500/30">
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs md:text-sm font-bold text-violet-400">
                  {profile?.fullName.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[10px] md:text-xs font-bold leading-none mb-1 truncate max-w-[80px] md:max-w-none">{profile?.fullName}</p>
              <p className="text-[9px] md:text-[10px] text-gray-500 leading-none uppercase tracking-tighter">
                {profile?.role === 'admin' ? 'Admin' : 'Member'}
              </p>
            </div>
            <ChevronDown className={cn("w-3 h-3 md:w-4 md:h-4 text-gray-500 transition-transform", showProfileMenu && "rotate-180")} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-4 w-48 md:w-56 glass-card p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </Link>
              {profile?.role === 'admin' && (
                <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-500/5 transition-all">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
              <div className="h-px bg-white/5 my-2" />
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topbar;
