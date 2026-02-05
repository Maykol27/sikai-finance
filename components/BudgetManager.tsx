"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Target, Save, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import * as XLSX from 'xlsx';

type Budget = {
    id?: string;
    category_id: string;
    amount: number;
    month: string; // YYYY-MM-01
};

export default function BudgetManager({ userId, isOpen, onClose }: { userId: string, isOpen: boolean, onClose: () => void }) {
    const [categories, setCategories] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<Record<string, number>>({});
    const [actualSpending, setActualSpending] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Month Navigation
    const [currentDate, setCurrentDate] = useState(new Date());
    const currentMonthStr = currentDate.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01 format

    const supabase = createClient();

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen, currentMonthStr]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
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

    const handleSave = async (categoryId: string) => {
        const val = budgets[categoryId];
        // If val is strictly undefined or NaN (empty string parses to NaN), do nothing.
        // User must click the save button to trigger this.
        if (val === undefined || isNaN(val)) return;

        console.log(`Saving budget for ${categoryId}: ${val}`);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        try {
            // Check if budget exists for this month and category using integers year/month based on actual DB schema
            const { data: existing, error: fetchError } = await supabase
                .from('budgets')
                .select('id')
                .eq('user_id', userId)
                .eq('category_id', categoryId)
                .eq('year', year)
                .eq('month', month)
                .maybeSingle();

            if (fetchError) {
                console.error("Error checking budget:", fetchError);
                return;
            }

            if (existing) {
                // Update
                const { error: updateError } = await supabase
                    .from('budgets')
                    .update({ amount: val })
                    .eq('id', existing.id);

                if (updateError) console.error("Error updating budget:", updateError);
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('budgets')
                    .insert({
                        user_id: userId,
                        category_id: categoryId,
                        amount: val,
                        year: year,
                        month: month,
                        period: 'monthly'
                    });

                if (insertError) console.error("Error creating budget:", insertError);
            }
        } catch (e) {
            console.error("Exception saving budget:", e);
        }
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="glass-card w-full max-w-2xl p-8 relative animate-in fade-in zoom-in duration-300 border-glow h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-headline font-bold text-white flex items-center gap-2">
                        <Target className="text-pink-500" /> Presupuesto
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
                <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 mb-6 border border-white/5">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full text-white"><ChevronLeft /></button>
                    <span className="text-lg font-mono font-bold text-white capitalize">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full text-white"><ChevronRight /></button>
                </div>

                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-8 min-h-[300px]">
                    {loading ? (
                        <p className="text-center py-10">Cargando datos del mes...</p>
                    ) : categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <p className="text-muted-foreground">No tienes categorías creadas.</p>
                        </div>
                    ) : (
                        <>
                            {/* Income Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-primary-cyan uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary-cyan"></span> Ingresos Esperados
                                </h3>
                                {categories.filter(c => c.type === 'income').map(cat => {
                                    const budget = budgets[cat.id] || 0;
                                    const actual = actualSpending[cat.id] || 0;
                                    const percent = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;

                                    return (
                                        <div key={cat.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-primary-cyan/30 transition-all">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-white">{cat.name}</span>
                                                <div className="text-right flex items-center gap-2 justify-end">
                                                    <span className="text-xs text-muted-foreground mr-2">Recibido: ${actual.toLocaleString()}</span>
                                                    <div className="flex items-center bg-black/40 rounded border border-white/10 focus-within:border-primary-cyan">
                                                        <input
                                                            type="number"
                                                            value={budgets[cat.id] || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setBudgets(prev => ({ ...prev, [cat.id]: isNaN(val) ? 0 : val }));
                                                            }}
                                                            placeholder="Meta"
                                                            className="w-24 bg-transparent border-none px-2 py-1 text-right font-mono text-sm text-primary-cyan outline-none"
                                                        />
                                                        <button
                                                            onClick={() => handleSave(cat.id)}
                                                            className="p-1.5 hover:bg-primary-cyan/20 text-primary-cyan hover:text-white transition-colors border-l border-white/10"
                                                            title="Guardar"
                                                        >
                                                            <Save size={14} />
                                                        </button>
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
                                <h3 className="text-sm font-bold text-pink-500 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-pink-500"></span> Presupuestos de Gastos
                                </h3>
                                {categories.filter(c => c.type === 'expense').map(cat => {
                                    const budget = budgets[cat.id] || 0;
                                    const actual = actualSpending[cat.id] || 0;

                                    // Visual Logic:
                                    // - If Budget > 0: Normal percent calculation.
                                    // - If Budget = 0 & Actual > 0: Treat as 100% full (red).
                                    // - If Budget = 0 & Actual = 0: 0% empty.

                                    let percent = 0;
                                    if (budget > 0) {
                                        percent = Math.min((actual / budget) * 100, 100);
                                    } else if (actual > 0) {
                                        percent = 100;
                                    }

                                    const isOverLimit = (budget > 0 && actual > budget) || (budget === 0 && actual > 0);

                                    return (
                                        <div key={cat.id} className="bg-white/5 p-4 rounded-xl border border-white/5 hover:border-pink-500/30 transition-all">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-white">{cat.name}</span>
                                                <div className="text-right flex items-center gap-2 justify-end">
                                                    <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                                        Gastado: ${actual.toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center bg-black/40 rounded border border-white/10 focus-within:border-pink-500">
                                                        <input
                                                            type="number"
                                                            value={budgets[cat.id] || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setBudgets(prev => ({ ...prev, [cat.id]: isNaN(val) ? 0 : val }));
                                                            }}
                                                            placeholder="Límite"
                                                            className={`w-24 bg-transparent border-none px-2 py-1 text-right font-mono text-sm text-pink-500 outline-none`}
                                                        />
                                                        <button
                                                            onClick={() => handleSave(cat.id)}
                                                            className="p-1.5 hover:bg-pink-500/20 text-pink-500 hover:text-white transition-colors border-l border-white/10"
                                                            title="Guardar"
                                                        >
                                                            <Save size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
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
            </div>
        </div>
    );
}
