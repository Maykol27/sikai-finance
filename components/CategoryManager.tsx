"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Trash2, ChevronRight, ChevronDown, Folder, Save, X, Sparkles } from "lucide-react";
import { clsx } from "clsx";

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
    const [newCatName, setNewCatName] = useState("");
    const [selectedParent, setSelectedParent] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) fetchCategories();
    }, [isOpen]);

    const fetchCategories = async () => {
        setLoading(true);
        const { data } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');

        if (data) {
            const tree: Category[] = [];
            const map: Record<string, Category> = {};

            // Initialize map with subcategories array
            data.forEach((c: any) => {
                map[c.id] = { ...c, subcategories: [] };
            });

            // Build tree
            data.forEach((c: any) => {
                if (c.parent_id && map[c.parent_id]) {
                    map[c.parent_id].subcategories?.push(map[c.id]);
                } else if (!c.parent_id) { // Only add to root if no parent
                    tree.push(map[c.id]);
                }
            });

            setCategories(tree);

            // Auto-expand all for better visibility initially
            const initialExpanded: Record<string, boolean> = {};
            tree.forEach(c => initialExpanded[c.id] = true);
            setExpanded(prev => ({ ...prev, ...initialExpanded }));
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newCatName.trim()) return;

        const { error } = await supabase.from('categories').insert({
            user_id: userId,
            name: newCatName,
            type: 'expense',
            parent_id: selectedParent
        });

        if (!error) {
            setNewCatName("");
            fetchCategories();
        }
    };

    const seedDefaults = async () => {
        setLoading(true);
        const defaults = [
            { name: "Ingresos", type: "income", subs: ["Salario", "Freelance", "Inversiones"] },
            { name: "Vivienda", type: "expense", subs: ["Alquiler", "Servicios", "Mantenimiento"] },
            { name: "Comida", type: "expense", subs: ["Supermercado", "Restaurantes", "Delivery"] },
            { name: "Transporte", type: "expense", subs: ["Gasolina", "Transporte Público", "Mantenimiento Auto"] },
            { name: "Ocio", type: "expense", subs: ["Suscripciones (Netflix/Spotify)", "Cine", "Salidas"] },
            { name: "Salud", type: "expense", subs: ["Farmacia", "Consultas", "Seguro"] },
        ];

        for (const def of defaults) {
            // Insert Parent
            const { data: parent, error } = await supabase.from('categories').insert({
                user_id: userId,
                name: def.name,
                type: def.type
            }).select().single();

            if (parent && !error) {
                // Insert Subcategories
                const subsToInsert = def.subs.map(subName => ({
                    user_id: userId,
                    name: subName,
                    type: def.type,
                    parent_id: parent.id
                }));
                await supabase.from('categories').insert(subsToInsert);
            }
        }
        await fetchCategories();
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar esta categoría?")) {
            await supabase.from('categories').delete().eq('id', id);
            fetchCategories();
        }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-card w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-300 border-glow flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
                        <Folder className="text-primary-cyan" /> Gestión de Categorías
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Add New */}
                <div className="flex flex-col gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10 shrink-0">
                    <div className="flex gap-2">
                        <input
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            placeholder="Nombre de categoría..."
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-primary-cyan focus:ring-1 focus:ring-primary-cyan outline-none text-white placeholder:text-muted-foreground"
                        />
                        <button onClick={handleAdd} disabled={!newCatName.trim()} className="bg-primary hover:bg-primary-hover text-white rounded-lg px-4 flex items-center justify-center transition-all shadow-neon disabled:opacity-50">
                            <Plus />
                        </button>
                    </div>

                    <select
                        value={selectedParent || ""}
                        onChange={e => setSelectedParent(e.target.value === "" ? null : e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-muted-foreground outline-none"
                    >
                        <option value="">-- Sin categoría padre (Raíz) --</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 min-h-0">
                    {loading ? (
                        <p className="text-center text-muted-foreground py-4">Cargando...</p>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-8 space-y-4">
                            <p className="text-muted-foreground">No hay categorías aun.</p>
                            <button onClick={seedDefaults} className="px-4 py-2 bg-primary-cyan/20 text-primary-cyan rounded-full border border-primary-cyan/50 hover:bg-primary-cyan/30 flex items-center gap-2 mx-auto transition-all">
                                <Sparkles size={16} /> Crear Sugeridas
                            </button>
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="space-y-1">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-white/5 border border-transparent hover:border-white/10 transition group">
                                    <div className="flex items-center gap-2 text-white flex-1">
                                        {cat.subcategories && cat.subcategories.length > 0 ? (
                                            <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground hover:text-white p-1">
                                                {expanded[cat.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                        ) : (
                                            <span className="w-6"></span>
                                        )}
                                        <span className="font-medium truncate">{cat.name}</span>
                                    </div>
                                    <button onClick={() => handleDelete(cat.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-2 rounded transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {/* Subcategories */}
                                {expanded[cat.id] && cat.subcategories?.map(sub => (
                                    <div key={sub.id} className="ml-10 flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-sm group-sub">
                                        <span className="text-muted-foreground truncate">{sub.name}</span>
                                        <button onClick={() => handleDelete(sub.id)} className="opacity-0 group-sub-hover:opacity-100 text-red-500 hover:text-red-400 transition p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
