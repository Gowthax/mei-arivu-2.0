import React from 'react';
import { Phone, Mail, MapPin, Globe, Github, ExternalLink, Users, Award, Cpu, Leaf } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const team = [
    { name: 'Gowtham N', role: 'Creator', initials: 'GN' },
    { name: 'Abirami K', role: 'Creator', initials: 'AK' },
    { name: 'Indu M', role: 'Creator', initials: 'IM' },
];

const techStack = [
    { name: 'React', desc: 'Frontend framework' },
    { name: 'Vite', desc: 'Build toolchain' },
    { name: 'FastAPI', desc: 'ML backend API' },
    { name: 'TailwindCSS', desc: 'Utility-first styling' },
    { name: 'Recharts', desc: 'Data visualization' },
    { name: 'Scikit-learn', desc: 'ML models' },
];

const SectionHeader = ({ icon: Icon, title, sub, accent }) => (
    <div
        className="p-5 flex items-center gap-4"
        style={{ borderBottom: '1px solid var(--border)' }}
    >
        <Icon className="w-6 h-6 flex-shrink-0" style={{ color: accent || 'var(--accent)', strokeWidth: 1.5 }} />
        <div>
            <h3 className="font-heading font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <p className="glass-label mt-0.5">{sub}</p>
        </div>
    </div>
);

export default function AboutView() {
    const { t } = useLanguage();

    return (
        <div className="max-w-4xl space-y-6">

            {/* ── HERO CARD (video preserved) ──────────────────────────── */}
            <section
                className="overflow-hidden cinema-enter cinema-enter-1"
                style={{ border: '1px solid var(--border)', borderTop: '3px solid var(--accent)' }}
            >
                <div className="relative p-8 pb-10">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-xl">
                        {/* Video Background — PRESERVED */}
                        <video
                            autoPlay loop muted playsInline
                            className="absolute inset-0 w-full h-full object-cover object-center"
                            src="/about page/202560-918431383_small.mp4"
                        />
                        {/* Glass overlay */}
                        <div className="absolute inset-0" style={{ background: 'rgba(5, 31, 32, 0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
                    </div>
                    <div className="relative z-10 flex items-start gap-6">
                        <div
                            className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-full shadow-lg"
                        >
                            <img src="/assets/mei-arivu-logo.png" alt="Mei Arivu" className="w-full h-full object-cover" style={{ objectFit: 'contain', padding: '4px' }} />
                        </div>
                        <div>
                            <h2
                                className="font-heading font-bold"
                                style={{ fontSize: '2rem', color: 'var(--text-primary)', lineHeight: 1.1 }}
                            >
                                Mei Arivu — Intelligent Platform
                            </h2>
                            <p
                                className="glass-label mt-2"
                                style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}
                            >by Mei Innovations</p>
                            <p
                                className="font-body text-xs leading-loose mt-4 max-w-lg"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                An enterprise-grade, AI-powered bioremediation and waste intelligence platform designed for Madurai District.
                                Built for the Google Hackathon to demonstrate how machine learning, predictive analytics, and smart automation
                                can transform city-scale waste management into a data-driven operation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── MISSION ──────────────────────────────────────────────── */}
            <section
                className="overflow-hidden cinema-enter cinema-enter-2"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
                <SectionHeader icon={Leaf} title="Our Mission" sub="Why we built Mei Arivu" />
                <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px"
                        style={{ background: 'var(--border)' }}
                    >
                        {[
                            { icon: Cpu, title: 'ML-Powered Decisions', desc: 'Predicting degradation timelines and required bioremediation actions through trained models on real waste composition data.' },
                            { icon: Globe, title: 'City-Scale Vision', desc: 'Scaling from single-pile analysis to district-wide waste intelligence with geospatial tracking and zone-level monitoring.' },
                            { icon: Users, title: 'Public Health Integration', desc: 'Connecting waste data to vector breeding predictions, enabling proactive health department alerts and anti-larval operations.' },
                        ].map(m => (
                            <div key={m.title} className="p-5" style={{ background: 'var(--bg-primary)' }}>
                                <m.icon className="w-8 h-8 mb-4" style={{ color: 'var(--accent)', strokeWidth: 1.5 }} />
                                <h4
                                    className="font-heading font-bold text-lg mb-2"
                                    style={{ color: 'var(--text-primary)' }}
                                >{m.title}</h4>
                                <p className="font-body text-xs leading-loose" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TEAM ─────────────────────────────────────────────────── */}
            <section
                className="overflow-hidden cinema-enter cinema-enter-3"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
                <SectionHeader icon={Users} title="Team" sub="The people behind the platform" />
                <div className="p-5">
                    {team.map(member => (
                        <div key={member.name} className="flex flex-col mb-4 last:mb-0">
                            <h4 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{member.name}</h4>
                            <p className="glass-label mt-1" style={{ color: 'var(--accent)' }}>{member.role}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TECH STACK ───────────────────────────────────────────── */}
            <section
                className="overflow-hidden cinema-enter cinema-enter-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
                <SectionHeader icon={Cpu} title="Technology Stack" sub="Built with modern, production-grade tools" />
                <div className="p-5">
                    <div
                        className="grid grid-cols-2 md:grid-cols-3 gap-px"
                        style={{ background: 'var(--border)' }}
                    >
                        {techStack.map(tech => (
                            <div
                                key={tech.name}
                                className="p-4 transition-colors duration-150"
                                style={{ background: 'var(--bg-primary)', cursor: 'default' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                            >
                                <p className="font-heading font-bold text-lg" style={{ color: 'var(--accent)' }}>{tech.name}</p>
                                <p className="glass-label mt-1">{tech.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CONTACT ──────────────────────────────────────────────── */}
            <section
                className="overflow-hidden cinema-enter cinema-enter-5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
                <SectionHeader icon={Phone} title="Contact" sub="Reach Mei Innovations" accent="var(--accent)" />
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
                    {[
                        { href: 'tel:+919788963016', icon: Phone, label: 'Phone', value: '+91 9788963016' },
                        { href: 'mailto:gowthamnirai97@gmail.com', icon: Mail, label: 'Email', value: 'gowthamnirai97@gmail.com' },
                        { href: null, icon: MapPin, label: 'Location', value: 'Madurai, Tamil Nadu' },
                    ].map(item => (
                        item.href ? (
                            <a
                                key={item.label}
                                href={item.href}
                                className="flex items-start gap-3 p-5 transition-all duration-150 group"
                                style={{ background: 'var(--bg-primary)', borderLeft: '3px solid transparent' }}
                                onMouseEnter={e => { e.currentTarget.style.borderLeftColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderLeftColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
                            >
                                <item.icon className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                <div>
                                    <p className="glass-label mb-1">{item.label}</p>
                                    <p className="font-body text-xs" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                                </div>
                            </a>
                        ) : (
                            <div key={item.label} className="flex items-start gap-3 p-5" style={{ background: 'var(--bg-primary)' }}>
                                <item.icon className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                <div>
                                    <p className="glass-label mb-1">{item.label}</p>
                                    <p className="font-body text-xs" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            </section>

            {/* ── HACKATHON BADGE ──────────────────────────────────────── */}
            <div
                className="p-6 text-center cinema-enter cinema-enter-6"
                style={{
                    border: '1px solid var(--accent)',
                    borderLeft: '4px solid var(--accent)',
                    background: 'rgba(16,185,129,0.04)',
                }}
            >
                <Award className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                <p
                    className="glass-label"
                    style={{ color: 'var(--accent)', fontSize: '0.7rem', letterSpacing: '0.2em' }}
                >Google Hackathon 2026</p>
                <p
                    className="font-body text-xs mt-2 leading-loose"
                    style={{ color: 'var(--text-muted)' }}
                >Submitted by Mei Innovations · Madurai District Smart City Initiative</p>
            </div>
        </div>
    );
}
