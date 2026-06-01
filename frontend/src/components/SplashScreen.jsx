import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
    const [phase, setPhase] = useState('enter'); // enter -> hold -> exit

    // PRESERVED: all timing logic unchanged
    useEffect(() => {
        const holdTimer = setTimeout(() => setPhase('hold'), 300);
        const exitTimer = setTimeout(() => setPhase('exit'), 2400);
        const finishTimer = setTimeout(() => onFinish(), 3200);
        return () => { clearTimeout(holdTimer); clearTimeout(exitTimer); clearTimeout(finishTimer); };
    }, [onFinish]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{
                background: 'rgba(249, 248, 246, 0.85)',
                backdropFilter: phase === 'enter' ? 'blur(0px)' : 'blur(12px)',
                WebkitBackdropFilter: phase === 'enter' ? 'blur(0px)' : 'blur(12px)',
                opacity: phase === 'exit' ? 0 : 1,
                transition: 'opacity 0.7s ease, backdrop-filter 1.5s ease',
            }}
        >
            {/* Thin camera frames */}
            <div className="absolute top-10 left-10 pointer-events-none transition-all duration-1000" style={{ width: 32, height: 32, borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: phase === 'enter' ? 0 : 0.6, transform: phase === 'enter' ? 'scale(1.1)' : 'scale(1)' }} />
            <div className="absolute top-10 right-10 pointer-events-none transition-all duration-1000" style={{ width: 32, height: 32, borderTop: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: phase === 'enter' ? 0 : 0.6, transform: phase === 'enter' ? 'scale(1.1)' : 'scale(1)' }} />
            <div className="absolute bottom-10 left-10 pointer-events-none transition-all duration-1000" style={{ width: 32, height: 32, borderBottom: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', opacity: phase === 'enter' ? 0 : 0.6, transform: phase === 'enter' ? 'scale(1.1)' : 'scale(1)' }} />
            <div className="absolute bottom-10 right-10 pointer-events-none transition-all duration-1000" style={{ width: 32, height: 32, borderBottom: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', opacity: phase === 'enter' ? 0 : 0.6, transform: phase === 'enter' ? 'scale(1.1)' : 'scale(1)' }} />

            {/* Logo — floating clear */}
            <div
                style={{
                    width: 160,
                    height: 160,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 1.5s cubic-bezier(0.16,1,0.3,1)',
                    opacity: phase === 'enter' ? 0 : 1,
                    transform: phase === 'enter' ? 'scale(0.8) translateY(24px)' : 'scale(1) translateY(0)',
                    filter: phase === 'enter' ? 'blur(8px)' : 'blur(0px)',
                    overflow: 'hidden',
                    borderRadius: '50%',
                    boxShadow: phase === 'enter' ? 'none' : '0 10px 40px rgba(0,0,0,0.08)'
                }}
            >
                <img
                    src="/assets/mei-arivu-logo.png"
                    alt="Mei Arivu"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            </div>

            {/* Brand name */}
            <div
                style={{
                    marginTop: 32,
                    opacity: phase === 'enter' ? 0 : 1,
                    transform: phase === 'enter' ? 'translateY(16px)' : 'translateY(0)',
                    transition: 'all 0.7s ease 0.4s',
                }}
            >
                <h1
                    className="font-heading font-bold text-center"
                    style={{ fontSize: '2.5rem', color: 'rgba(5, 31, 32, 0.85)', letterSpacing: '-0.02em', lineHeight: 1 }}
                >
                    Mei Arivu
                </h1>
            </div>

            {/* Tagline */}
            <div
                style={{
                    marginTop: 12,
                    opacity: phase === 'enter' ? 0 : 1,
                    transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
                    transition: 'all 0.7s ease 0.55s',
                }}
            >
                <p
                    className="glass-label text-center"
                    style={{ color: 'rgba(5, 31, 32, 0.6)', letterSpacing: '0.35em' }}
                >
                    by Mei Innovations
                </p>
            </div>

            {/* Loading bar — thick, sharp, brutal */}
            <div
                style={{
                    marginTop: 48,
                    width: 200,
                    height: 4,
                    background: 'var(--border)',
                    overflow: 'hidden',
                    opacity: phase === 'enter' ? 0 : 1,
                    transition: 'opacity 0.5s ease 0.7s',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        background: 'var(--accent)',
                        width: phase === 'hold' || phase === 'exit' ? '100%' : '0%',
                        transition: 'width 2s cubic-bezier(0.16,1,0.3,1)',
                    }}
                />
            </div>

            {/* Coordinate text */}
            <p
                className="absolute bottom-10 font-body"
                style={{
                    fontSize: '0.6rem',
                    color: 'var(--text-faint)',
                    letterSpacing: '0.15em',
                    opacity: phase !== 'enter' ? 0.6 : 0,
                    transition: 'opacity 0.5s ease 1s',
                }}
            >
                9.9252° N, 78.1198° E — MADURAI
            </p>
        </div>
    );
}
