import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Globe, Palette, Monitor, Moon, Sun, Check, LogOut, Mail, Phone, MapPin, Building, Loader } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const languages = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
];

const themes = [
    { id: 'dark', label: 'Dark Glassmorphism', icon: Moon, desc: 'Sleek frosted-glass enterprise aesthetic' },
    { id: 'dim', label: 'Organic Bioluminescence', icon: Monitor, desc: 'Deep green bioluminescent organic glow' },
    { id: 'light', label: 'Clinical Light', icon: Sun, desc: 'Surgical clean high-visibility mode' },
];

export default function SettingsView() {
    const { lang, setLang, t } = useLanguage();
    const [selectedTheme, setSelectedTheme] = useState('dark');
    const [notifications, setNotifications] = useState({ email: true, sms: false, push: true, alerts: true });
    const [profile, setProfile] = useState({
        name: 'Dr. Meiyazhagan R.', role: 'Chief Plant Operator', email: 'meiyazhagan@meiinnovations.in',
        phone: '+91 98765 43210', department: 'Bioremediation Division', location: 'Madurai, Tamil Nadu',
    });
    const [editingProfile, setEditingProfile] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch profile and preferences on mount
    useEffect(() => {
        fetch('/api/profile')
            .then(res => res.json())
            .then(data => {
                setProfile({
                    name: data.name,
                    role: data.role,
                    email: data.email,
                    phone: data.phone,
                    department: data.department,
                    location: data.location
                });
                setNotifications({
                    email: data.email_notif,
                    sms: data.sms_notif,
                    push: data.push_notif,
                    alerts: data.health_notif
                });
                setSelectedTheme(data.theme);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching settings:", err);
                setLoading(false);
            });
    }, []);

    const saveSettings = async (updatedProfile, updatedNotifs, updatedTheme) => {
        const payload = {
            name: updatedProfile.name,
            role: updatedProfile.role,
            email: updatedProfile.email,
            phone: updatedProfile.phone,
            department: updatedProfile.department,
            location: updatedProfile.location,
            theme: updatedTheme || selectedTheme,
            email_notif: updatedNotifs ? updatedNotifs.email : notifications.email,
            sms_notif: updatedNotifs ? updatedNotifs.sms : notifications.sms,
            push_notif: updatedNotifs ? updatedNotifs.push : notifications.push,
            health_notif: updatedNotifs ? updatedNotifs.alerts : notifications.alerts
        };

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("API call failed");
            toast.success("Settings successfully saved to database.", { duration: 3000 });
        } catch (err) {
            console.error("Save settings error:", err);
            toast.error("Failed to save settings to database.");
        }
    };

    const handleProfileChange = (field, value) => setProfile(prev => ({ ...prev, [field]: value }));
    
    const handleNotifToggle = (key) => {
        const updatedNotifs = { ...notifications, [key]: !notifications[key] };
        setNotifications(updatedNotifs);
        saveSettings(profile, updatedNotifs, selectedTheme);
    };

    const handleThemeChange = (themeId) => {
        setSelectedTheme(themeId);
        saveSettings(profile, notifications, themeId);
        window.dispatchEvent(new Event('theme-changed'));
    };

    const handleEditProfileToggle = () => {
        if (editingProfile) {
            // Saving changes
            saveSettings(profile, notifications, selectedTheme);
        }
        setEditingProfile(!editingProfile);
    };

    const profileFields = [
        { field: 'name', labelKey: 'fullName', icon: User },
        { field: 'role', labelKey: 'designation', icon: Shield },
        { field: 'email', labelKey: 'emailAddress', icon: Mail },
        { field: 'phone', labelKey: 'phoneNumber', icon: Phone },
        { field: 'department', labelKey: 'department', icon: Building },
        { field: 'location', labelKey: 'location', icon: MapPin },
    ];

    const notifItems = [
        { key: 'email', labelKey: 'emailNotif', descKey: 'emailNotifDesc' },
        { key: 'sms', labelKey: 'smsAlerts', descKey: 'smsAlertsDesc' },
        { key: 'push', labelKey: 'browserPush', descKey: 'browserPushDesc' },
        { key: 'alerts', labelKey: 'healthAlerts', descKey: 'healthAlertsDesc' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6">

            {/* Language */}
            <section className="overflow-hidden cinema-enter cinema-enter-1" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}>
                <div className="p-5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--accent)', background: 'transparent' }}>
                        <Globe className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{t('langRegion')}</h3>
                        <p className="glass-label mt-1">{t('langDesc')}</p>
                    </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
                    {languages.map(l => (
                        <button
                            key={l.code}
                            onClick={() => setLang(l.code)}
                            className="relative flex items-center gap-3 p-4 text-left transition-all duration-150 cursor-pointer"
                            style={{
                                background: lang === l.code ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                                borderLeft: lang === l.code ? '3px solid var(--accent)' : '3px solid transparent',
                            }}
                        >
                            <span className="text-2xl">{l.flag}</span>
                            <div className="flex-1">
                                <p className="font-heading font-bold text-lg" style={{ color: lang === l.code ? 'var(--accent)' : 'var(--text-primary)' }}>{l.label}</p>
                                <p className="glass-label mt-0.5">{l.native}</p>
                            </div>
                            {lang === l.code && (
                                <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            {/* Appearance */}
            <section className="overflow-hidden cinema-enter cinema-enter-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="p-5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--accent)', background: 'transparent' }}>
                        <Palette className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{t('appearance')}</h3>
                        <p className="glass-label mt-1">{t('appearanceDesc')}</p>
                    </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
                    {themes.map(th => (
                        <button
                            key={th.id}
                            onClick={() => handleThemeChange(th.id)}
                            className="relative flex flex-col items-center gap-3 p-5 transition-all duration-150 cursor-pointer"
                            style={{
                                background: selectedTheme === th.id ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                                borderTop: selectedTheme === th.id ? '3px solid var(--accent)' : '3px solid transparent',
                            }}
                        >
                            <th.icon className="w-6 h-6" style={{ color: selectedTheme === th.id ? 'var(--accent)' : 'var(--text-muted)' }} />
                            <div className="text-center">
                                <p className="font-heading font-bold text-lg" style={{ color: selectedTheme === th.id ? 'var(--accent)' : 'var(--text-primary)' }}>{th.label}</p>
                                <p className="glass-label mt-1">{th.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Profile */}
            <section className="overflow-hidden cinema-enter cinema-enter-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--accent)', background: 'transparent' }}>
                            <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        </div>
                        <div>
                            <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{t('userProfile')}</h3>
                            <p className="glass-label mt-1">{t('profileDesc')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleEditProfileToggle}
                        className="glass-badge transition-all duration-150 cursor-pointer"
                        style={{
                            color: editingProfile ? 'var(--accent)' : 'var(--text-muted)',
                            borderColor: editingProfile ? 'var(--accent)' : 'var(--border-mid)',
                            background: editingProfile ? 'rgba(16,185,129,0.08)' : 'transparent',
                        }}
                    >
                        {editingProfile ? t('saveChanges') : t('editProfile')}
                    </button>
                </div>
                <div className="p-5">
                    <div className="flex items-start gap-6 mb-8">
                        <div
                            className="w-16 h-16 flex items-center justify-center font-heading font-bold text-2xl flex-shrink-0"
                            style={{ border: '2px solid var(--accent)', background: 'var(--accent-deep)', color: 'var(--accent)' }}
                        >
                            {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                            <h4 className="font-heading font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>{profile.name}</h4>
                            <p className="glass-label mt-1" style={{ color: 'var(--accent)', letterSpacing: '0.15em' }}>{profile.role}</p>
                            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Mei Innovations Biotech Pvt Ltd</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {profileFields.map(item => (
                            <div key={item.field}>
                                <label className="glass-label flex items-center gap-1.5 mb-2">
                                    <item.icon className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                                    {t(item.labelKey)}
                                </label>
                                {editingProfile ? (
                                    <input
                                        type="text"
                                        value={profile[item.field]}
                                        onChange={(e) => handleProfileChange(item.field, e.target.value)}
                                        className="w-full px-3 py-2.5 font-body text-sm outline-none transition-all"
                                        style={{
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border-mid)',
                                            color: 'var(--text-primary)',
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-mid)'}
                                    />
                                ) : (
                                    <p className="font-body text-sm px-3 py-2.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                        {profile[item.field]}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Notifications */}
            <section className="overflow-hidden cinema-enter cinema-enter-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="p-5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ border: '1px solid #ef4444', background: 'transparent' }}>
                        <Bell className="w-4 h-4" style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{t('notifications')}</h3>
                        <p className="glass-label mt-1">{t('notifDesc')}</p>
                    </div>
                </div>
                <div className="p-5 space-y-0">
                    {notifItems.map((n, i) => (
                        <div
                            key={n.key}
                            className="flex items-center justify-between py-4"
                            style={{ borderBottom: i < notifItems.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                            <div>
                                <p className="font-heading font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t(n.labelKey)}</p>
                                <p className="glass-label mt-1">{t(n.descKey)}</p>
                            </div>
                            <button
                                onClick={() => handleNotifToggle(n.key)}
                                className="relative w-12 h-6 transition-colors duration-200 flex-shrink-0 cursor-pointer"
                                style={{
                                    background: notifications[n.key] ? 'var(--accent)' : 'var(--border-mid)',
                                    border: 'none',
                                }}
                            >
                                <div
                                    className="absolute top-0.5 w-5 h-5 transition-transform duration-200"
                                    style={{
                                        background: notifications[n.key] ? '#000' : 'var(--text-muted)',
                                        transform: notifications[n.key] ? 'translateX(26px)' : 'translateX(2px)',
                                    }}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Security */}
            <section className="overflow-hidden cinema-enter cinema-enter-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="p-5 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ border: '1px solid var(--border-mid)', background: 'transparent' }}>
                        <Shield className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{t('loginSecurity')}</h3>
                        <p className="glass-label mt-1">{t('loginSecDesc')}</p>
                    </div>
                </div>
                <div className="p-5 space-y-0">
                    {[
                        { label: t('password'), desc: t('passwordDesc'), action: <button className="glass-badge cursor-pointer" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-mid)' }}>{t('change')}</button> },
                        { label: t('twoFactor'), desc: t('twoFactorDesc'), action: <span className="glass-badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'rgba(16,185,129,0.08)' }}>{t('enabled')}</span> },
                        { label: t('activeSessions'), desc: t('activeSessionsDesc'), action: <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>Chrome · Windows</span> },
                        { label: t('loginHistory'), desc: t('loginHistoryDesc'), action: <button className="glass-badge cursor-pointer" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-mid)' }}>{t('viewAll')}</button> },
                    ].map((row, i, arr) => (
                        <div
                            key={row.label}
                            className="flex items-center justify-between py-4"
                            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                            <div>
                                <p className="font-heading font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{row.label}</p>
                                <p className="glass-label mt-1">{row.desc}</p>
                            </div>
                            {row.action}
                        </div>
                    ))}
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button className="flex items-center gap-2 font-body text-xs uppercase tracking-widest transition-colors duration-150 cursor-pointer" style={{ color: '#ef4444' }}>
                            <LogOut className="w-4 h-4" />{t('signOut')}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
