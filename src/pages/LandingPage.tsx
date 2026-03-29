import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Users, MessageSquare, Lock, ArrowRight, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { firebaseUser: user, user: profile, isAuthReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthReady && user) {
      if (user.email?.toLowerCase() === 'ideathonigirs@gmail.com') {
        navigate('/admin');
      } else if (profile?.approvalStatus === 'approved') {
        navigate('/dashboard');
      } else if (profile?.approvalStatus === 'pending') {
        navigate('/pending');
      } else if (profile?.approvalStatus === 'rejected') {
        navigate('/rejected');
      }
    }
  }, [user, profile, isAuthReady, navigate]);

  return (
    <div className="relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Users className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">FriendSpace</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium hover:text-violet-400 transition-colors">Login</Link>
          <Link to="/signup" className="btn-primary py-2 px-5 text-sm">Join Now</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-6">
            <Shield className="w-3 h-3" />
            <span>Private College Community</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Your Private <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">College Chat</span> Space
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect only with approved friends from your college. A secure, modern, and student-focused platform for trusted conversations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary w-full sm:w-auto">
              Existing Member
            </Link>
          </div>
        </motion.div>

        {/* Mockup Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-20 relative"
        >
          <div className="glass-card p-4 max-w-4xl mx-auto overflow-hidden">
            <img 
              src="https://picsum.photos/seed/friendspace-ui/1200/800?blur=2" 
              alt="App Preview" 
              className="rounded-xl w-full opacity-80"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Lock className="w-6 h-6 text-violet-400" />}
            title="Admin Approval"
            description="Every new user must be manually approved by the admin to maintain a safe and private community."
          />
          <FeatureCard 
            icon={<MessageSquare className="w-6 h-6 text-indigo-400" />}
            title="Real-time Chat"
            description="Experience seamless private and group conversations with real-time updates and media sharing."
          />
          <FeatureCard 
            icon={<GraduationCap className="w-6 h-6 text-pink-400" />}
            title="Student Focused"
            description="Designed specifically for college circles, project teams, and department groups."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-24 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">How Joining Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <Step number="1" title="Sign Up" description="Create your account using your college email." />
          <Step number="2" title="Request Access" description="Submit a join request with your details." />
          <Step number="3" title="Get Approved" description="Start chatting once the admin approves you." />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>&copy; 2026 FriendSpace. Built for Students, by Students.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="glass-card p-8 hover:border-violet-500/30 transition-all group">
    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const Step = ({ number, title, description }: { number: string, title: string, description: string }) => (
  <div className="flex flex-col items-center">
    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold mb-4 shadow-lg shadow-violet-500/30">
      {number}
    </div>
    <h4 className="text-lg font-bold mb-2">{title}</h4>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

export default LandingPage;
