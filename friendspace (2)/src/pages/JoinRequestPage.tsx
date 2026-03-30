import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, enableNetwork, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'motion/react';
import { Send, Image as ImageIcon, FileText, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const JoinRequestPage = () => {
  const { firebaseUser: user, user: profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reason: '',
    messageToAdmin: '',
  });

  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'joinRequests'),
          where('uid', '==', user.uid),
          where('status', '==', 'pending')
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          navigate('/pending');
        }
      } catch (err) {
        console.error("Error checking existing request:", err);
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExistingRequest();
  }, [user, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.error("No user found in handleSubmit");
      toast.error("You must be logged in to submit a request.");
      return;
    }
    
    if (!profile) {
      console.error("No profile found in handleSubmit");
      toast.error("User profile is still loading. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    try {
      console.log("Starting join request submission for user:", user.uid);
      let profileImageUrl = profile.profileImage || '';

      if (image) {
        console.log("Uploading profile image...");
        const storageRef = ref(storage, `profile_images/${user.uid}`);
        await uploadBytes(storageRef, image);
        profileImageUrl = await getDownloadURL(storageRef);
        console.log("Image uploaded, URL:", profileImageUrl);
      }

      const requestId = doc(collection(db, 'joinRequests')).id;
      const requestData = {
        requestId,
        uid: user.uid,
        fullName: profile.fullName,
        email: profile.email,
        department: profile.department,
        year: profile.year,
        reason: formData.reason,
        messageToAdmin: formData.messageToAdmin,
        profileImage: profileImageUrl,
        status: 'pending',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      console.log("Submitting join request to Firestore:", requestData);
      await setDoc(doc(db, 'joinRequests', requestId), requestData);
      console.log("Join request document created with ID:", requestId);
      
      // Update user profile with status and image if uploaded
      const updateData: any = {
        approvalStatus: 'pending',
        role: 'pending',
        updatedAt: serverTimestamp()
      };
      if (profileImageUrl) {
        updateData.profileImage = profileImageUrl;
      }
      
      console.log("Updating user profile with status and image...");
      await updateDoc(doc(db, 'users', user.uid), updateData);

      toast.success('Join request submitted successfully!');
      navigate('/pending');
    } catch (error) {
      console.error("CRITICAL: Error submitting join request:", error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!profile) setShowRetry(true);
    }, 15000); // 15 seconds timeout
    return () => clearTimeout(timer);
  }, [profile]);

  if (!user || !profile || checkingExisting) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-violet-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-violet-500/20 rounded-full blur-md animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-xl font-bold text-white">
              {checkingExisting ? "Checking for existing requests..." : "Loading your profile..."}
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              We're connecting to the secure college network. This might take a moment depending on your connection.
            </p>
          </div>

          {showRetry && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4"
            >
              <p className="text-amber-400 text-xs font-medium bg-amber-400/10 px-4 py-2 rounded-lg border border-amber-400/20">
                Connection is taking longer than expected.
              </p>
              <button
                onClick={async () => {
                  try {
                    await enableNetwork(db);
                    window.location.reload();
                  } catch (err) {
                    window.location.reload();
                  }
                }}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Connection</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8 relative overflow-hidden scrollbar-hide flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-violet-600/10 blur-[150px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full relative z-10"
      >
        <div className="glass-card p-8 md:p-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2 tracking-tight">Join Request</h2>
            <p className="text-gray-400">Tell us why you want to join FriendSpace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Image Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden group-hover:border-violet-500/50 transition-colors">
                  {imagePreview || profile?.profileImage ? (
                    <img src={imagePreview || profile?.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center cursor-pointer shadow-lg hover:bg-violet-500 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  <span className="text-white text-lg font-bold">+</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">Upload a profile photo (optional)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Full Name</p>
                <p className="font-medium">{profile?.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Department</p>
                <p className="font-medium">{profile?.department} ({profile?.year})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  Reason for joining FriendSpace
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="glass-input w-full resize-none"
                  placeholder="e.g. To connect with my batchmates and share project notes."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-violet-400" />
                  Message to Admin (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.messageToAdmin}
                  onChange={(e) => setFormData({ ...formData, messageToAdmin: e.target.value })}
                  className="glass-input w-full resize-none"
                  placeholder="Any extra info you want to share..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Join Request</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Helper for collection import
export default JoinRequestPage;
