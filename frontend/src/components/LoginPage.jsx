import React, { useState } from 'react';
import { ArrowRight, Shield, User, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        
        try {
            let res;
            if (isRegister) {
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.username,
                        email: formData.email,
                        password: formData.password
                    })
                });
            } else {
                const params = new URLSearchParams();
                params.append('username', formData.username);
                params.append('password', formData.password);
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params
                });
            }

            const data = await res.json();
            if (res.ok) {
                login(data.access_token, data.role);
                toast.success(isRegister ? 'Registration successful!' : 'Welcome back!');
                onLoginSuccess();
            } else {
                toast.error(data.detail || 'Authentication failed');
            }
        } catch (error) {
            toast.error('Network error. Is the server running?');
        }
        setLoading(false);
    };

    const handleViewerLogin = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/viewer', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                login(data.access_token, data.role);
                toast.success('Logged in as Viewer');
                onLoginSuccess();
            } else {
                toast.error('Viewer access failed');
            }
        } catch (error) {
            // Fallback if backend is not running yet
            toast.error('Backend unreachable, forcing viewer mode for UI demo');
            login('dummy_viewer_token', 'viewer');
            onLoginSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-transparent" style={{ background: 'var(--bg-primary)' }}>
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-20" style={{ background: 'radial-gradient(circle, #8EB69B 0%, transparent 70%)', filter: 'blur(80px)' }} />
            </div>

            <div className="relative z-10 w-full max-w-md p-8 rounded-2xl shadow-2xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-primary)] rounded-full flex items-center justify-center" style={{ border: '1px solid var(--border)' }}>
                        <Shield className="w-8 h-8" style={{ color: 'var(--accent)' }} />
                    </div>
                    <h2 className="text-2xl font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Mei Arivu Portal</h2>
                    <p className="font-body text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Secure access to the waste intelligence platform</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Username"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-primary)] rounded-lg outline-none font-body text-sm transition-colors"
                                style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                value={formData.username}
                                onChange={e => setFormData({...formData, username: e.target.value})}
                            />
                        </div>
                    </div>
                    {isRegister && (
                        <div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    type="email"
                                    placeholder="Email Address"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-primary)] rounded-lg outline-none font-body text-sm transition-colors"
                                    style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>
                    )}
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                type="password"
                                placeholder="Password"
                                required
                                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-primary)] rounded-lg outline-none font-body text-sm transition-colors"
                                style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 mt-4 rounded-lg font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        style={{ background: 'var(--accent)', color: 'var(--bg-surface)' }}
                    >
                        {isRegister ? 'Register Account' : 'Authenticate'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between font-body text-sm">
                    <button 
                        onClick={() => setIsRegister(!isRegister)}
                        className="hover:underline transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
                    </button>
                </div>

                <div className="mt-8 pt-6 relative" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs font-body uppercase tracking-wider bg-[var(--bg-surface)]" style={{ color: 'var(--text-muted)' }}>
                        Public Access
                    </div>
                    <button 
                        onClick={handleViewerLogin}
                        disabled={loading}
                        className="w-full py-3 rounded-lg font-heading font-bold uppercase tracking-wider transition-all"
                        style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(16,185,129,0.05)' }}
                    >
                        Continue as Viewer
                    </button>
                </div>
            </div>
        </div>
    );
}
