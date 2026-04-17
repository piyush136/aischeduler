import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Calendar, SwitchCamera, Save, X, Lock, Shield, Image as ImageIcon } from 'lucide-react';

export default function UserProfile({ token, onProfileUpdate }) {
    const [activeTab, setActiveTab] = useState('view'); // 'view', 'edit', 'password'
    const [profileData, setProfileData] = useState(null);
    const [formData, setFormData] = useState({});
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } });
            setProfileData(res.data);
            if (onProfileUpdate) onProfileUpdate(res.data);
            setFormData({
                name: res.data.name || '',
                phone: res.data.phone || '',
                profile_picture: res.data.profile_picture || ''
            });
        } catch (err) {
            console.error(err);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        try {
            const res = await axios.put('/api/user/profile', formData, { headers: { Authorization: `Bearer ${token}` } });
            setProfileData(res.data);
            setMessage('Profile updated successfully');
            if (onProfileUpdate) onProfileUpdate(res.data);
            setTimeout(() => { setActiveTab('view'); setMessage(''); }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        try {
            await axios.put('/api/user/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage('Password changed successfully');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => { setActiveTab('view'); setMessage(''); }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password');
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!profileData) {
        return (
            <div className="text-center mt-10 flex flex-col items-center gap-3">
                <div className="text-rose-500 font-medium">
                    {error || 'Could not load profile data.'}
                </div>
                <button onClick={fetchProfile} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-semibold">
                    Retry Loading
                </button>
            </div>
        );
    }

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            {/* Header Area */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 md:p-8 border-b border-indigo-100 flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200/50 overflow-hidden">
                    {profileData.profile_picture ? (
                        <img src={profileData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'
                    )}
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{profileData.name || 'User'}</h2>
                    <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2">
                        <Mail size={14} />
                        {profileData.email}
                    </p>
                </div>
                <div className="md:ml-auto flex flex-col gap-2 self-stretch justify-center">
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                         <Shield size={12} />
                         Pro Plan
                     </span>
                     <span className="text-xs text-slate-400 text-right">
                         Member since {new Date(profileData.created_at).toLocaleDateString()}
                     </span>
                </div>
            </div>

            {/* Navigation */}
            <div className="p-4 border-b border-slate-100 flex gap-2 overflow-x-auto">
                <TabButton id="view" label="Profile" icon={User} />
                <TabButton id="edit" label="Edit Profile" icon={Save} />
                {!profileData.google_tokens && <TabButton id="password" label="Security" icon={Lock} />}
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8">
                {message && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-center gap-2">
                        <Shield size={18} /> {message}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-center gap-2">
                        <X size={18} /> {error}
                    </div>
                )}

                {activeTab === 'view' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Name</label>
                                <div className="text-slate-800 font-medium">{profileData.name}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email Address</label>
                                <div className="text-slate-800 font-medium">{profileData.email}</div>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone Number</label>
                                <div className="text-slate-800 font-medium">{profileData.phone || <span className="text-slate-400 italic">Not provided</span>}</div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Account Created</label>
                                <div className="text-slate-800 font-medium">{new Date(profileData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'edit' && (
                    <form onSubmit={handleProfileSubmit} className="max-w-md space-y-5">
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><User size={16} className="text-slate-400" /> Full Name</label>
                           <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><Phone size={16} className="text-slate-400" /> Phone Number</label>
                           <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2"><ImageIcon size={16} className="text-slate-400" /> Profile Image URL</label>
                           <input type="url" value={formData.profile_picture} onChange={e => setFormData({...formData, profile_picture: e.target.value})} placeholder="https://example.com/avatar.jpg" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                       </div>
                       <div className="pt-2 flex items-center gap-3">
                           <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200">Save Changes</button>
                           <button type="button" onClick={() => setActiveTab('view')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors">Cancel</button>
                       </div>
                    </form>
                )}

                {activeTab === 'password' && (
                    <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-5">
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                           <input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                           <input type="password" minLength="6" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                           <input type="password" minLength="6" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} required className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                       </div>
                       <div className="pt-2 flex items-center gap-3">
                           <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200">Update Password</button>
                           <button type="button" onClick={() => setActiveTab('view')} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors">Cancel</button>
                       </div>
                    </form>
                )}
            </div>
        </div>
    );
}
