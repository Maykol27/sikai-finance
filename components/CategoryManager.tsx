"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Trash2, ChevronRight, ChevronDown, Folder, X, CheckCircle, AlertCircle, CornerDownRight } from "lucide-react";

type Category = {
    id: string;
    name: string;
    type: 'income' | 'expense';
    parent_id: string | null;
    subcategories?: Category[];
};

export default function CategoryManager({ userId, isOpen, onClose }: { userId: string, isOpen: boolean, onClose: () => void }) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // New Root Category State
    const [newRootName, setNewRootName] = useState("");
    const [rootType, setRootType] = useState<'income' | 'expense'>('expense');

    // Inline Subcategory State
    const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
    const [newSubName, setNewSubName] = useState("");

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // Notification System
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) fetchCategories();
    }, [isOpen]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000); // 3 seconds visibility
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type });
    };

    const fetchCategories = async () => {
        setLoading(true);
        const { data } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');

        if (data) {
            const tree: Category[] = [];
            const map: Record<string, Category> = {};

            // Initialize map
            data.forEach((c: any) => {
                map[c.id] = { ...c, subcategories: [] };
            });

            // Build tree
            data.forEach((c: any) => {
                if (c.parent_id && map[c.parent_id]) {
                    map[c.parent_id].subcategories?.push(map[c.id]);
                } else if (!c.parent_id) {
                    tree.push(map[c.id]);
                }
            });

            // Sort: Income first, then Expense
            tree.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'income' ? -1 : 1));

            setCategories(tree);

            // Auto-expand all
            const initialExpanded: Record<string, boolean> = {};
            tree.forEach(c => initialExpanded[c.id] = true);
            setExpanded(prev => ({ ...prev, ...initialExpanded }));
        }
        setLoading(false);
    };

    const handleAddRoot = async () => {
        if (!newRootName.trim()) return;

        const { error } = await supabase.from('categories').insert({
            user_id: userId,
            name: newRootName.trim(),
            type: rootType,
            parent_id: null
        });

        if (!error) {
            showNotify("Categoría principal creada");
            setNewRootName("");
            fetchCategories();
        } else {
            showNotify("Error al crear categoría", 'error');
        }
    };

    const handleAddSub = async (parentId: string, parentType: 'income' | 'expense') => {
        if (!newSubName.trim()) return;

        const { error } = await supabase.from('categories').insert({
            user_id: userId,
            name: newSubName.trim(),
            type: parentType,
            parent_id: parentId
        });

        if (!error) {
            showNotify("Subcategoría agregada exitosamente");
            setNewSubName("");
            setAddingSubTo(null);
            fetchCategories();
        } else {
            showNotify("Error al crear subcategoría", 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar esta categoría y todo su contenido?")) {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (!error) {
                showNotify("Categoría eliminada");
                fetchCategories();
            } else {
                showNotify("No se pudo eliminar", 'error');
            }
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-card w-full max-w-lg p-0 relative animate-in fade-in zoom-in duration-300 border-glow flex flex-col max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-black/40">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
                            <Folder className="text-primary-cyan" /> Gestión de Categorías
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-white transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Notification Toast */}
                    {notification && (
                        <div className={`absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in ${notification.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}>
                            {notification.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {notification.msg}
                        </div>
                    )}

                    {/* Add New Root Form */}
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nueva Categoría Principal</label>
                        <div className="flex gap-2">
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden focus-within:border-primary-cyan transition-colors flex-1">
                                <select
                                    value={rootType}
                                    onChange={(e) => setRootType(e.target.value as any)}
                                    className="bg-white/5 text-white text-xs py-2.5 px-3 border-r border-white/10 outline-none"
                                >
                                    <option value="income"> Ingreso</option>
                                    <option value="expense"> Gasto</option>
                                </select>
                                <input
                                    value={newRootName}
                                    onChange={e => setNewRootName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddRoot()}
                                    placeholder="Nombre..."
                                    className="bg-transparent px-3 py-2 text-sm w-full outline-none text-white placeholder:text-muted-foreground"
                                />
                            </div>
                            <button
                                onClick={handleAddRoot}
                                disabled={!newRootName.trim()}
                                className="bg-primary hover:bg-primary-hover text-white rounded-lg w-10 flex items-center justify-center transition-all shadow-neon disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 bg-[#0a0a0a]">
                    {loading ? (
                        <p className="text-center text-muted-foreground py-10 animate-pulse">Cargando...</p>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-10 space-y-2 opacity-50">
                            <Folder size={48} className="mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Comienza agregando una categoría arriba.</p>
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Parent Row */}
                                <div className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${cat.type === 'income' ? 'bg-primary-cyan/5 border-primary-cyan/20 hover:border-primary-cyan/50' : 'bg-pink-500/5 border-pink-500/20 hover:border-pink-500/50'
                                    }`}>
                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                        <button
                                            onClick={() => toggleExpand(cat.id)}
                                            className={`p-1 rounded-full transition-colors ${cat.type === 'income' ? 'text-primary-cyan hover:bg-primary-cyan/20' : 'text-pink-500 hover:bg-pink-500/20'}`}
                                        >
                                            {expanded[cat.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                        <div className="flex flex-col">
                                            <span className={`font-bold text-sm ${cat.type === 'income' ? 'text-primary-cyan' : 'text-pink-500'}`}>
                                                {cat.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{cat.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setAddingSubTo(addingSubTo === cat.id ? null : cat.id);
                                                setNewSubName("");
                                                if (!expanded[cat.id]) toggleExpand(cat.id);
                                            }}
                                            className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            title="Agregar Subcategoría"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Eliminar Categoría"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Subcategories Area */}
                                {expanded[cat.id] && (
                                    <div className="ml-4 pl-4 border-l border-white/10 py-2 space-y-2">

                                        {/* Inline Add Sub Form */}
                                        {addingSubTo === cat.id && (
                                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/20 animate-in slide-in-from-left-2">
                                                <CornerDownRight size={14} className="text-muted-foreground" />
                                                <input
                                                    autoFocus
                                                    value={newSubName}
                                                    onChange={e => setNewSubName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAddSub(cat.id, cat.type);
                                                        if (e.key === 'Escape') setAddingSubTo(null);
                                                    }}
                                                    placeholder="Nombre de subcategoría..."
                                                    className="bg-transparent text-sm w-full outline-none text-white placeholder:text-muted-foreground/50"
                                                />
                                                <button onClick={() => handleAddSub(cat.id, cat.type)} className="text-primary-cyan hover:text-white"><Plus size={16} /></button>
                                                <button onClick={() => setAddingSubTo(null)} className="text-red-400 hover:text-white"><X size={16} /></button>
                                            </div>
                                        )}

                                        {/* Sub Items */}
                                        {cat.subcategories?.map(sub => (
                                            <div key={sub.id} className="group/sub flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-sm transition-colors">
                                                <div className="flex items-center gap-2 text-muted-foreground group-hover/sub:text-white transition-colors">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover/sub:bg-white/50" />
                                                    <span>{sub.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(sub.id)}
                                                    className="opacity-0 group-hover/sub:opacity-100 text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        {!addingSubTo && (!cat.subcategories || cat.subcategories.length === 0) && (
                                            <p className="text-[10px] text-muted-foreground pl-4 italic opacity-50">Sin subcategorías</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
