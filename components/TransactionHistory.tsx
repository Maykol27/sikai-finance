"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/contexts/ToastContext";
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
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const supabase = createClient();
    const { showToast } = useToast();

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
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (!error) {
                showToast("Transacción eliminada", 'success');
                fetchTransactions();
            } else {
                showToast("Error al eliminar", 'error');
            }
        }
    };

    const handleExport = () => {
        const dataToExport = transactions.map(t => ({
            Fecha: t.date,
            Tipo: t.categories?.type === 'income' ? 'Ingreso' : t.categories?.type === 'savings' ? 'Ahorro' : 'Gasto',
            Monto: t.amount,
            Categoría: t.categories?.name,
            Nota: t.note
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
        XLSX.writeFile(wb, `Sikai_Transacciones_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        showToast("¡Exportado a Excel!", 'success');
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
        <div className="glass-card p-4 sm:p-6 w-full animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-headline font-bold text-foreground flex items-center gap-2">
                    <Calendar className="text-primary-cyan" size={20} /> Historial Reciente
                </h3>
                <button
                    onClick={handleExport}
                    className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full text-muted-foreground hover:text-foreground transition group self-end sm:self-auto"
                    title="Exportar a Excel"
                >
                    <Download size={18} className="group-hover:text-primary-cyan transition-colors" />
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {/* Type Filter Buttons */}
                <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-glass-border">
                    <button
                        onClick={() => setTypeFilter('all')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${typeFilter === 'all' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setTypeFilter('income')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${typeFilter === 'income' ? 'bg-primary-cyan text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <ArrowUpRight size={12} /> Ingresos
                    </button>
                    <button
                        onClick={() => setTypeFilter('expense')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${typeFilter === 'expense' ? 'bg-pink-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <ArrowDownLeft size={12} /> Gastos
                    </button>
                </div>

                {/* Search */}
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nota o categoría..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-muted/30 border border-glass-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition"
                    />
                </div>
            </div>

            {/* Filtered Transactions */}
            <div className="space-y-3">
                {loading && <p className="text-center text-muted-foreground">Cargando movimientos...</p>}

                {(() => {
                    const filtered = transactions.filter(t => {
                        const matchesType = typeFilter === 'all' || t.categories?.type === typeFilter;
                        const matchesSearch = searchQuery === '' ||
                            t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                        return matchesType && matchesSearch;
                    });

                    if (!loading && filtered.length === 0) {
                        return <p className="text-center text-muted-foreground py-8">No hay transacciones que coincidan.</p>;
                    }

                    return filtered.map((t) => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-foreground/5 border border-[var(--glass-border)] hover:border-primary/30 transition-all group gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className={`p-2.5 sm:p-3 rounded-full shrink-0 ${t.categories?.type === 'income' ? 'bg-primary-cyan/20 text-primary-cyan' : 'bg-pink-500/20 text-pink-500'}`}>
                                    {t.categories?.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-foreground font-medium truncate">{t.note || 'Sin nota'}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="bg-primary/10 px-2 py-0.5 rounded text-primary">{t.categories?.name}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="text-muted-foreground/70">{format(new Date(t.date), "d MMM yyyy", { locale: es })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-10 sm:pl-0">
                                <span className={`font-mono font-bold text-base sm:text-lg whitespace-nowrap ${t.categories?.type === 'income' ? 'text-primary-cyan' : 'text-pink-500'}`}>
                                    {t.categories?.type === 'income' ? '+' : '-'} ${Math.abs(t.amount).toLocaleString()}
                                </span>
                                <button onClick={() => handleDelete(t.id)} className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition p-1">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ));
                })()}
            </div>
        </div>
    );
}
