import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Bug,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout.');
    }
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: MessageSquare, label: 'Community Chat', path: '/chats/community' },
    { icon: MessageSquare, label: 'Private Chats', path: '/chats' },
    { icon: Users, label: 'Group Chats', path: '/groups' },
    { icon: Bug, label: 'Report the bug', path: '/report-bug' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  if (profile?.role === 'admin') {
    menuItems.splice(1, 0, { icon: ShieldCheck, label: 'Admin Panel', path: '/admin' });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "w-64 h-screen glass border-r border-white/5 flex flex-col fixed left-0 top-0 z-[70] transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Users className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">FriendSpace</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const isActive = item.path === '/dashboard' 
              ? location.pathname === '/dashboard'
              : location.pathname === item.path || (location.pathname.startsWith(item.path + '/') && item.path !== '/chats');
            
            // Special case for Private Chats to not match Community Chat
            const isPrivateChatActive = item.path === '/chats' && location.pathname.startsWith('/chats') && location.pathname !== '/chats/community';
            
            const finalActive = isActive || isPrivateChatActive;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  finalActive 
                    ? "bg-violet-600/10 text-violet-400 border border-violet-500/20" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", finalActive && "text-violet-400")} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
