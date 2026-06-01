import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, Droplets, Thermometer, Wind, Leaf, Cpu, Loader, Database, Power, CheckCircle, Brain } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

const ICON_MAP = {
    Thermometer: Thermometer,
    Droplets: Droplets,
    Wind: Wind,
    Leaf: Leaf,
    Activity: Activity,
    AlertCircle: AlertCircle,
    CheckCircle: CheckCircle,
    Brain: Brain
};

export default function TelemetryView() {
    const { t, lang } = useLanguage();
    const [sites, setSites] = useState([]);
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [params, setParams] = useState({
        temperature_celsius: 45,
        moisture_percent: 50,
        ph_level: 7.0,
        carbon_nitrogen_ratio: 28,
        waste_type: 'Mixed_Household'
    });
    const [manualOverride, setManualOverride] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Fetch sites periodically if manual override is OFF
    useEffect(() => {
        const fetchSitesData = () => {
            fetch(`${API_BASE_URL}/api/sites`)
                .then(res => res.json())
                .then(data => {
                    setSites(data);
                    
                    if (data.length > 0) {
                        const currentId = selectedSiteId || data[0].id.toString();
                        if (!selectedSiteId) {
                            setSelectedSiteId(currentId);
                        }
                        
                        const site = data.find(s => s.id.toString() === currentId);
                        // Only update params from live telemetry, never auto-set result
                        // (results must come from explicit user action via Ingest & Analyze)
                        if (site && site.latest_telemetry && !manualOverride) {
                            setParams({
                                temperature_celsius: site.latest_telemetry.temperature_celsius,
                                moisture_percent: site.latest_telemetry.moisture_percent,
                                ph_level: site.latest_telemetry.ph_level,
                                carbon_nitrogen_ratio: site.latest_telemetry.carbon_nitrogen_ratio,
                                waste_type: site.latest_telemetry.waste_type
                            });
                        }
                    }
                })
                .catch(err => console.error("Error fetching sites:", err));
        };

        fetchSitesData();
        const interval = setInterval(() => {
            if (!manualOverride) {
                fetchSitesData();
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [selectedSiteId, manualOverride]);

    // Handle site selection change
    const handleSiteChange = (e) => {
        const siteIdStr = e.target.value;
        setSelectedSiteId(siteIdStr);
        const site = sites.find(s => s.id.toString() === siteIdStr);
        if (site && site.latest_telemetry) {
            setParams({
                temperature_celsius: site.latest_telemetry.temperature_celsius,
                moisture_percent: site.latest_telemetry.moisture_percent,
                ph_level: site.latest_telemetry.ph_level,
                carbon_nitrogen_ratio: site.latest_telemetry.carbon_nitrogen_ratio,
                waste_type: site.latest_telemetry.waste_type
            });
            if (site.latest_telemetry.prediction && !manualOverride) {
                // Localize the dummy prediction if it's the default one
                let currentPrediction = { ...site.latest_telemetry.prediction };
                if (currentPrediction.steps.length === 0) {
                    currentPrediction.overall_status = lang.startsWith('ta') ? "ஏஜென்ட் பகுப்பாய்விற்காக காத்திருக்கிறது. Ingest & Analyze பொத்தானை அழுத்தவும்." 
                        : lang.startsWith('hi') ? "एजेंट विश्लेषण की प्रतीक्षा है। Ingest & Analyze पर क्लिक करें।" 
                        : "Awaiting Agentic Analysis. Please click Ingest & Analyze.";
                }
                setResult(currentPrediction);
            }
        }
    };

    // Add debounced auto-fetch when parameters change and manualOverride is ON
    useEffect(() => {
        if (!manualOverride) return;
        const timer = setTimeout(() => {
            submitTelemetry(params, false); // false = silent toast
        }, 600);
        return () => clearTimeout(timer);
    }, [params, manualOverride]);

    const submitTelemetry = async (currentParams, showToast = true) => {
        setLoading(true);
        setError('');
        try {
            if (selectedSiteId) {
                // Full telemetry ingest with site tracking
                const response = await fetch(`${API_BASE_URL}/api/telemetry/ingest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        site_id: parseInt(selectedSiteId),
                        lang: lang,
                        ...currentParams
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.detail || `API request failed (${response.status})`);
                }

                const data = await response.json();
                setResult(data.prediction);
                if (showToast) toast.success(`✅ AI diagnosis complete for ${data.site_updated.name}`, { duration: 2000 });

                // Refresh sites list silently
                fetch(`${API_BASE_URL}/api/sites`)
                    .then(res => res.json())
                    .then(updated => setSites(updated))
                    .catch(err => console.error(err));
            } else {
                // No site selected — run standalone AI analysis
                const response = await fetch(`${API_BASE_URL}/api/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...currentParams,
                        lang: lang
                    })
                });
                if (!response.ok) throw new Error(`Predict API failed (${response.status})`);
                const data = await response.json();
                setResult(data);
                if (showToast) toast.success('✅ AI analysis complete!', { duration: 2000 });
            }
        } catch (err) {
            console.warn('Prediction error, using hardcoded fallback:', err.message);
            setError(lang.startsWith('ta') ? 'பின்பக்கத்தை அடைய முடியவில்லை — உள்ளூர் மதிப்பீட்டைக் காட்டுகிறது.' 
                   : lang.startsWith('hi') ? 'बैकएंड तक नहीं पहुंच सका — स्थानीय अनुमान दिखा रहा है।' 
                   : 'Could not reach backend — showing local estimate.');
            // Final hardcoded fallback
            setResult({
                days_to_degrade: 28,
                overall_status: lang.startsWith('ta') ? "ஆஃப்லைனில் இயங்குகிறது. அளவுருக்கள் ஏற்றுக்கொள்ளக்கூடிய வரம்பிற்குள் உள்ளன."
                    : lang.startsWith('hi') ? "ऑफ़लाइन मोड में चल रहा है। पैरामीटर स्वीकार्य सीमा के भीतर प्रतीत होते हैं।"
                    : "Running in offline mode. Parameters appear within acceptable range.",
                steps: [
                    { step_number: 1, title: lang.startsWith('ta') ? "ஈரப்பதத்தை கண்காணிக்கவும்" : lang.startsWith('hi') ? "नमी की निगरानी करें" : "Monitor Moisture", description: lang.startsWith('ta') ? "உகந்த நுண்ணுயிர் செயல்பாட்டிற்கு உரம் ஈரப்பதம் 50-60% க்கு இடையில் இருப்பதை உறுதி செய்யவும்." : lang.startsWith('hi') ? "सुनिश्चित करें कि खाद की नमी 50-60% के बीच है।" : "Ensure compost moisture stays between 50–60% for optimal microbial activity.", icon: "Droplets" },
                    { step_number: 2, title: lang.startsWith('ta') ? "வெப்பநிலையை சரிபார்க்கவும்" : lang.startsWith('hi') ? "तापमान की जाँच करें" : "Check Temperature", description: lang.startsWith('ta') ? "50-65°C இலக்கு குவியல் வெப்பநிலை ஆரோக்கியமான ஏரோபிக் சிதைவைக் குறிக்கிறது." : lang.startsWith('hi') ? "50-65°C लक्ष्य ढेर तापमान स्वस्थ अपघटन को इंगित करता है।" : "Target pile temperature of 50–65°C indicates healthy aerobic decomposition.", icon: "Thermometer" },
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSliderChange = (e) => {
        setParams({
            ...params,
            [e.target.name]: e.target.type === 'number' || e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value
        });
    };

    const renderTechnicalStatus = (days) => {
        let health = Math.max(0, Math.min(100, 100 - ((days - 15) / (50 - 15) * 100)));
        const statusStr = health > 80 ? 'OPTIMAL' : health > 50 ? 'MARGINAL' : 'CRITICAL';
        const colorStr = health > 80 ? 'var(--accent)' : health > 50 ? '#f59e0b' : '#ef4444';
        
        return (
            <div className="flex flex-col h-full w-full justify-center">
                <div className="flex justify-between items-end mb-2">
                    <span className="font-body text-xs text-[var(--text-muted)] uppercase tracking-widest">
                        {lang.startsWith('ta') ? 'கணினி ஆரோக்கியம்' : lang.startsWith('hi') ? 'सिस्टम स्वास्थ्य' : 'System Health'}
                    </span>
                    <span className="font-body text-xs font-bold" style={{ color: colorStr }}>[{statusStr}]</span>
                </div>
                <div className="w-full h-1 bg-[var(--border-mid)] mb-4">
                    <div className="h-full transition-all duration-500" style={{ width: `${health}%`, background: colorStr }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="font-body text-[10px] text-[var(--text-muted)] uppercase block">
                            {lang.startsWith('ta') ? 'அளவீடு' : lang.startsWith('hi') ? 'मीट्रिक' : 'Metric'}
                        </span>
                        <span className="font-body text-sm text-[var(--text-primary)]">
                            {lang.startsWith('ta') ? 'சிதைவு நேரம்' : lang.startsWith('hi') ? 'अपघटन का समय' : 'Degradation ETA'}
                        </span>
                    </div>
                    <div>
                        <span className="font-body text-[10px] text-[var(--text-muted)] uppercase block">
                            {lang.startsWith('ta') ? 'மதிப்பு' : lang.startsWith('hi') ? 'मूल्य' : 'Value'}
                        </span>
                        <span className="font-body text-sm text-[var(--text-primary)] font-bold">
                            {days} {t('days')}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const fieldLabels = {
        temperature_celsius: 'temperature',
        moisture_percent: 'moisture',
        ph_level: 'phLevel',
        carbon_nitrogen_ratio: 'cnRatio',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input panel */}
            <section
                className="lg:col-span-5 flex flex-col cinema-enter cinema-enter-1 glass-panel"
                style={{ borderTop: '3px solid var(--accent)', padding: '2rem' }}
            >
                <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 className="font-heading font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
                        <Cpu className="w-5 h-5 inline mr-2" style={{ color: 'var(--accent)' }} />
                        {t('telemetryInput')}
                    </h2>
                    
                    <button
                        onClick={() => {
                            setManualOverride(!manualOverride);
                            if (manualOverride) {
                                // Refresh telemetry from live database immediately when switching back to auto
                                const site = sites.find(s => s.id.toString() === selectedSiteId);
                                if (site && site.latest_telemetry) {
                                    setParams({
                                        temperature_celsius: site.latest_telemetry.temperature_celsius,
                                        moisture_percent: site.latest_telemetry.moisture_percent,
                                        ph_level: site.latest_telemetry.ph_level,
                                        carbon_nitrogen_ratio: site.latest_telemetry.carbon_nitrogen_ratio,
                                        waste_type: site.latest_telemetry.waste_type
                                    });
                                    if (site.latest_telemetry.prediction) {
                                        let currentPrediction = { ...site.latest_telemetry.prediction };
                                        if (currentPrediction.steps.length === 0) {
                                            currentPrediction.overall_status = lang.startsWith('ta') ? "ஏஜென்ட் பகுப்பாய்விற்காக காத்திருக்கிறது. Ingest & Analyze பொத்தானை அழுத்தவும்." 
                                                : lang.startsWith('hi') ? "एजेंट विश्लेषण की प्रतीक्षा है। Ingest & Analyze पर क्लिक करें।" 
                                                : "Awaiting Agentic Analysis. Please click Ingest & Analyze.";
                                        }
                                        setResult(currentPrediction);
                                    }
                                }
                            }
                        }}
                        className="glass-badge flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                        style={{
                            color: manualOverride ? 'var(--danger)' : 'var(--accent)',
                            borderColor: manualOverride ? 'var(--danger)' : 'var(--accent)',
                            background: manualOverride ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                        }}
                    >
                        <Power className="w-3.5 h-3.5 animate-pulse" />
                        {manualOverride ? "Override Active" : "Auto Live Feed"}
                    </button>
                </div>

                {/* Site Selection */}
                <div className="mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <label className="glass-label flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        Target Bioremediation Site
                    </label>
                    <select
                        value={selectedSiteId}
                        onChange={handleSiteChange}
                        className="w-full p-3 outline-none font-body text-sm"
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-mid)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-6 flex-grow">
                    {[
                        { id: 'temperature_celsius', icon: Thermometer, min: 30, max: 75, step: 0.1, suffix: '°C' },
                        { id: 'moisture_percent', icon: Droplets, min: 20, max: 80, step: 0.1, suffix: '%' },
                        { id: 'ph_level', icon: Activity, min: 4.5, max: 8.5, step: 0.1, suffix: ' pH' },
                        { id: 'carbon_nitrogen_ratio', icon: Leaf, min: 15, max: 45, step: 0.1, suffix: ' C:N' },
                    ].map(field => (
                        <div key={field.id} className="transition-all duration-300">
                            <label className="flex items-center gap-2 glass-label mb-2">
                                <field.icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                {t(fieldLabels[field.id])} ({field.suffix})
                            </label>
                            <input
                                type="number"
                                name={field.id}
                                min={field.min} max={field.max} step={field.step}
                                value={params[field.id] || field.min}
                                onChange={handleSliderChange}
                                disabled={!manualOverride}
                                className={`w-full p-2 outline-none font-body text-sm font-bold ${!manualOverride ? 'cursor-not-allowed opacity-50' : 'cursor-text'}`}
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-mid)',
                                    color: 'var(--text-primary)',
                                    borderLeft: `3px solid ${manualOverride ? 'var(--accent)' : 'var(--border-mid)'}`
                                }}
                            />
                        </div>
                    ))}
                    <div className="mt-4">
                        <label className="glass-label flex items-center gap-2 mb-2">
                            <Wind className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            {t('wasteType')}
                        </label>
                        <select
                            name="waste_type"
                            value={params.waste_type}
                            onChange={handleSliderChange}
                            disabled={!manualOverride}
                            className={`w-full p-3 outline-none font-body text-sm transition-all duration-300 ${!manualOverride ? 'opacity-70 cursor-not-allowed' : ''}`}
                            style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-mid)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <option value="Market_Vegetable">Market Vegetable</option>
                            <option value="Mixed_Household">Mixed Household</option>
                            <option value="Yard_Waste">Yard Waste</option>
                        </select>
                    </div>
                </div>
                
                <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                    {!manualOverride && (
                        <button
                            onClick={() => submitTelemetry(params)}
                            disabled={loading}
                            className="w-full py-4 font-body font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                            style={{
                                background: loading ? 'var(--accent-deep)' : 'var(--accent)',
                                color: 'var(--bg-primary)',
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? (<><Loader className="w-4 h-4 animate-spin" />{t('analyzing')}</>) : (
                                <><Brain className="w-4 h-4" /> AI Ingest &amp; Analyze</>
                            )}
                        </button>
                    )}
                    {manualOverride && (
                        <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-mid)] flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-ping' : 'bg-green-500'}`} />
                            <span className="font-body text-xs text-[var(--text-muted)] uppercase tracking-widest">
                                {loading ? 'Running AI Diagnostics...' : 'AI Engine Synchronized'}
                            </span>
                        </div>
                    )}
                </div>


                {error && (
                    <div className="mt-4 p-3 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.06)', borderLeft: '3px solid #ef4444' }}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                        <span className="font-body text-xs" style={{ color: 'var(--text-primary)' }}>{error}</span>
                    </div>
                )}
            </section>

            {/* Results panel */}
            <section className="lg:col-span-7 flex flex-col gap-6">
                <div
                    className="flex-grow flex flex-col items-center justify-center p-8 cinema-enter cinema-enter-2 glass-panel"
                    style={{ minHeight: '420px' }}
                >
                    {!loading && !result && (
                        <div className="flex flex-col items-center py-12 text-center">
                            <Activity className="w-16 h-16 mb-6 animate-pulse-slow" style={{ color: 'var(--text-faint)' }} />
                            <p className="font-heading font-bold text-2xl uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{t('awaitingTelemetry')}</p>
                            <p className="font-body text-xs leading-loose mt-4 max-w-sm" style={{ color: 'var(--text-muted)' }}>{t('awaitingDesc')}</p>
                        </div>
                    )}
                    {loading && (
                        <div className="flex flex-col items-center">
                            <div className="biotech-loader"></div>
                        </div>
                    )}
                    {result && !loading && (
                        <div className="w-full h-full flex flex-col animate-slam-in">
                            <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                                <h2 className="font-heading font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
                                    <Brain className="w-6 h-6 inline mr-2" style={{ color: 'var(--accent)' }} />
                                    {lang.startsWith('ta') ? 'AI ஏஜென்ட் நோயறிதல்' : lang.startsWith('hi') ? 'AI एजेंट निदान' : 'AI Agent Diagnosis'}
                                </h2>
                                <span className="glass-badge flex items-center gap-1.5" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    {t('analysisComplete')}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                <div className="p-6 flex flex-col glass-panel" style={{ borderLeft: '3px solid var(--accent)' }}>
                                    <p className="font-body text-xs text-[var(--text-muted)] uppercase tracking-widest mb-4">
                                        {lang.startsWith('ta') ? 'மதிப்பிடப்பட்ட இலக்கு காலம்' : lang.startsWith('hi') ? 'अनुमानित लक्ष्य अवधि' : 'Estimated Target Duration'}
                                    </p>
                                    <div className="mt-auto">
                                        <span className="font-heading font-bold" style={{ fontSize: '3rem', lineHeight: 1, color: 'var(--text-primary)' }}>{result.days_to_degrade}</span>
                                        <span className="font-body text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{t('days')}</span>
                                    </div>
                                </div>
                                <div className="p-6 glass-panel bg-[var(--bg-primary)] border border-[var(--border-mid)]">
                                    {renderTechnicalStatus(result.days_to_degrade)}
                                </div>
                            </div>

                            <div className="p-6 mb-6 rounded-md" style={{ borderLeft: '4px solid var(--accent)', background: 'var(--bg-raised)' }}>
                                <h3 className="glass-label mb-2 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                                    <Activity className="w-4 h-4" /> 
                                    {lang.startsWith('ta') ? 'ஒட்டுமொத்த சுகாதார நிலை' : lang.startsWith('hi') ? 'समग्र स्वास्थ्य स्थिति' : 'Overall Health Status'}
                                </h3>
                                <p className="font-body text-sm leading-loose" style={{ color: 'var(--text-primary)' }}>
                                    {result.overall_status}
                                </p>
                            </div>

                            <h3 className="glass-label mb-4" style={{ color: 'var(--text-muted)' }}>
                                {lang.startsWith('ta') ? 'தேவையான தீர்வு படிகள்' : lang.startsWith('hi') ? 'आवश्यक सुधार कदम' : 'Required Remediation Steps'}
                            </h3>
                            <div className="space-y-4 flex-grow">
                                {result.steps?.map((step, idx) => {
                                    return (
                                        <div 
                                            key={idx} 
                                            className="p-4 flex gap-4 bg-[var(--bg-primary)] border border-[var(--border-mid)]"
                                        >
                                            <div className="flex flex-col items-center">
                                                <span className="font-body text-[10px] font-bold px-2 py-1 bg-[var(--bg-surface)] border border-[var(--border-mid)]">
                                                    #{step.step_number}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-body text-sm font-bold text-[var(--accent)] uppercase tracking-wider mb-1">{step.title}</h4>
                                                <p className="font-body text-xs leading-relaxed text-[var(--text-primary)]">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
