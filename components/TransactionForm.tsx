"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Check, DollarSign, Tag, ChevronRight } from "lucide-react";

export default function TransactionForm({ onClose, onSuccess, userId }: { onClose: () => void, onSuccess: () => void, userId: string }) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    // Category Logic
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedParentId, setSelectedParentId] = useState<string>("");
    const [selectedSubId, setSelectedSubId] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const fetchCats = async () => {
            const { data } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');
            if (data) setCategories(data);
        };
        fetchCats();
    }, [userId]);

    // Derive parents and subs
    const parents = categories.filter(c => !c.parent_id);
    const subs = selectedParentId ? categories.filter(c => c.parent_id === selectedParentId) : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // If subcategory selected, use that. If not, use parent.
        const finalCategoryId = selectedSubId || selectedParentId;

        if (!finalCategoryId) {
            alert("Por favor selecciona una categoría.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('transactions').insert({
            user_id: userId,
            amount: parseFloat(amount),
            note,
            date,
            category_id: finalCategoryId
        });

        if (!error) {
            onSuccess();
            onClose();
        } else {
            console.error(error);
            alert("Error al guardar.");
        }
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20 backdrop-blur-md">
                <h2 className="text-2xl font-headline font-bold text-white">Nueva Transacción</h2>
                <button onClick={onClose} className="text-muted-foreground hover:text-white transition">
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">

                {/* Amount */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        <DollarSign size={14} className="text-primary" /> Monto
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-white font-mono">$</span>
                        <input
                            type="number"
                            required
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-black/40 border-2 border-white/10 rounded-2xl py-4 pl-10 pr-4 text-3xl font-mono text-white placeholder:text-muted-foreground focus:border-primary focus:shadow-neon outline-none transition-all"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                            <Tag size={14} className="text-primary-cyan" /> Categoría Principal
                        </label>
                        <select
                            required
                            value={selectedParentId}
                            onChange={e => {
                                setSelectedParentId(e.target.value);
                                setSelectedSubId(""); // Reset sub on parent change
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-cyan transition-all outline-none appearance-none"
                        >
                            <option value="" className="text-black bg-white">-- Seleccionar --</option>
                            {parents.map(c => (
                                <option key={c.id} value={c.id} className="text-black bg-white">
                                    {c.name} ({c.type === 'income' ? 'Ingreso' : 'Gasto'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategories (Conditional) */}
                    {selectedParentId && subs.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm text-muted-foreground font-medium flex items-center gap-2 pl-4 border-l-2 border-white/10">
                                <ChevronRight size={14} /> Subcategoría (Opcional)
                            </label>
                            <select
                                value={selectedSubId}
                                onChange={e => setSelectedSubId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary-cyan transition-all outline-none appearance-none"
                            >
                                <option value="" className="text-black bg-white">-- General --</option>
                                {subs.map(c => (
                                    <option key={c.id} value={c.id} className="text-black bg-white">
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Date & Desc */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-medium">Fecha</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-muted-foreground font-medium">Nota</label>
                        <input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Detalle..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        />
                    </div>
                </div>

            </form>

            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-md">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-primary-hover text-white font-bold py-4 rounded-xl shadow-neon hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Guardando..." : <><Check /> Guardar Transacción</>}
                </button>
            </div>
        </div>
    );
}
