import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  Users, 
  Bell, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Megaphone,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home, roles: ['admin', 'member'] },
    { name: 'Private Chats', path: '/chats', icon: MessageSquare, roles: ['admin', 'member'] },
    { name: 'Group Chats', path: '/groups', icon: Users, roles: ['admin', 'member'] },
    { name: 'Announcements', path: '/announcements', icon: Megaphone, roles: ['admin', 'member'] },
    { name: 'Profile', path: '/profile', icon: UserIcon, roles: ['admin', 'member'] },
    { name: 'Admin Panel', path: '/admin', icon: ShieldCheck, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'member'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen h-[100dvh] bg-[#050505] text-white overflow-hidden font-sans relative">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-fuchsia-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Mobile Sidebar Toggle */}
      <button 
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 shadow-xl"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <motion.aside 
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed lg:relative z-40 w-64 md:w-72 h-full bg-white/[0.02] backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl",
              !isSidebarOpen && "hidden lg:flex"
            )}
          >
            <div className="p-6 md:p-8 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 group transition-transform hover:scale-105">
                <Users size={24} className="text-white md:w-7 md:h-7" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                FriendSpace
              </h1>
            </div>

            <nav className="flex-1 px-3 md:px-4 space-y-1.5 md:space-y-2 overflow-y-auto py-4 md:py-6">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl transition-all duration-300 group relative overflow-hidden",
                      isActive 
                        ? "bg-violet-600 text-white shadow-xl shadow-violet-600/30" 
                        : "text-white/40 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="nav-active"
                        className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 -z-10"
                      />
                    )}
                    <item.icon size={20} className={cn(
                      "transition-all duration-300 md:w-[22px] md:h-[22px]",
                      isActive ? "text-white scale-110" : "text-white/40 group-hover:text-white group-hover:scale-110"
                    )} />
                    <span className="font-semibold tracking-tight text-sm md:text-base">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 md:p-6 border-t border-white/10 bg-white/[0.01]">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 mb-4 md:mb-6 group transition-all hover:bg-white/10">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 border border-white/20 overflow-hidden shadow-inner">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <UserIcon size={20} className="md:w-6 md:h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold truncate tracking-tight">{user?.fullName}</p>
                  <p className="text-[8px] md:text-[10px] text-white/40 truncate uppercase font-bold tracking-widest mt-0.5">{user?.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl text-red-400 hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20 group"
              >
                <LogOut size={20} className="md:w-[22px] md:h-[22px] group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold tracking-tight text-sm md:text-base">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto z-10 h-full">
        <Outlet />
      </main>
    </div>
  );
};

