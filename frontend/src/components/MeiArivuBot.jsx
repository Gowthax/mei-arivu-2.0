import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function MeiArivuBot() {
    const { lang } = useLanguage();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "👋 Hello! I'm **Mei Arivu**, your intelligent assistant for the Mei Arivu Waste Intelligence Platform.\n\nI can help you with:\n- **How to use** each module (Telemetry, Command Center, Pathogen Radar, Bio-Supply)\n- **Live data** about active sites, alerts, and inventory\n- **Step-by-step guides** for any feature\n\nHow can I help you today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userText }]);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/mentor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, lang: 'en' })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            const reply = data.reply || "I couldn't generate a response. Please try again.";
            
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (error) {
            console.error("Bot chat error:", error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "⚠️ Sorry, I'm having trouble connecting right now. Please check your internet connection and try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Rich Markdown Renderer ──────────────────────────────────────────────
    const renderContent = (content) => {
        const lines = content.split('\n');
        const elements = [];
        let listBuffer = [];
        let listType = null; // 'ul' or 'ol'

        const flushList = () => {
            if (listBuffer.length === 0) return;
            if (listType === 'ol') {
                // Render as styled step cards
                elements.push(
                    <div key={`ol-${elements.length}`} className="my-3 space-y-2">
                        {listBuffer.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl" 
                                 style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                      style={{ background: 'var(--accent)', color: '#fff' }}>
                                    {item.number}
                                </span>
                                <span className="text-sm leading-relaxed pt-0.5">{renderInline(item.text)}</span>
                            </div>
                        ))}
                    </div>
                );
            } else {
                // Render as styled bullet box
                elements.push(
                    <div key={`ul-${elements.length}`} className="my-3 px-4 py-3 rounded-xl space-y-2"
                         style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
                        {listBuffer.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                                <span className="text-sm leading-relaxed">{renderInline(item.text)}</span>
                            </div>
                        ))}
                    </div>
                );
            }
            listBuffer = [];
            listType = null;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Numbered list: "1. ", "2. ", "Step 1:", etc.
            const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
            const stepMatch = line.match(/^Step\s+(\d+)[:.]\s*(.*)/i);
            if (numberedMatch || stepMatch) {
                if (listType !== 'ol') { flushList(); listType = 'ol'; }
                const num = numberedMatch ? numberedMatch[1] : stepMatch[1];
                const text = numberedMatch ? numberedMatch[2] : stepMatch[2];
                listBuffer.push({ number: num, text: text });
                continue;
            }

            // Bullet list: "- " or "* "
            const bulletMatch = line.match(/^[-*]\s+(.*)/);
            if (bulletMatch) {
                if (listType !== 'ul') { flushList(); listType = 'ul'; }
                listBuffer.push({ text: bulletMatch[1] });
                continue;
            }

            // Not a list item — flush any pending list
            flushList();

            // Empty line
            if (!line.trim()) {
                elements.push(<div key={`br-${i}`} className="h-2" />);
                continue;
            }

            // Header: ### or ##
            if (line.startsWith('### ')) {
                elements.push(
                    <h4 key={`h4-${i}`} className="text-sm font-semibold mt-3 mb-1" style={{ color: 'var(--accent)' }}>
                        {renderInline(line.substring(4))}
                    </h4>
                );
                continue;
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <h3 key={`h3-${i}`} className="text-base font-bold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>
                        {renderInline(line.substring(3))}
                    </h3>
                );
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={`p-${i}`} className="text-sm leading-relaxed mb-1.5">{renderInline(line)}</p>
            );
        }
        flushList();
        return elements;
    };

    // Inline formatting: **bold**, `code`, emoji preservation
    const renderInline = (text) => {
        const parts = [];
        const regex = /(\*\*(.*?)\*\*|`(.*?)`)/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            if (match[2] !== undefined) {
                parts.push(<strong key={match.index} style={{ color: 'var(--accent)', fontWeight: 600 }}>{match[2]}</strong>);
            } else if (match[3] !== undefined) {
                parts.push(
                    <code key={match.index} className="px-1.5 py-0.5 rounded text-xs font-mono" 
                          style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent)' }}>
                        {match[3]}
                    </code>
                );
            }
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }
        return parts.length > 0 ? parts : text;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto rounded-2xl overflow-hidden glass-panel" style={{ border: '1px solid var(--border)' }}>
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: 'rgba(0,0,0,0.1)' }}>
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === 'assistant' 
                                ? 'bg-emerald-900/40 text-emerald-400' 
                                : 'bg-slate-700 text-white'
                        }`} style={{ border: `1px solid ${msg.role === 'assistant' ? 'var(--accent)' : 'var(--border)'}` }}>
                            {msg.role === 'assistant' ? <Sparkles size={18} /> : <User size={18} />}
                        </div>

                        {/* Message Bubble */}
                        {msg.role === 'user' ? (
                            <div 
                                className="px-5 py-3.5 rounded-2xl rounded-tr-none max-w-[75%] font-body"
                                style={{ 
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#ffffff',
                                    fontSize: '0.875rem',
                                    boxShadow: '0 2px 12px rgba(16,185,129,0.25)',
                                }}
                            >
                                <span className="font-medium">{msg.content}</span>
                            </div>
                        ) : (
                            <div 
                                className="max-w-[85%] rounded-2xl rounded-tl-none overflow-hidden"
                                style={{ 
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderLeft: '3px solid var(--accent)',
                                    boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                                }}
                            >
                                <div className="px-5 py-4 font-body" style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                    <div className="space-y-0.5">{renderContent(msg.content)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-900/40 text-emerald-400" style={{ border: '1px solid var(--accent)' }}>
                            <Sparkles size={18} />
                        </div>
                        <div className="px-6 py-4 rounded-2xl rounded-tl-none flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                            <Loader2 className="animate-spin w-4 h-4" style={{ color: 'var(--accent)' }} />
                            <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                                Mei Arivu is thinking...
                            </span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                <form onSubmit={handleSend} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Mei Arivu anything about the platform..."
                        className="w-full pl-5 pr-14 py-4 rounded-xl text-sm font-body outline-none transition-all"
                        style={{ 
                            background: 'var(--bg-surface)', 
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)'
                        }}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 hover:scale-105"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                        <Send size={18} className={input.trim() && !isLoading ? "translate-x-0.5 -translate-y-0.5" : ""} />
                    </button>
                </form>
                <div className="text-center mt-3">
                    <p className="text-[0.65rem] font-body tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        MEI ARIVU AI CAN MAKE MISTAKES • VERIFY IMPORTANT INFORMATION
                    </p>
                </div>
            </div>
        </div>
    );
}
