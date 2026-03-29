import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Layout } from '../components/Layout';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Calendar, 
  Edit3, 
  Camera, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { user: profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    bio: profile?.bio || '',
    department: profile?.department || '',
    year: profile?.year || '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      let profileImageUrl = profile.profileImage || '';

      if (image) {
        const storageRef = ref(storage, `profile_images/${profile.uid}`);
        await uploadBytes(storageRef, image);
        profileImageUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        ...formData,
        profileImage: profileImageUrl,
        updatedAt: serverTimestamp(),
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 md:space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h1>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {/* Left Column: Avatar & Status */}
          <div className="space-y-6">
            <div className="glass-card p-6 md:p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-violet-600/20 to-indigo-600/20" />
              
              <div className="relative z-10">
                <div className="relative inline-block mb-6">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-white/5 border-4 border-[#0a0a0f] overflow-hidden shadow-2xl">
                    {imagePreview || profile?.profileImage ? (
                      <img src={imagePreview || profile?.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-600">
                        {profile?.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-violet-500 transition-colors border-4 border-[#0a0a0f]">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      <Camera className="w-5 h-5 text-white" />
                    </label>
                  )}
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold mb-1">{profile?.fullName}</h2>
                <p className="text-gray-400 text-xs md:text-sm mb-4 break-all">{profile?.email}</p>
                
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-widest">
                  {profile?.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {profile?.role}
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Account Info</h3>
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-gray-400">Status:</span>
                <span className="font-bold text-green-400 uppercase text-[10px] tracking-widest">{profile?.approvalStatus}</span>
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm">
                <Clock className="w-4 h-4 text-violet-400" />
                <span className="text-gray-400">Joined:</span>
                <span className="font-bold text-xs">{profile?.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Details & Edit Form */}
          <div className="md:col-span-2">
            <div className="glass-card p-6 md:p-8 h-full">
              {isEditing ? (
                <form onSubmit={handleUpdate} className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-gray-300 ml-1">Full Name</label>
                      <input
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-gray-300 ml-1">Department</label>
                      <input
                        required
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-medium text-gray-300 ml-1">Year</label>
                      <select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="glass-input w-full appearance-none bg-[#1a1a24] text-sm"
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-medium text-gray-300 ml-1">Bio / Status</label>
                    <textarea
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="glass-input w-full resize-none text-sm"
                      placeholder="Tell your friends something about yourself..."
                    />
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 pt-4">
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="btn-primary w-full md:flex-1 flex items-center justify-center gap-2 py-3"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      <span>Save Changes</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary w-full md:flex-1 flex items-center justify-center gap-2 py-3"
                    >
                      <X className="w-5 h-5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8 md:space-y-10">
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 md:mb-6 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      About Me
                    </h3>
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed italic">
                      {profile?.bio || "No bio added yet. Click edit to add one!"}
                    </p>
                  </section>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 md:mb-4 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Education
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{profile?.department}</p>
                        <p className="text-[10px] text-gray-400">{profile?.year}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 md:mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Contact
                      </h3>
                      <p className="text-sm text-gray-400 break-all">{profile?.email}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Activity
                    </h3>
                    <div className="p-4 md:p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-2">
                      <div className="text-center flex-1">
                        <p className="text-lg md:text-xl font-bold mb-1">12</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Chats</p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center flex-1">
                        <p className="text-lg md:text-xl font-bold mb-1">4</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Groups</p>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center flex-1">
                        <p className="text-lg md:text-xl font-bold mb-1">8</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Files</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};

export default ProfilePage;
