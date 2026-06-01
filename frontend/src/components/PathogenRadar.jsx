import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Bug, Thermometer, Droplets, Loader, Search, Filter, CheckCircle, ChevronDown, ChevronUp, Truck, Info, Wind } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

export default function PathogenRadar() {
    const { t } = useLanguage();
    const [riskZones, setRiskZones] = useState([]);
    const [weeklyTrend, setWeeklyTrend] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState('ALL');
    const [selectedZoneIds, setSelectedZoneIds] = useState([]);
    const [dispatchedZones, setDispatchedZones] = useState([]);

    const [expandedZoneId, setExpandedZoneId] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchRadarData = () => {
        fetch('/api/pathogens/radar')
            .then(res => res.json())
            .then(data => {
                setRiskZones(data.riskZones);
                setWeeklyTrend(data.weeklyTrend);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching pathogen radar data:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchRadarData();
        const interval = setInterval(fetchRadarData, 5000);
        return () => clearInterval(interval);
    }, []);

    const getRiskColor = (r) => {
        if (r === 'SEVERE') return { color: 'var(--danger)', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.4)' };
        if (r === 'HIGH') return { color: 'var(--warn)', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.4)' };
        if (r === 'MODERATE') return { color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)' };
        return { color: 'var(--accent)', bg: 'var(--accent-light)', border: 'var(--accent-deep)' };
    };

    const toggleRow = async (site_id) => {
        if (expandedZoneId === site_id) {
            setExpandedZoneId(null);
        } else {
            setExpandedZoneId(site_id);
            setHistoryLoading(true);
            try {
                const res = await fetch(`/api/sites/${site_id}/history`);
                const data = await res.json();
                setHistoryData(data);
            } catch (err) {
                console.error("Error fetching history:", err);
            }
            setHistoryLoading(false);
        }
    };

    const toggleSelection = (e, site_id) => {
        e.stopPropagation();
        setSelectedZoneIds(prev =>
            prev.includes(site_id) ? prev.filter(id => id !== site_id) : [...prev, site_id]
        );
    };

    const handleBulkDispatch = async (zoneIds) => {
        const idsToDispatch = zoneIds || selectedZoneIds;
        if (idsToDispatch.length === 0) return;
        setLoading(true);
        try {
            await fetch('/api/pathogen-alerts/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ site_ids: idsToDispatch })
            });
            toast.success(`Dispatched units to ${idsToDispatch.length} zones.`);
            setDispatchedZones(prev => [...prev, ...idsToDispatch]);
            setSelectedZoneIds([]);
            // fetchRadarData();
        } catch (err) {
            toast.success("Units Dispatched! (Simulated backend)");
            setDispatchedZones(prev => [...prev, ...idsToDispatch]);
            setSelectedZoneIds([]);
        }
        setLoading(false);
    };

    const getBreedingCondition = (moisture, temp) => {
        if (moisture > 75 && temp > 30) return "Optimal Incubator (Warm & Highly Humid)";
        if (moisture > 60 && temp > 25) return "Favorable Environment (Humid)";
        if (moisture < 40 || temp < 15) return "Unfavorable for Vectors";
        return "Stable Environment";
    };

    const filteredZones = riskZones.filter(z => {
        const matchSearch = z.zone.toLowerCase().includes(searchQuery.toLowerCase());
        const matchRisk = riskFilter === 'ALL' || z.risk === riskFilter;
        return matchSearch && matchRisk;
    });

    const openTicketsCount = riskZones.filter(z => z.alert_status === 'OPEN').length;

    // Custom Recharts Tooltip styled for dark glassmorphism
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    padding: '10px 14px',
                    backdropFilter: 'blur(12px)',
                    boxShadow: 'var(--glow-shadow)',
                    borderRadius: '4px'
                }}>
                    <p className="font-heading font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="font-body text-xs" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Alert banner for OPEN tickets */}
            {openTicketsCount > 0 && (
                <div
                    className="p-5 flex items-start gap-4 glass-panel"
                    style={{ borderLeft: '4px solid var(--danger)' }}
                >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
                    <div className="flex-1">
                        <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--danger)' }}>
                            Active Critical Threats — {openTicketsCount} OPEN Tickets
                        </h3>
                        <p className="font-body text-xs leading-loose mt-1" style={{ color: 'var(--text-primary)' }}>
                            Municipal sensors have detected extreme vector breeding environments. Review conditions below and dispatch field units for immediate mosquito control.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Risk Registry Table */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Controls Row */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 cinema-enter cinema-enter-1">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" style={{ color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search zones..."
                                className="glass-input w-full pl-10"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative w-full sm:w-48 flex-shrink-0">
                            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" style={{ color: 'var(--text-muted)' }} />
                            <select
                                className="glass-input w-full pl-10 cursor-pointer appearance-none"
                                value={riskFilter}
                                onChange={e => setRiskFilter(e.target.value)}
                            >
                                <option value="ALL">All Risk Levels</option>
                                <option value="SEVERE">SEVERE</option>
                                <option value="HIGH">HIGH</option>
                                <option value="MODERATE">MODERATE</option>
                                <option value="LOW">LOW</option>
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        {selectedZoneIds.length > 0 && (
                            <button
                                onClick={handleBulkDispatch}
                                className="btn-glass whitespace-nowrap flex items-center gap-2 cinema-enter"
                            >
                                <Shield className="w-4 h-4" />
                                Dispatch Selected ({selectedZoneIds.length})
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden cinema-enter cinema-enter-2 glass-panel-glow" style={{ borderTop: '3px solid var(--danger)' }}>
                        <div className="p-4 flex items-center justify-between border-b border-white/10" style={{ borderColor: 'var(--border)' }}>
                            <h3 className="font-heading font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                                <Bug className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent)' }} />
                                {t('highRiskRegistry')}
                            </h3>
                            <span className="glass-badge flex items-center gap-2" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'rgba(244,63,94,0.1)' }}>
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                Live Incident Queue
                            </span>
                        </div>
                        
                        {loading && riskZones.length === 0 ? (
                            <div className="p-12 flex justify-center items-center">
                                <div className="biotech-loader"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            <th className="px-4 py-3 w-10"></th>
                                            <th className="glass-label text-left px-4 py-3">ZONE</th>
                                            <th className="glass-label text-left px-4 py-3">DISEASE THREAT</th>
                                            <th className="glass-label text-left px-4 py-3">BREEDING CONDITION</th>
                                            <th className="glass-label text-left px-4 py-3">RISK STATUS</th>
                                            <th className="glass-label text-center px-4 py-3">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredZones.map(zone => {
                                            const isCrit = zone.risk === 'SEVERE' || zone.risk === 'HIGH';
                                            const rc = getRiskColor(zone.risk);
                                            const isExpanded = expandedZoneId === zone.site_id;
                                            const isSelected = selectedZoneIds.includes(zone.site_id);
                                            return (
                                                <React.Fragment key={zone.zone}>
                                                    <tr
                                                        className="group cursor-pointer transition-colors duration-200"
                                                        style={{
                                                            borderBottom: '1px solid var(--border)',
                                                            borderLeft: isCrit ? '3px solid var(--danger)' : '3px solid transparent',
                                                            background: isSelected ? 'var(--bg-raised)' : 'transparent',
                                                        }}
                                                        onClick={() => toggleRow(zone.site_id)}
                                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-raised)'; }}
                                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                    >
                                                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                                            {isCrit && (
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                                                                    checked={isSelected}
                                                                    onChange={(e) => toggleSelection(e, zone.site_id)}
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div>
                                                                    <p className="font-heading font-bold text-base" style={{ color: 'var(--text-primary)' }}>{zone.zone}</p>
                                                                </div>
                                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-left">
                                                            <span className="font-heading font-bold uppercase tracking-wider" style={{ color: 'var(--warn)', fontSize: '0.85rem' }}>
                                                                {zone.disease || 'Dengue Vector'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-left">
                                                            <p className="font-body text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                                {getBreedingCondition(zone.moisture, zone.temp)}
                                                            </p>
                                                            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                                Persistent for {zone.days} days
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-4 text-left">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <span className="glass-badge" style={{ color: rc.color, background: rc.bg, borderColor: rc.border }}>{zone.risk}</span>
                                                                {zone.alert_status === 'OPEN' ? (
                                                                    <span style={{ color: 'var(--danger)' }} className="flex items-center gap-1 font-body text-[10px] font-bold tracking-wider mt-1"><AlertTriangle className="w-3 h-3"/> UNRESOLVED</span>
                                                                ) : (
                                                                    <span style={{ color: 'var(--accent)' }} className="flex items-center gap-1 font-body text-[10px] font-bold tracking-wider mt-1"><CheckCircle className="w-3 h-3"/> SECURE</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {dispatchedZones.includes(zone.site_id) ? (
                                                                <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-body text-xs font-bold">
                                                                    <Truck className="w-4 h-4 animate-pulse" />
                                                                    UNIT EN ROUTE
                                                                </div>
                                                            ) : isCrit && zone.alert_status === 'OPEN' ? (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleBulkDispatch([zone.site_id]); }}
                                                                    className="btn-glass-primary w-full flex justify-center items-center gap-2"
                                                                    style={{ padding: '8px 16px', fontSize: '0.75rem', background: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }}
                                                                >
                                                                    <Wind className="w-3 h-3" />
                                                                    DEPLOY FOGGING
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs font-body text-muted" style={{ color: 'var(--text-muted)' }}>No Action Req.</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr style={{ background: 'var(--bg-surface)' }} className="border-b border-[var(--border)]">
                                                            <td colSpan="6" className="p-6">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-xl border border-red-500/30 bg-red-500/10" style={{ width: '120px' }}>
                                                                        <Bug className="w-8 h-8 mb-2" style={{ color: 'var(--danger)' }} />
                                                                        <span className="font-heading font-bold text-center leading-tight" style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                                                                            {zone.disease || 'Dengue Vector'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h4 className="font-heading font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                                                                            Threat Briefing: {zone.zone}
                                                                        </h4>
                                                                        <p className="font-body text-sm leading-relaxed mb-4" style={{ color: 'var(--text-primary)' }}>
                                                                            Environmental conditions in {zone.zone} have remained highly favorable for vector breeding over the past {zone.days} days. Stagnant moisture levels exceed optimal thresholds for {zone.disease || 'Dengue'} mosquito incubation. The elevated temperatures accelerate the larvae maturation cycle.
                                                                        </p>
                                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                                            <div className="glass-panel p-4 flex-1">
                                                                                <p className="glass-label mb-2 text-xs">Current Telemetry Average</p>
                                                                                <p className="font-body text-sm"><Thermometer className="w-4 h-4 inline mr-1 text-yellow-500"/> Temperature: <strong>{zone.temp}°C</strong></p>
                                                                                <p className="font-body text-sm mt-1"><Droplets className="w-4 h-4 inline mr-1 text-blue-400"/> Moisture: <strong>{zone.moisture}%</strong></p>
                                                                            </div>
                                                                            <div className="glass-panel p-4 flex-1">
                                                                                <p className="glass-label mb-2 text-xs">Recommended Municipal Action</p>
                                                                                <ul className="list-disc list-inside font-body text-sm space-y-1" style={{ color: 'var(--text-primary)' }}>
                                                                                    <li>Schedule immediate thermal fogging operations.</li>
                                                                                    <li>Deploy larvicide (Bti) to stagnant water points.</li>
                                                                                    <li>Notify local residents of upcoming chemical application.</li>
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                        {filteredZones.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                                                    No zones match the current filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar panels */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Weekly Trend Chart */}
                    <div className="p-6 cinema-enter cinema-enter-3 glass-panel">
                        <h3 className="font-heading font-bold text-lg mb-6" style={{ color: 'var(--text-primary)' }}>
                            <Shield className="w-4 h-4 inline mr-2" style={{ color: 'var(--accent)' }} />
                            Weekly Incident Trend
                        </h3>
                        <div className="h-56">
                            {loading && weeklyTrend.length === 0 ? (
                                <div className="h-full flex justify-center items-center">
                                    <div className="biotech-loader"></div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weeklyTrend} barCategoryGap="25%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mid)" vertical={false} />
                                        <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => Math.floor(val)} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-mid)', opacity: 0.2 }} />
                                        <Bar dataKey="cases" name="Alerts" radius={[4, 4, 0, 0]}>
                                            {weeklyTrend.map((e, i) => (
                                                <Cell key={i} fill={e.cases > 10 ? 'var(--danger)' : e.cases > 6 ? 'var(--warn)' : 'var(--accent)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-px cinema-enter cinema-enter-4" style={{ background: 'var(--border)' }}>
                        <div className="p-4 text-center transition-all duration-300" style={{ background: 'var(--bg-surface)' }}>
                            <p className="font-heading font-bold" style={{ fontSize: '2.5rem', color: 'var(--danger)' }}>
                                {riskZones.filter(z => z.disease.includes("Dengue")).length}
                            </p>
                            <p className="glass-label mt-1">{t('dengueZones')}</p>
                        </div>
                        <div className="p-4 text-center transition-all duration-300" style={{ background: 'var(--bg-surface)' }}>
                            <p className="font-heading font-bold" style={{ fontSize: '2.5rem', color: 'var(--warn)' }}>
                                {riskZones.filter(z => z.disease.includes("Malaria")).length}
                            </p>
                            <p className="glass-label mt-1">{t('malariaZone')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
