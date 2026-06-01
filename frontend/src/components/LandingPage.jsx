import React, { useState, useEffect } from 'react';
import { ArrowRight, Activity, Map, Bug, Package, Shield, Zap, Globe, Phone, Mail, ChevronDown } from 'lucide-react';

const features = [
    { icon: Activity, title: 'ML Telemetry', desc: 'Real-time bioremediation analysis with predictive degradation models' },
    { icon: Map, title: 'Geospatial Intelligence', desc: 'City-wide waste hotspot tracking with live map visualization' },
    { icon: Bug, title: 'Vector Radar', desc: 'Predictive pathogen & vector breeding risk engine for public health' },
    { icon: Package, title: 'Supply Chain', desc: 'Automated biological supply tracking with smart reorder triggers' },
    { icon: Shield, title: 'Health Alerts', desc: 'One-click emergency dispatch to Madurai Municipal Health Dept' },
    { icon: Globe, title: 'Multi-Language', desc: 'Full Tamil, Hindi & English i18n support across all modules' },
];

const stats = [
    { value: '83', label: 'Active Sites' },
    { value: '19.1T', label: 'Waste Tracked' },
    { value: '5', label: 'Bioremediation Zones' },
    { value: '3', label: 'Languages' },
];

export default function LandingPage({ onEnterDashboard }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

    return (
        <div
            className="min-h-screen overflow-x-hidden"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
            {/* ── NAV ─────────────────────────────────────────────────────── */}
            <nav
                className="fixed top-0 left-0 right-0 z-50"
                style={{
                    background: 'var(--bg-primary)',
                    borderBottom: '1px solid var(--border)',
                }}
            >
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 flex-shrink-0 overflow-hidden rounded-full shadow-md"
                        >
                            <img src="/assets/mei-arivu-logo.png" alt="Mei Arivu" className="w-full h-full object-cover" style={{ objectFit: 'contain', padding: '4px' }} />
                        </div>
                        <div>
                            <span className="text-lg font-heading font-bold" style={{ color: 'var(--text-primary)' }}>Mei Arivu</span>
                            <span
                                className="ml-2 glass-label"
                                style={{ letterSpacing: '0.2em', opacity: 0.6 }}
                            >Intelligent Platform</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <a
                            href="#features"
                            className="brutal-underline text-xs font-body uppercase tracking-widest transition-colors duration-150"
                            style={{ color: 'var(--text-muted)' }}
                        >Features</a>
                        <a
                            href="#about"
                            className="brutal-underline text-xs font-body uppercase tracking-widest transition-colors duration-150"
                            style={{ color: 'var(--text-muted)' }}
                        >About</a>
                        <button
                            onClick={onEnterDashboard}
                            className="flex items-center gap-2 px-5 py-2 text-xs font-body font-bold uppercase tracking-widest transition-all duration-200"
                            style={{
                                background: 'var(--accent)',
                                color: 'var(--bg-surface)',
                                border: 'none',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-acid)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; }}
                        >
                            Launch Dashboard <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── HERO ────────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Video Background — PRESERVED */}
                    <video
                        autoPlay loop muted playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        src="/landing page/video_20260227_214622_edit.mp4"
                    />
                    {/* Dark green overlay for text contrast */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(5,31,32,0.82) 0%, rgba(11,43,38,0.75) 50%, rgba(5,31,32,0.88) 100%)' }} />
                    {/* Subtle green glow orb */}
                    <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] opacity-20" style={{ background: 'radial-gradient(circle, #8EB69B 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
                </div>

                <div
                    className="relative z-10 max-w-4xl w-full"
                    style={{
                        opacity: visible ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {/* Badge */}
                    <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 mb-10 ${visible ? 'slam-in slam-in-1' : ''}`}
                        style={{
                            border: '1px solid var(--accent)',
                            background: 'rgba(16,185,129,0.08)',
                        }}
                    >
                        <Zap className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                        <span className="glass-label" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>
                            Powered by ML · Built for Madurai
                        </span>
                    </div>

                    {/* Headline */}
                    <h1
                        className={`font-heading font-bold leading-none mb-6 ${visible ? 'slam-in slam-in-2' : ''}`}
                        style={{
                            fontSize: 'clamp(3.8rem, 9.5vw, 8rem)',
                            color: '#DAF1DE',
                            textShadow: '0 2px 40px rgba(5,31,32,0.8), 0 0 80px rgba(142,182,155,0.3)'
                        }}
                    >
                        Smart Waste<br />
                        <span style={{
                            color: '#8EB69B',
                            textShadow: '0 0 40px rgba(142,182,155,0.6), 0 2px 20px rgba(5,31,32,0.9)'
                        }}>Intelligence</span>
                        <br />Platform
                    </h1>

                    {/* Divider line */}
                    <div
                        className={`mb-8 ${visible ? 'slam-in slam-in-3' : ''}`}
                        style={{ height: '2px', width: '140px', background: 'linear-gradient(90deg, #8EB69B, #DAF1DE)' }}
                    />

                    {/* Sub */}
                    <p
                        className={`font-body leading-relaxed max-w-lg mb-10 ${visible ? 'slam-in slam-in-3' : ''}`}
                        style={{ color: '#c2dfc8', lineHeight: '1.9', fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)' }}
                    >
                        City-wide bioremediation analytics, vector breeding prediction, and automated
                        supply chain management — all in one enterprise dashboard.
                    </p>

                    {/* CTA buttons */}
                    <div className={`flex items-center gap-4 ${visible ? 'slam-in slam-in-4' : ''}`}>
                        <button
                            onClick={onEnterDashboard}
                            className="group flex items-center gap-3 px-8 py-4 font-body font-bold text-sm uppercase tracking-widest transition-all duration-200"
                            style={{ background: '#8EB69B', color: '#051F20', fontWeight: 700 }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#DAF1DE';
                                e.currentTarget.style.transform = 'translate(-2px,-2px)';
                                e.currentTarget.style.boxShadow = '4px 4px 0 #163832, 0 0 20px rgba(142,182,155,0.4)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#8EB69B';
                                e.currentTarget.style.transform = '';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            Enter Dashboard
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a
                            href="#features"
                            className="px-8 py-4 font-body font-bold text-sm uppercase tracking-widest transition-all duration-200"
                            style={{ border: '1px solid rgba(142,182,155,0.5)', color: '#8EB69B' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#DAF1DE'; e.currentTarget.style.color = '#DAF1DE'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(142,182,155,0.5)'; e.currentTarget.style.color = '#8EB69B'; }}
                        >
                            Learn More
                        </a>
                    </div>
                </div>

                <a
                    href="#stats"
                    className="absolute bottom-10 animate-bounce"
                    style={{ color: 'var(--text-faint)' }}
                >
                    <ChevronDown className="w-6 h-6" />
                </a>
            </section>

            {/* ── STATS ───────────────────────────────────────────────────── */}
            <section
                id="stats"
                className="py-16"
                style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            >
                <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-0">
                    {stats.map((s, i) => (
                        <div
                            key={s.label}
                            className="text-center py-8 cinema-enter"
                            style={{
                                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                                animationDelay: `${0.1 * i}s`,
                            }}
                        >
                            <p
                                className="font-heading font-bold"
                                style={{ fontSize: '3.5rem', lineHeight: 1, color: 'var(--accent)' }}
                            >{s.value}</p>
                            <p className="glass-label mt-3">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ────────────────────────────────────────────────── */}
            <section id="features" className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-16">
                        <p className="glass-label mb-3" style={{ color: 'var(--accent)' }}>Capabilities</p>
                        <h2
                            className="font-heading font-bold"
                            style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: 'var(--text-primary)' }}
                        >Enterprise-Grade Modules</h2>
                        <div style={{ height: '2px', width: '60px', background: 'var(--accent)', marginTop: '16px' }} />
                        <p
                            className="font-body text-sm mt-5 max-w-lg leading-loose"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Six integrated modules designed for city-scale waste management operations.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px"
                        style={{ border: '1px solid var(--border)', background: 'var(--border)' }}
                    >
                        {features.map((f, i) => (
                            <div
                                key={f.title}
                                className="p-7 transition-all duration-200 group cinema-enter"
                                style={{
                                    background: 'var(--bg-primary)',
                                    animationDelay: `${0.08 * i}s`,
                                    borderTop: '3px solid transparent',
                                    transition: 'border-color 0.2s, background 0.2s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderTopColor = 'var(--accent)';
                                    e.currentTarget.style.background = 'var(--bg-surface)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderTopColor = 'transparent';
                                    e.currentTarget.style.background = 'var(--bg-primary)';
                                }}
                            >
                                <f.icon className="w-7 h-7 mb-5" style={{ color: 'var(--accent)', strokeWidth: 1.5 }} />
                                <h3
                                    className="font-heading font-bold text-xl mb-2"
                                    style={{ color: 'var(--text-primary)' }}
                                >{f.title}</h3>
                                <p
                                    className="font-body text-xs leading-loose"
                                    style={{ color: 'var(--text-muted)' }}
                                >{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ABOUT / CTA ─────────────────────────────────────────────── */}
            <section
                id="about"
                className="py-24 px-6"
                style={{ borderTop: '1px solid var(--border)' }}
            >
                <div className="max-w-4xl mx-auto">
                    <div
                        className="w-24 h-24 overflow-hidden rounded-full shadow-lg mb-8 mx-auto"
                    >
                        <img src="/assets/mei-arivu-logo.png" alt="Mei Arivu" className="w-full h-full object-cover" style={{ objectFit: 'contain', padding: '8px' }} />
                    </div>
                    <h2
                        className="font-heading font-bold mb-2"
                        style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--text-primary)' }}
                    >Built by Mei Innovations</h2>
                    <div style={{ height: '2px', width: '60px', background: 'var(--accent)', marginBottom: '20px' }} />
                    <p
                        className="font-body text-sm max-w-lg leading-loose mb-10"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        An AI-powered bioremediation platform designed for the Google Hackathon, focused on
                        transforming Madurai's waste management infrastructure through predictive analytics and
                        smart automation.
                    </p>
                    <div className="flex flex-wrap items-center gap-6 mb-12">
                        <a
                            href="tel:+919788963016"
                            className="flex items-center gap-2 font-body text-xs uppercase tracking-widest transition-colors duration-150"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <Phone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            +91 9788963016
                        </a>
                        <a
                            href="mailto:gowthamnirai97@gmail.com"
                            className="flex items-center gap-2 font-body text-xs uppercase tracking-widest transition-colors duration-150"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            gowthamnirai97@gmail.com
                        </a>
                    </div>
                    <button
                        onClick={onEnterDashboard}
                        className="group inline-flex items-center gap-3 px-8 py-4 font-body font-bold text-xs uppercase tracking-widest transition-all duration-200"
                        style={{ background: 'var(--accent)', color: 'var(--bg-surface)' }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--accent-acid)';
                            e.currentTarget.style.transform = 'translate(-2px,-2px)';
                            e.currentTarget.style.boxShadow = '4px 4px 0 var(--accent-deep)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.transform = '';
                            e.currentTarget.style.boxShadow = '';
                        }}
                    >
                        Launch Platform <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>

            {/* ── FOOTER ──────────────────────────────────────────────────── */}
            <footer
                className="py-8 px-6"
                style={{ borderTop: '1px solid var(--border)' }}
            >
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 flex-shrink-0 overflow-hidden rounded-full"
                        >
                            <img src="/assets/mei-arivu-logo.png" alt="Logo" className="w-full h-full object-cover" style={{ objectFit: 'contain' }} />
                        </div>
                        <span
                            className="glass-label"
                            style={{ color: 'var(--text-muted)', letterSpacing: '0.2em' }}
                        >Mei Arivu · Intelligent Platform</span>
                    </div>
                    <p
                        className="font-body"
                        style={{ fontSize: '0.6rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                        © 2026 Mei Innovations. All rights reserved. Madurai, Tamil Nadu.
                    </p>
                </div>
            </footer>
        </div>
    );
}
