import React from 'react';
import { Activity, Map, Bug, Package, Settings, Info, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const navItems = [
    { id: 'telemetry', key: 'telemetry', icon: Activity },
    { id: 'command', key: 'command', icon: Map },
    { id: 'pathogen', key: 'pathogen', icon: Bug },
    { id: 'inventory', key: 'inventory', icon: Package },
];

const bottomItems = [
    { id: 'bot', key: 'bot', icon: MessageSquare },
    { id: 'about', key: 'about', icon: Info },
    { id: 'settings', key: 'settings', icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange, onGoLanding }) {
    const { t } = useLanguage();

    const renderNavButton = (item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
            <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body transition-all duration-300 group relative text-left"
                style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
            >
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    <Icon
                        strokeWidth={1.2}
                        className="w-5 h-5 transition-all duration-300"
                        style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                </div>
                <span
                    className="truncate tracking-wide text-[0.8rem] font-medium"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                    {t(item.key)}
                </span>

                {/* Subtle active indicator line */}
                {isActive && (
                    <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full"
                        style={{ height: '60%', background: 'var(--accent)' }}
                    />
                )}
            </button>
        );
    };

    return (
        <aside
            className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
            style={{
                background: 'var(--bg-primary)',
                borderRight: '1px solid var(--border)',
            }}
        >
            {/* Brand */}
            <div
                className="p-5"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <button onClick={onGoLanding} className="flex items-center gap-3 group w-full text-left">
                    <div
                        className="w-14 h-14 flex-shrink-0 flex items-center justify-center transition-all duration-500 overflow-hidden rounded-full group-hover:scale-105 shadow-md"
                    >
                        <img
                            src="/assets/mei-arivu-logo.png"
                            alt="Mei Arivu"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <div>
                        <h1
                            className="text-xl font-heading font-medium leading-none tracking-wide"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Mei Arivu
                        </h1>
                        <p
                            className="text-xs font-body mt-1 opacity-80"
                            style={{ color: 'var(--accent)' }}
                        >
                            Intelligent Platform
                        </p>
                    </div>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <p
                    className="glass-label px-4 pt-1 pb-3"
                    style={{ borderBottom: '1px solid var(--border)', marginBottom: '4px' }}
                >
                    {t('modules')}
                </p>
                <div className="mt-2 space-y-0.5 px-2">
                    {navItems.map(renderNavButton)}
                </div>
            </nav>

            {/* Bottom nav */}
            <div
                className="px-2 py-2 space-y-0.5"
                style={{ borderTop: '1px solid var(--border)' }}
            >
                {bottomItems.map(renderNavButton)}
            </div>

            {/* Footer */}
            <div
                className="p-4"
                style={{ borderTop: '1px solid var(--border)' }}
            >
                <div
                    className="p-3"
                    style={{
                        border: '1px solid var(--accent-deep)',
                        borderLeft: '3px solid var(--accent)',
                        background: 'rgba(16,185,129,0.05)',
                    }}
                >
                    <p
                        className="glass-label mb-1"
                        style={{ color: 'var(--accent)' }}
                    >
                        {t('maduraiDistrict')}
                    </p>
                    <p
                        className="font-body text-xs leading-relaxed"
                        style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}
                    >
                        {t('smartCity')}
                    </p>
                </div>
            </div>
        </aside>
    );
}
