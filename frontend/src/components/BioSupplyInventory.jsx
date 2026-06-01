import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Truck, Plus, Edit2, Trash2, X, Phone, Mail, MapPin, Star, ShieldCheck, Loader, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';

export default function BioSupplyInventory() {
    const { t } = useLanguage();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal & Form States
    const [modalMode, setModalMode] = useState(null); // 'edit', 'add', 'wholesalers'
    const [selectedItem, setSelectedItem] = useState(null);
    const [wholesalers, setWholesalers] = useState([]);
    const [wholesalersLoading, setWholesalersLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', category: '', stock: 0, unit: '', capacity: 0, 
        status: 'Optimal', supplier: '', last_restock: '', cost_per_unit: '', reorder_threshold: 0
    });

    const fetchInventory = () => {
        fetch(`${API_BASE_URL}/api/inventory`)
            .then(res => res.json())
            .then(data => {
                setInventory(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching inventory:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchInventory();
        const interval = setInterval(fetchInventory, 10000); // Less aggressive polling
        return () => clearInterval(interval);
    }, []);

    const fetchWholesalers = async (category) => {
        setWholesalersLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/wholesalers?item_category=${encodeURIComponent(category)}`);
            const data = await res.json();
            setWholesalers(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch wholesalers.");
        } finally {
            setWholesalersLoading(false);
        }
    };

    const getDynamicStatus = (stock, capacity) => {
        const pct = (stock / capacity) * 100;
        if (pct < 20) return 'Critical';
        if (pct < 40) return 'Low';
        if (pct < 75) return 'Moderate';
        return 'Optimal';
    };

    const getStatusStyle = (s) => {
        if (s === 'Critical') return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' };
        if (s === 'Low') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' };
        if (s === 'Moderate') return { color: '#eab308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)' };
        return { color: 'var(--accent)', bg: 'var(--accent-light)', border: 'var(--accent-deep)' };
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const url = modalMode === 'edit' ? `${API_BASE_URL}/api/inventory/${selectedItem.id}` : `${API_BASE_URL}/api/inventory`;
        const method = modalMode === 'edit' ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success(modalMode === 'edit' ? "Item updated!" : "Item added!");
                setModalMode(null);
                fetchInventory();
            } else {
                toast.error("Failed to save item.");
            }
        } catch (err) {
            toast.error("An error occurred.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/inventory/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Item deleted.");
                fetchInventory();
            }
        } catch (err) {
            toast.error("Failed to delete.");
        }
    };

    const openWholesalers = (item) => {
        setSelectedItem(item);
        setModalMode('wholesalers');
        fetchWholesalers(item.category);
    };

    const openEdit = (item) => {
        setSelectedItem(item);
        setFormData({
            name: item.name, category: item.category, stock: item.stock, unit: item.unit, 
            capacity: item.capacity, status: item.status, supplier: item.supplier, 
            last_restock: item.lastRestock || item.last_restock || '', 
            cost_per_unit: item.costPerUnit || item.cost_per_unit || '', 
            reorder_threshold: item.reorderThreshold || item.reorder_threshold || 0
        });
        setModalMode('edit');
    };

    const openAdd = () => {
        setFormData({
            name: '', category: 'Enzymes', stock: 0, unit: 'kg', capacity: 100, 
            status: 'Optimal', supplier: 'Unknown', last_restock: new Date().toISOString().split('T')[0], 
            cost_per_unit: '₹0', reorder_threshold: 20
        });
        setModalMode('add');
    };

    const enrichedInventory = inventory.map(item => ({
        ...item,
        computedStatus: getDynamicStatus(item.stock, item.capacity)
    }));

    const criticalCount = enrichedInventory.filter(i => i.computedStatus === 'Critical').length;
    const lowCount = enrichedInventory.filter(i => i.computedStatus === 'Low').length;

    const calculateInventoryValue = () => {
        let total = 0;
        inventory.forEach(item => {
            try {
                const costStr = String(item.costPerUnit || item.cost_per_unit || "0");
                const cost = parseFloat(costStr.replace(/[^0-9.]+/g, "")) || 0;
                total += cost * item.stock;
            } catch (e) {}
        });
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(total);
    };

    const handlePrintInvoice = () => {
        window.print();
    };

    return (
        <div className="space-y-6 relative">
            {/* ── WEB DASHBOARD UI (Hidden on Print) ── */}
            <div className="print:hidden space-y-6">
                {/* Header & Stats */}
                <div className="flex justify-between items-center">
                    <h2 className="font-heading font-bold text-2xl text-white">Bio-Supply Inventory</h2>
                    <div className="flex gap-4">
                        <button onClick={handlePrintInvoice} className="btn-glass flex items-center gap-2 border border-white/20 hover:bg-white/10">
                            <TrendingDown className="w-4 h-4" /> Download Report (PDF)
                        </button>
                        <button onClick={openAdd} className="btn-glass-primary flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Material
                        </button>
                    </div>
                </div>

            {/* Main Data Table */}
            {loading ? (
                <div className="p-12 flex justify-center items-center">
                    <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
            ) : (
                <div className="glass-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="glass-label px-6 py-4 font-bold">Material & Category</th>
                                    <th className="glass-label px-6 py-4 font-bold">Stock Level</th>
                                    <th className="glass-label px-6 py-4 font-bold">Cost Structure</th>
                                    <th className="glass-label px-6 py-4 font-bold">Status</th>
                                    <th className="glass-label px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrichedInventory.map(item => {
                                    const pct = Math.round((item.stock / item.capacity) * 100);
                                    const sc = getStatusStyle(item.computedStatus);
                                    const needsReorder = item.computedStatus === 'Critical' || item.computedStatus === 'Low';
                                    
                                    return (
                                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-heading font-bold text-base text-white">{item.name}</p>
                                                <p className="font-body text-xs text-gray-400 mt-1">{item.category}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 w-48">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-bold text-white">{item.stock.toFixed(1)} / {item.capacity}</span>
                                                        <span className="text-gray-400 text-xs">{item.unit}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                        <div style={{ height: '100%', width: `${pct}%`, background: sc.color }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-body text-sm font-medium text-white">{item.costPerUnit || item.cost_per_unit}</p>
                                                <p className="font-body text-xs text-gray-400 mt-1">Last Restock: {item.lastRestock || item.last_restock}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="glass-badge" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>
                                                    {item.computedStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {needsReorder && (
                                                        <button 
                                                            onClick={() => openWholesalers(item)}
                                                            className="btn-glass flex items-center gap-2 mr-2"
                                                            style={{ borderColor: '#f59e0b', color: '#f59e0b', padding: '6px 12px' }}
                                                            title="Contact Supplier"
                                                        >
                                                            <Phone className="w-3 h-3" /> Source
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEdit(item)} className="p-2 hover:bg-white/10 rounded transition-colors" title="Edit">
                                                        <Edit2 className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {enrichedInventory.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500 font-body">
                                            No materials in inventory.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Glassmorphism Modals - Hidden on Print */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
                    {/* Glass Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60" 
                        style={{ backdropFilter: 'blur(14px)' }} 
                        onClick={() => setModalMode(null)} 
                    />
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl glass-panel animate-slam-in" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="p-5 flex justify-between items-center border-b border-white/10">
                            <h3 className="font-heading font-bold text-xl text-white">
                                {modalMode === 'wholesalers' ? `Procurement: ${selectedItem?.name}` : modalMode === 'edit' ? 'Edit Material' : 'Add Material'}
                            </h3>
                            <button onClick={() => setModalMode(null)} className="p-1 hover:bg-white/10 rounded text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {(modalMode === 'add' || modalMode === 'edit') && (
                                <form onSubmit={handleFormSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Name</label>
                                            <input required type="text" className="w-full glass-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Category</label>
                                            <input required type="text" className="w-full glass-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Current Stock</label>
                                            <input required type="number" step="0.1" className="w-full glass-input" value={formData.stock} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Capacity</label>
                                            <input required type="number" step="0.1" className="w-full glass-input" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Unit (e.g. kg, L)</label>
                                            <input required type="text" className="w-full glass-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Cost per Unit (e.g. ₹850)</label>
                                            <input required type="text" className="w-full glass-input" value={formData.cost_per_unit} onChange={e => setFormData({...formData, cost_per_unit: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Supplier</label>
                                            <input required type="text" className="w-full glass-input" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="glass-label block mb-1 text-xs">Last Restock (YYYY-MM-DD)</label>
                                            <input required type="date" className="w-full glass-input" value={formData.last_restock} onChange={e => setFormData({...formData, last_restock: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={() => setModalMode(null)} className="btn-glass">Cancel</button>
                                        <button type="submit" className="btn-glass-primary flex items-center gap-2">
                                            <Save className="w-4 h-4" /> Save Changes
                                        </button>
                                    </div>
                                </form>
                            )}

                            {modalMode === 'wholesalers' && (
                                <div>
                                    <p className="text-gray-400 mb-4 text-sm font-body">
                                        Stock for <strong className="text-white">{selectedItem?.name}</strong> is critically low. Contact verified B2B wholesalers below for emergency procurement.
                                    </p>
                                    
                                    {wholesalersLoading ? (
                                        <div className="flex justify-center p-8"><Loader className="w-6 h-6 animate-spin text-accent" /></div>
                                    ) : (
                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                            {wholesalers.map((w, idx) => (
                                                <div key={idx} className="p-4 glass-panel bg-black/40 hover:bg-black/60 transition-colors border-white/5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                                                                {w.name}
                                                                <ShieldCheck className="w-4 h-4 text-green-400" title="Verified Supplier" />
                                                            </h4>
                                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                                <MapPin className="w-3 h-3" /> {w.location}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-xs font-bold border border-yellow-500/20">
                                                            <Star className="w-3 h-3 fill-yellow-500" /> {w.rating}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 mt-3">
                                                        <a href={`tel:${w.contact}`} className="flex-1 btn-glass text-center text-sm py-2 flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border-white/10">
                                                            <Phone className="w-4 h-4" /> {w.contact}
                                                        </a>
                                                        <a href={`mailto:${w.email}`} className="flex-1 btn-glass text-center text-sm py-2 flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 border-white/10">
                                                            <Mail className="w-4 h-4" /> Email Quote
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                            {wholesalers.length === 0 && (
                                                <p className="text-center text-gray-500 py-4">No suppliers found for this category.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* ── PRINT-ONLY INVOICE LAYOUT ── */}
            <div className="hidden print:block absolute inset-0 bg-white text-black p-10 font-sans z-50 min-h-screen -mt-20">
                <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                    <div>
                        <h1 className="text-4xl font-bold mb-1">Official Inventory Report</h1>
                        <p className="text-gray-700 text-sm">Bio-Chemical Control Unit · Madurai District Smart City</p>
                    </div>
                    <div className="text-right text-sm text-gray-700">
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Report ID:</strong> INV-{Math.floor(Math.random()*10000)}</p>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4 text-sm bg-gray-100 p-4 rounded border border-gray-300">
                    <div><strong>Total Inventory Value:</strong> {calculateInventoryValue()}</div>
                    <div><strong>Critical Stock Alerts:</strong> {criticalCount} items require immediate procurement</div>
                </div>

                <table className="w-full text-left text-sm border-collapse border border-gray-400">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-gray-400 px-4 py-2 font-bold text-gray-900">Material & Category</th>
                            <th className="border border-gray-400 px-4 py-2 font-bold text-gray-900">Supplier</th>
                            <th className="border border-gray-400 px-4 py-2 font-bold text-gray-900">Stock Level</th>
                            <th className="border border-gray-400 px-4 py-2 font-bold text-gray-900">Cost Structure</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrichedInventory.map(item => (
                            <tr key={item.id} className="border-b border-gray-300">
                                <td className="border border-gray-400 px-4 py-3">
                                    <p className="font-bold text-black">{item.name}</p>
                                    <p className="text-xs text-gray-600 mt-1">{item.category}</p>
                                </td>
                                <td className="border border-gray-400 px-4 py-3 text-gray-800">{item.supplier}</td>
                                <td className="border border-gray-400 px-4 py-3">
                                    <span className="font-bold text-black">{item.stock.toFixed(1)} / {item.capacity}</span> {item.unit}
                                </td>
                                <td className="border border-gray-400 px-4 py-3">
                                    <p className="text-gray-900">{item.costPerUnit || item.cost_per_unit}</p>
                                    <p className="text-xs text-gray-600 mt-1">Restocked: {item.lastRestock || item.last_restock}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-center text-gray-500">
                    Generated automatically by Mei Arivu Intelligence Platform. Valid for internal municipal audit.
                </div>
            </div>
        </div>
    );
}
