import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import JoinRequestPage from './pages/JoinRequestPage';
import PendingPage from './pages/PendingPage';
import RejectedPage from './pages/RejectedPage';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import ReportBugPage from './pages/ReportBugPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { AdminDashboard } from './pages/AdminDashboard';

// Error Boundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mb-8 border border-red-500/30">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <p className="text-white/40 mb-8 max-w-md">
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-500 transition-all"
          >
            Refresh Page
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-8 p-4 bg-white/5 rounded-xl text-xs text-red-400 overflow-auto max-w-full text-left">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Join Request Flow */}
            <Route path="/join-request" element={<ProtectedRoute><JoinRequestPage /></ProtectedRoute>} />
            <Route path="/pending" element={<ProtectedRoute><PendingPage /></ProtectedRoute>} />
            <Route path="/rejected" element={<ProtectedRoute><RejectedPage /></ProtectedRoute>} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chats" element={<ChatPage />} />
              <Route path="/chats/:chatId" element={<ChatPage />} />
              <Route path="/groups" element={<ChatPage />} />
              <Route path="/groups/:chatId" element={<ChatPage />} />
              <Route path="/report-bug" element={<ReportBugPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </AuthProvider>
    </ErrorBoundary>
  );
}
