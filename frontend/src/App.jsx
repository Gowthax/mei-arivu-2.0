import React, { useState, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import SplashScreen from './components/SplashScreen';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import TelemetryView from './components/TelemetryView';
import CommandCenter from './components/CommandCenter';
import PathogenRadar from './components/PathogenRadar';
import BioSupplyInventory from './components/BioSupplyInventory';
import SettingsView from './components/SettingsView';
import AboutView from './components/AboutView';
import MeiArivuBot from './components/MeiArivuBot';
import LoginPage from './components/LoginPage';
import { AuthProvider } from './context/AuthContext';

function DashboardContent({ onGoLanding }) {
    const [activeTab, setActiveTab] = useState('telemetry');
    const { t } = useLanguage();

    const tabTitleKeys = {
        telemetry: 'telemetryTitle', command: 'commandTitle', pathogen: 'pathogenTitle',
        inventory: 'inventoryTitle', settings: 'settingsTitle', about: 'aboutTitle', bot: 'botTitle',
    };
    const tabSubKeys = {
        telemetry: 'telemetrySub', command: 'commandSub', pathogen: 'pathogenSub',
        inventory: 'inventorySub', settings: 'settingsSub', about: 'aboutSub', bot: 'botSub',
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'telemetry': return <TelemetryView />;
            case 'command': return <CommandCenter />;
            case 'pathogen': return <PathogenRadar />;
            case 'inventory': return <BioSupplyInventory />;
            case 'settings': return <SettingsView />;
            case 'about': return <AboutView />;
            case 'bot': return <MeiArivuBot />;
            default: return <TelemetryView />;
        }
    };

    return (
        <div className="min-h-screen flex bg-transparent print:bg-white">
            <div className="print:hidden">
                <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onGoLanding={onGoLanding} />
            </div>
            <div className="ml-64 print:ml-0 flex-1 min-h-screen relative overflow-hidden bg-transparent print:bg-white print:overflow-visible">
                {/* Ambient emerald glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none print:hidden" style={{ background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
                <header
                    className="sticky top-0 z-30 px-8 py-5 print:hidden"
                    style={{ background: 'transparent', borderBottom: '1px solid var(--border)' }}
                >
                    <h1 className="font-heading font-bold" style={{ fontSize: '2rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                        {t(tabTitleKeys[activeTab])}
                    </h1>
                    <p className="font-body text-xs mt-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {t(tabSubKeys[activeTab])}
                    </p>
                </header>
                <main className="p-8 print:p-0 print:m-0 relative z-10 print:bg-white">
                    {renderTab()}
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const [appState, setAppState] = useState('splash'); // splash -> landing -> dashboard

    // Theme initialization and synchronization
    React.useEffect(() => {
        const syncTheme = () => {
            fetch('/api/profile')
                .then(res => res.json())
                .then(data => {
                    const theme = data.theme || 'dark';
                    document.documentElement.setAttribute('data-theme', theme);
                })
                .catch(err => {
                    console.warn("Theme sync failed, using default:", err);
                    document.documentElement.setAttribute('data-theme', 'dark');
                });
        };
        syncTheme();
        
        window.addEventListener('theme-changed', syncTheme);
        return () => window.removeEventListener('theme-changed', syncTheme);
    }, []);

    const handleSplashDone = useCallback(() => setAppState('landing'), []);
    const handleEnterDashboard = useCallback(() => setAppState('login'), []); // Divert to login first
    const handleLoginSuccess = useCallback(() => setAppState('dashboard'), []);
    const handleGoLanding = useCallback(() => setAppState('landing'), []);

    return (
        <AuthProvider>
        <LanguageProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        fontFamily: '"Outfit", sans-serif',
                        fontSize: '13px',
                        fontWeight: '500',
                        borderRadius: '16px',
                        boxShadow: 'var(--glow-shadow)'
                    },
                    success: { iconTheme: { primary: 'var(--accent)', secondary: '#fff' } },
                }}
            />
            {appState === 'splash' && <SplashScreen onFinish={handleSplashDone} />}
            {appState === 'landing' && <LandingPage onEnterDashboard={handleEnterDashboard} />}
            {appState === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} />}
            {appState === 'dashboard' && <DashboardContent onGoLanding={handleGoLanding} />}
        </LanguageProvider>
        </AuthProvider>
    );
}
