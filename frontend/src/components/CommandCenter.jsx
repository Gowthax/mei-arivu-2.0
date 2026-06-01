import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Clock, TrendingUp, Layers, X, Settings, RotateCw, Truck, Activity, CloudRain, Thermometer, Wind, Droplets, Map, Biohazard, Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

// Madurai center
const maduraiCenter = [9.9252, 78.1198];

// Helper to create custom SVG marker icon based on risk
const createCustomIcon = (risk, isSelected) => {
    let color = 'var(--accent)'; // Low/default
    if (risk === 'Severe' || risk === 'High') color = '#ef4444';
    else if (risk === 'Moderate') color = '#f59e0b';

    const animationClass = risk === 'Severe' || risk === 'High' ? 'animate-ping' : 'animate-pulse';
    const scale = isSelected ? 'scale(1.4)' : 'scale(1)';
    const zIndex = isSelected ? 1000 : 1;
    
    // Aggressive radar ripple for Severe/High
    const html = `
        <div style="position: relative; transform: ${scale}; transition: all 0.3s ease; z-index: ${zIndex};">
            <div class="${animationClass}" style="position: absolute; top: -15px; left: -15px; right: -15px; bottom: -15px; background: ${color}; opacity: 0.3; border-radius: 50%;"></div>
            <div style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; background: ${color}; opacity: 0.4; border-radius: 50%;"></div>
            <div style="width: 16px; height: 16px; background: ${color}; border: 2px solid #000; border-radius: 50%; position: relative; z-index: 2; box-shadow: 0 0 15px ${color};"></div>
        </div>
    `;

    return divIcon({
        html,
        className: 'custom-leaflet-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

// SVG Half-Circle Gauge Component
const GaugeChart = ({ value, min, max, label, color, unit }) => {
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const radius = 40;
    const circumference = Math.PI * radius;
    const strokeDashoffset = circumference - percentage * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-14 overflow-hidden">
                <svg className="w-24 h-24" viewBox="0 0 100 100">
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                    />
                </svg>
                <div className="absolute bottom-0 left-0 w-full text-center">
                    <span className="text-lg font-bold text-white">{value}{unit}</span>
                </div>
            </div>
            <span className="text-[10px] text-gray-400 font-mono mt-1 uppercase tracking-wider">{label}</span>
        </div>
    );
};

export default function CommandCenter() {
    const { t } = useLanguage();
    const [hotspots, setHotspots] = useState([]);
    const [stats, setStats] = useState({
        totalActiveSites: '0',
        wasteBacklog: '0 T',
        avgDegradation: '0 Days',
        alertsActive: '0'
    });

    // Dummy Sparkline Data for KPIs
    const sparklineData = Array.from({ length: 20 }, () => ({ value: 40 + Math.random() * 60 }));
    const sparklineDataBacklog = Array.from({ length: 20 }, (_, i) => ({ value: i > 15 ? 80 + Math.random() * 20 : 40 + Math.random() * 20 })); // Spiking trend

    const [selectedSite, setSelectedSite] = useState(null);
    const [siteHistory, setSiteHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    
    // New Feature States
    const [weather, setWeather] = useState(null);
    const [mapLayer, setMapLayer] = useState('piles'); // piles, pathogen, methane

    // Fetch Weather
    useEffect(() => {
        fetch('https://api.open-meteo.com/v1/forecast?latitude=9.9252&longitude=78.1198&current=temperature_2m,relative_humidity_2m&hourly=precipitation_probability')
            .then(res => res.json())
            .then(data => {
                const precipProb = data.hourly?.precipitation_probability?.slice(0, 12).reduce((a, b) => Math.max(a, b), 0) || 0;
                setWeather({
                    temp: data.current?.temperature_2m || '--',
                    humidity: data.current?.relative_humidity_2m || '--',
                    precipProb
                });
            })
            .catch(err => console.error("Weather fetch failed:", err));
    }, []);

    const fetchStatsAndSites = () => {
        fetch(`${API_BASE_URL}/api/sites`)
            .then(res => res.json())
            .then(data => setHotspots(data))
            .catch(err => console.error("Error fetching sites:", err));

        fetch(`${API_BASE_URL}/api/sites/stats`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Error fetching stats:", err));
    };

    useEffect(() => {
        fetchStatsAndSites();
        const interval = setInterval(fetchStatsAndSites, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchSiteHistory = (siteId) => {
        setHistoryLoading(true);
        fetch(`${API_BASE_URL}/api/sites/${siteId}/history`)
            .then(res => res.json())
            .then(data => {
                setSiteHistory(data);
                setHistoryLoading(false);
            })
            .catch(err => {
                console.error("Error fetching history", err);
                setHistoryLoading(false);
            });
    };

    const handleSiteClick = (site) => {
        setSelectedSite(site);
        setDrawerOpen(true);
        fetchSiteHistory(site.id);
    };

    const handleDispatch = (action) => {
        if (!selectedSite) return;
        toast.loading(`Dispatching ${action} team...`, { id: 'dispatch' });
        
        // Mock successful dispatch for new actions
        setTimeout(() => {
            toast.success(`Team dispatched to ${selectedSite.name} for ${action}!`, { id: 'dispatch' });
        }, 1500);
    };

    const cityStats = [
        { label: t('totalActiveSites') || 'Active Sites', value: stats.totalActiveSites, icon: Layers, color: 'var(--accent)', spark: sparklineData },
        { label: t('wasteBacklog') || 'Waste Backlog', value: stats.wasteBacklog, icon: TrendingUp, color: '#f59e0b', spark: sparklineDataBacklog },
        { label: t('avgDegradation') || 'Avg Degradation', value: stats.avgDegradation, icon: Clock, color: 'var(--accent-acid)', spark: sparklineData },
        { label: t('alertsActive') || 'Active Alerts', value: stats.alertsActive, icon: AlertTriangle, color: '#ef4444', spark: sparklineData },
    ];

    return (
        <div className="space-y-6 relative overflow-hidden">
            {/* Stat grid with Sparklines */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px glass-panel" style={{ background: 'var(--border)' }}>
                {cityStats.map(stat => (
                    <div key={stat.label} className="relative p-5 transition-all duration-300 hover:-translate-y-1 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                        <div className="absolute inset-0 opacity-20 pointer-events-none mt-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stat.spark}>
                                    <Area type="monotone" dataKey="value" stroke={stat.color} fill={stat.color} strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                                <span className="glass-label">{stat.label}</span>
                            </div>
                            <p className="font-heading font-bold" style={{ fontSize: '2.2rem', lineHeight: 1, color: stat.color }}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                {/* Geospatial map */}
                <div className="lg:col-span-8 relative min-h-[600px] overflow-hidden glass-panel z-0" style={{ borderTop: '3px solid var(--accent)' }}>
                    
                    {/* Floating Map Labels & Layer Toolbar */}
                    <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
                        <div className="px-3 py-1.5 backdrop-blur-md bg-black/60 border border-white/10 rounded">
                            <p className="glass-label text-white">LIVE GEOSPATIAL COMMAND</p>
                        </div>
                        <div className="flex flex-col gap-1 mt-2 p-1.5 backdrop-blur-md bg-black/60 border border-white/10 rounded">
                            <button 
                                onClick={() => setMapLayer('piles')}
                                className={`p-2 rounded transition-colors ${mapLayer === 'piles' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-white'}`}
                                title="Pile Locations"
                            >
                                <Map className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setMapLayer('pathogen')}
                                className={`p-2 rounded transition-colors ${mapLayer === 'pathogen' ? 'bg-red-500/20 text-red-500' : 'text-gray-400 hover:text-white'}`}
                                title="Pathogen Heatmap"
                            >
                                <Biohazard className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setMapLayer('methane')}
                                className={`p-2 rounded transition-colors ${mapLayer === 'methane' ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-400 hover:text-white'}`}
                                title="Methane Concentration"
                            >
                                <Flame className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Translucent Weather Widget */}
                    {weather && (
                        <div className="absolute top-4 right-4 z-[400] backdrop-blur-xl bg-black/50 border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[200px]">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="text-xs font-heading font-bold tracking-wider text-white">MADURAI CLIMATE</span>
                                <Wind className="w-4 h-4 text-accent" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-1 text-gray-400 mb-1">
                                        <Thermometer className="w-3 h-3" />
                                        <span className="text-[10px] uppercase">Temp</span>
                                    </div>
                                    <p className="text-xl font-bold text-white">{weather.temp}°C</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 text-gray-400 mb-1">
                                        <Droplets className="w-3 h-3" />
                                        <span className="text-[10px] uppercase">Humid</span>
                                    </div>
                                    <p className="text-xl font-bold text-white">{weather.humidity}%</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                                <CloudRain className={`w-4 h-4 ${weather.precipProb > 50 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                                <span className="text-[10px] text-gray-300 uppercase tracking-widest">{weather.precipProb}% 12H Rain Prob</span>
                            </div>
                            {weather.precipProb > 50 && (
                                <p className="text-[9px] text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded">WARNING: Cover open compost piles.</p>
                            )}
                        </div>
                    )}
                    
                    <MapContainer 
                        center={maduraiCenter} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%', minHeight: '600px', background: '#0a0f0d' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        
                        {/* Dynamic Layers */}
                        {hotspots.map(spot => {
                            const isSelected = selectedSite?.id === spot.id;
                            
                            if (mapLayer === 'pathogen') {
                                const isRisk = spot.risk === 'Severe' || spot.risk === 'High';
                                return (
                                    <CircleMarker 
                                        key={spot.id} 
                                        center={[spot.lat, spot.lng]} 
                                        pathOptions={{ fillColor: isRisk ? '#ef4444' : '#f59e0b', color: 'transparent', fillOpacity: isRisk ? 0.4 : 0.1 }}
                                        radius={isRisk ? 50 : 20}
                                        eventHandlers={{ click: () => handleSiteClick(spot) }}
                                    />
                                );
                            }

                            if (mapLayer === 'methane') {
                                return (
                                    <CircleMarker 
                                        key={spot.id} 
                                        center={[spot.lat, spot.lng]} 
                                        pathOptions={{ fillColor: '#eab308', color: '#ca8a04', fillOpacity: 0.2, weight: 1 }}
                                        radius={spot.status === 'Overloaded' ? 60 : 30}
                                        eventHandlers={{ click: () => handleSiteClick(spot) }}
                                    />
                                );
                            }

                            return (
                                <Marker 
                                    key={spot.id} 
                                    position={[spot.lat, spot.lng]} 
                                    icon={createCustomIcon(spot.risk, isSelected)}
                                    eventHandlers={{
                                        click: () => handleSiteClick(spot),
                                    }}
                                />
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="overflow-hidden glass-panel h-full max-h-[600px] flex flex-col">
                        <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <MapPin className="w-4 h-4 animate-pulse" style={{ color: 'var(--accent)' }} />
                            <h3 className="font-heading font-bold text-lg text-white">{t('activeBioSites') || 'Active Bioremediation Sites'}</h3>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {hotspots.map((spot) => {
                                const isBad = spot.status === 'Overloaded' || spot.status === 'Critical';
                                const isSelected = selectedSite?.id === spot.id;
                                return (
                                    <div
                                        key={spot.id}
                                        className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200"
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            background: isSelected ? 'var(--bg-raised)' : 'transparent',
                                            borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                                        }}
                                        onClick={() => handleSiteClick(spot)}
                                    >
                                        <div>
                                            <p className="font-heading font-bold text-base text-white">{spot.name}</p>
                                            <p className="glass-label mt-1">{spot.piles} piles · {spot.backlog}</p>
                                        </div>
                                        <span
                                            className="glass-badge"
                                            style={{
                                                color: isBad ? '#ef4444' : 'var(--accent)',
                                                borderColor: isBad ? 'rgba(239,68,68,0.5)' : 'var(--accent)',
                                                background: isBad ? 'rgba(239,68,68,0.08)' : 'var(--accent-light)',
                                            }}
                                        >{spot.status}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Site Action Card Drawer */}
            <div 
                className={`fixed top-[72px] right-0 h-[calc(100vh-72px)] w-full sm:w-[500px] z-[999] transition-transform duration-500 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ background: 'rgba(5,15,12,0.85)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
            >
                {selectedSite && (
                    <div className="h-full flex flex-col p-6 overflow-y-auto">
                        <div className="flex justify-between items-start border-b border-white/10 pb-4 mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`glass-badge text-xs ${selectedSite.risk === 'Severe' ? 'text-red-400 border-red-400 bg-red-400/10' : 'text-accent border-accent bg-accent/10'}`}>
                                        {selectedSite.risk} Risk
                                    </span>
                                    <span className="text-gray-400 text-xs font-mono">{parseFloat(selectedSite.lat).toFixed(4)}, {parseFloat(selectedSite.lng).toFixed(4)}</span>
                                </div>
                                <h2 className="text-2xl font-heading font-bold text-white">{selectedSite.name}</h2>
                                <p className="text-gray-400 text-sm mt-1">{selectedSite.status} | {selectedSite.piles} Active Piles</p>
                            </div>
                            <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Live Telemetry Gauges */}
                        <div className="mb-6 glass-panel p-4 bg-black/40 border-white/5">
                            <h4 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-accent" /> Live Pile Telemetry
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <GaugeChart value={72} min={0} max={100} label="Moisture" color="#3b82f6" unit="%" />
                                <GaugeChart value={48} min={20} max={80} label="Temp" color="#ef4444" unit="°C" />
                                <GaugeChart value={6.8} min={0} max={14} label="pH Level" color="#8b5cf6" unit="" />
                                <GaugeChart value={25} min={10} max={40} label="C:N Ratio" color="#f59e0b" unit=":1" />
                            </div>
                        </div>

                        {/* 24-Hour Telemetry Trend */}
                        <div className="mb-6 glass-panel p-4 bg-black/40 border-white/5">
                            <h4 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-accent" /> 24-Hour Core Temperature
                            </h4>
                            <div className="h-[150px] w-full">
                                {historyLoading ? (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">Loading history...</div>
                                ) : siteHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={siteHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                            <XAxis dataKey="time_label" stroke="#555" fontSize={10} tickMargin={8} />
                                            <YAxis stroke="#555" fontSize={10} domain={['auto', 'auto']} />
                                            <Tooltip 
                                                contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '4px' }}
                                                labelStyle={{ color: '#888' }}
                                            />
                                            <Line type="monotone" dataKey="temperature_celsius" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">No telemetry data found</div>
                                )}
                            </div>
                        </div>

                        {/* Actionable Controls */}
                        <div className="mt-auto space-y-3">
                            <h4 className="font-heading font-bold text-white mb-2 text-sm uppercase tracking-wider text-gray-500">Action Plugins</h4>
                            
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <button onClick={() => handleDispatch('Sprinkler Adjust')} className="btn-glass text-xs flex items-center justify-center gap-2 py-3 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400">
                                    <Droplets className="w-4 h-4" /> Adjust Moisture
                                </button>
                                <button onClick={() => handleDispatch('Bti Larvicide')} className="btn-glass text-xs flex items-center justify-center gap-2 py-3 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400">
                                    <Biohazard className="w-4 h-4" /> Deploy Bti
                                </button>
                            </div>

                            <button onClick={() => handleDispatch('Turning Crew')} className="w-full glass-badge flex items-center justify-center gap-2 py-3 text-sm border-red-500 text-red-400 bg-red-500/10 hover:bg-red-500/20 cursor-pointer transition-colors font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                <Truck className="w-4 h-4" /> Dispatch Turning Crew
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
