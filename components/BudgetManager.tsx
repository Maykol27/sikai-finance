"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Target, Save, X, ChevronLeft, ChevronRight, Download, History, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

type Budget = {
    id?: string;
    category_id: string;
    amount: number;
    month: string; // YYYY-MM-01
};

export default function BudgetManager({ userId, isOpen, onClose, onOpenCategories }: { userId: string, isOpen: boolean, onClose: () => void, onOpenCategories: () => void }) {
    // ... existing code ...
    const [categories, setCategories] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [originalBudgets, setOriginalBudgets] = useState<Record<string, number>>({});
    const [actualSpending, setActualSpending] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modified, setModified] = useState(false);

    // Month Navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const currentMonthStr = currentDate.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01 format

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen, currentMonthStr]);

    // Check for modifications
    useEffect(() => {
        let isModified = false;
        for (const key in budgets) {
            if (budgets[key] !== originalBudgets[key]) {
                isModified = true;
                break;
            }
        }
        setModified(isModified);
    }, [budgets, originalBudgets]);

    const changeMonth = (offset: number) => {
        if (modified) {
            if (!confirm("Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de mes?")) return;
        }
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
        setModified(false);
    };

    const loadData = async () => {
        setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const currentMonthStr = currentDate.toISOString().slice(0, 7) + '-01';

        // 1. Fetch Categories
        const { data: catData } = await supabase.from('categories').select('*').eq('user_id', userId).order('name');
        setCategories(catData || []);

        // 2. Fetch Budgets for this month (Using Integers)
        const { data: budData } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', userId)
            .eq('year', year)
            .eq('month', month);

        const budgetMap: Record<string, number> = {};
        budData?.forEach((b: any) => {
            budgetMap[b.category_id] = b.amount;
        });
        setBudgets(budgetMap);
        setOriginalBudgets({ ...budgetMap }); // Deep copy for comparison

        // 3. Calculate Actual Spending (Manual Join Logic to avoid 400 error)
        // Fetch all transactions for this month
        const startOfMonth = currentMonthStr;
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().slice(0, 10);

        const { data: txData } = await supabase
            .from('transactions')
            .select('*') // No join
            .eq('user_id', userId)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        const spendingMap: Record<string, number> = {};
        if (txData) {
            txData.forEach((t: any) => {
                const amount = Number(t.amount);
                // We assume category type from the category list we just fetched
                const cat = catData?.find(c => c.id === t.category_id);
                if (cat) {
                    if (!spendingMap[cat.id]) spendingMap[cat.id] = 0;
                    spendingMap[cat.id] += amount;
                }
            });
        }
        setActualSpending(spendingMap);

        setLoading(false);
    };

    const handleSaveAll = async () => {
        setSaving(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const promises = Object.entries(budgets).map(async ([categoryId, amount]) => {
            // Only save if it has changed, or if it's new (amount > 0 and wasn't in original)
            // But simplifying: upsert everything that has a value.

            // Logic:
            // 1. Check if budget row exists.
            // 2. Update or Insert.

            // To be efficient, we can probably use `upsert` if we had a unique constraint on (user_id, category_id, year, month).
            // Let's assume we do or check manually like before for safety.

            if (amount === originalBudgets[categoryId]) return; // Skip unchanged

            try {
                const { data: existing } = await supabase
                    .from('budgets')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('category_id', categoryId)
                    .eq('year', year)
                    .eq('month', month)
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('budgets')
                        .update({ amount })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('budgets')
                        .insert({
                            user_id: userId,
                            category_id: categoryId,
                            amount,
                            year,
                            month,
                            period: 'monthly'
                        });
                }
            } catch (e) {
                console.error("Error saving budget item", e);
            }
        });

        await Promise.all(promises);

        // Refresh original state
        setOriginalBudgets({ ...budgets });
        setModified(false);
        setSaving(false);
        alert("¡Presupuesto guardado correctamente!");
    };

    const handleExport = () => {
        const dataToExport = categories.map(c => ({
            Categoría: c.name,
            Tipo: c.type === 'income' ? 'Ingreso' : 'Gasto',
            Presupuesto: budgets[c.id] || 0,
            Real: actualSpending[c.id] || 0,
            Diferencia: (budgets[c.id] || 0) - (actualSpending[c.id] || 0)
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Presupuesto");
        XLSX.writeFile(wb, `Sikai_Presupuesto_${currentMonthStr.slice(0, 7)}.xlsx`);
    };

    if (!isOpen) return null;

    const isHistoryMode = currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={modified ? () => { if (confirm("Salir sin guardar?")) onClose() } : onClose} />
            <div className="glass-card w-full max-w-2xl p-0 relative animate-in fade-in zoom-in duration-300 border-glow h-[90vh] flex flex-col overflow-hidden rounded-2xl">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-black/20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
                            <Target className="text-pink-500" />
                            Gestión de Presupuestos
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handleExport} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-muted-foreground hover:text-white transition" title="Exportar">
                                <Download size={20} />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-muted-foreground hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Month Navigator */}
                    <div className={`flex items-center justify-between rounded-xl p-2 border ${isHistoryMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/5'}`}>
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full text-white"><ChevronLeft /></button>
                        <div className="flex flex-col items-center">
                            <span className="text-lg font-mono font-bold text-white capitalize flex items-center gap-2">
                                {isHistoryMode && <History size={16} className="text-amber-500" />}
                                {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            {isHistoryMode && <span className="text-[10px] text-amber-500 uppercase tracking-widest font-bold">Modo Historial</span>}
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full text-white"><ChevronRight /></button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar space-y-8">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <p className="text-muted-foreground">No tienes categorías creadas.</p>
                            <button
                                onClick={onOpenCategories}
                                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-bold shadow-neon transition-all"
                            >
                                Crear Categorías
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Income Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-primary-cyan uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-[#1a1a1a] z-10 py-2">
                                    <span className="w-2 h-2 rounded-full bg-primary-cyan"></span> Ingresos Esperados
                                </h3>
                                {categories.filter(c => c.type === 'income').map(cat => {
                                    const budget = budgets[cat.id] || 0;
                                    const actual = actualSpending[cat.id] || 0;
                                    const percent = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
                                    const isModified = budget !== (originalBudgets[cat.id] || 0);

                                    return (
                                        <div key={cat.id} className={`bg-white/5 p-4 rounded-xl border transition-all ${isModified ? 'border-primary-cyan/50 bg-primary-cyan/5' : 'border-white/5 hover:border-primary-cyan/30'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-white">{cat.name}</span>
                                                <div className="text-right flex items-center gap-2 justify-end">
                                                    <span className="text-xs text-muted-foreground mr-2">Recibido: ${actual.toLocaleString()}</span>
                                                    <div className="flex items-center bg-black/40 rounded border border-white/10 focus-within:border-primary-cyan transition-colors">
                                                        <span className="pl-2 text-white/50 text-sm">$</span>
                                                        <input
                                                            type="number"
                                                            value={budgets[cat.id] || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setBudgets(prev => ({ ...prev, [cat.id]: isNaN(val) ? 0 : val }));
                                                            }}
                                                            placeholder="0"
                                                            className="w-24 bg-transparent border-none px-2 py-1 text-right font-mono text-sm text-primary-cyan outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary-cyan transition-all duration-500" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Expense Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-pink-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-[#1a1a1a] z-10 py-2">
                                    <span className="w-2 h-2 rounded-full bg-pink-500"></span> Presupuestos de Gastos
                                </h3>
                                {categories.filter(c => c.type === 'expense').map(cat => {
                                    const budget = budgets[cat.id] || 0;
                                    const actual = actualSpending[cat.id] || 0;
                                    let percent = 0;
                                    if (budget > 0) percent = Math.min((actual / budget) * 100, 100);
                                    else if (actual > 0) percent = 100;

                                    const isOverLimit = (budget > 0 && actual > budget) || (budget === 0 && actual > 0);
                                    const isModified = budget !== (originalBudgets[cat.id] || 0);

                                    return (
                                        <div key={cat.id} className={`bg-white/5 p-4 rounded-xl border transition-all ${isModified ? 'border-pink-500/50 bg-pink-500/5' : 'border-white/5 hover:border-pink-500/30'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-white">{cat.name}</span>
                                                <div className="text-right flex items-center gap-2 justify-end">
                                                    <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                                        Gastado: ${actual.toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center bg-black/40 rounded border border-white/10 focus-within:border-pink-500 transition-colors">
                                                        <span className="pl-2 text-white/50 text-sm">$</span>
                                                        <input
                                                            type="number"
                                                            value={budgets[cat.id] || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setBudgets(prev => ({ ...prev, [cat.id]: isNaN(val) ? 0 : val }));
                                                            }}
                                                            placeholder="0"
                                                            className={`w-24 bg-transparent border-none px-2 py-1 text-right font-mono text-sm text-pink-500 outline-none`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden relative">
                                                <div
                                                    className={`h-full transition-all duration-500 ${isOverLimit ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-pink-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                            {budget === 0 && actual > 0 && (
                                                <p className="text-[10px] text-red-400 mt-1 text-right">Gasto sin presupuesto asignado.</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {modified ?
                            <span className="text-primary-cyan flex items-center gap-2 animate-pulse"><AlertCircle size={14} /> Cambios sin guardar</span>
                            : 'Todos los cambios guardados'}
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={!modified || saving}
                        className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${!modified
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-primary-cyan text-black hover:scale-105 hover:shadow-cyan-500/20'
                            }`}
                    >
                        {saving ? "Guardando..." : "Guardar Todo"}
                        {!saving && <Save size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
