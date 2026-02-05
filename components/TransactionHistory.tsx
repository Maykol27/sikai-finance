"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ArrowDownLeft, ArrowUpRight, Calendar, Search, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';

type Transaction = {
    id: string;
    amount: number;
    note: string;
    date: string;
    categories: {
        name: string;
        type: string;
    };
};

export default function TransactionHistory({ userId }: { userId: string }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    const fetchTransactions = async () => {
        setLoading(true);

        const { data: txData, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(50);

        const { data: catData } = await supabase
            .from('categories')
            .select('id, name, type')
            .eq('user_id', userId);

        if (txData && catData) {
            const joinedData = txData.map((t: any) => ({
                ...t,
                categories: catData.find((c: any) => c.id === t.category_id) || { name: 'Sin categoría', type: 'expense' }
            }));
            // @ts-ignore
            setTransactions(joinedData);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar transacción?")) {
            await supabase.from('transactions').delete().eq('id', id);
            fetchTransactions();
        }
    };

    const handleExport = () => {
        const dataToExport = transactions.map(t => ({
            Fecha: t.date,
            Tipo: t.categories?.type === 'income' ? 'Ingreso' : 'Gasto',
            Monto: t.amount,
            Categoría: t.categories?.name,
            Nota: t.note
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
        XLSX.writeFile(wb, `Sikai_Transacciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    useEffect(() => {
        fetchTransactions();

        // Subscribe to changes
        const channel = supabase
            .channel('transactions-history')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchTransactions();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    return (
        <div className="glass-card p-6 w-full animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-headline font-bold text-foreground flex items-center gap-2">
                    <Calendar className="text-primary-cyan" /> Historial Reciente
                </h3>
                <button
                    onClick={handleExport}
                    className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full text-muted-foreground hover:text-foreground transition group"
                    title="Exportar a Excel"
                >
                    <Download size={20} className="group-hover:text-primary-cyan transition-colors" />
                </button>
            </div>

            <div className="space-y-3">
                {loading && <p className="text-center text-muted-foreground">Cargando movimientos...</p>}

                {!loading && transactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay transacciones registradas.</p>
                )}

                {transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-foreground/5 border border-[var(--glass-border)] hover:border-primary/30 transition-all group">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${t.categories?.type === 'income' ? 'bg-primary-cyan/20 text-primary-cyan' : 'bg-pink-500/20 text-pink-500'}`}>
                                {t.categories?.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                            </div>
                            <div>
                                <p className="text-foreground font-medium">{t.note || 'Sin nota'}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="bg-primary/10 px-2 py-0.5 rounded text-primary">{t.categories?.name}</span>
                                    <span>•</span>
                                    <span>{format(new Date(t.date), "d MMM yyyy", { locale: es })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`font-mono font-bold text-lg ${t.categories?.type === 'income' ? 'text-primary-cyan' : 'text-pink-500'}`}>
                                {t.categories?.type === 'income' ? '+' : '-'} ${Math.abs(t.amount).toLocaleString()}
                            </span>
                            <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
