"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, Target, Layers, Calendar, Sun, Moon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import CategoryManager from "./CategoryManager";
import BudgetManager from "./BudgetManager";
import TransactionHistory from "./TransactionHistory";
import { SplashScreen } from "./SplashScreen";
import { useTheme } from "@/contexts/ThemeContext";

export default function Dashboard({ userId }: { userId: string }) {
    const [balance, setBalance] = useState(0);
    const [income, setIncome] = useState(0);
    const [expense, setExpense] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('month');

    // Modal States
    const [showCategories, setShowCategories] = useState(false);
    const [showBudget, setShowBudget] = useState(false);
    const [userInitials, setUserInitials] = useState("U");

    // Chart Data
    const [pieData, setPieData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);

    const supabase = createClient();
    const { theme, toggleTheme } = useTheme();

    // Function to refresh all data - pass this to children if they modify data
    const refreshData = async () => {
        setLoading(true);

        // 1. Fetch Transactions
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId);

        // 2. Fetch Categories
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type')
            .eq('user_id', userId);

        if (transactions && categories) {
            let totalInc = 0;
            let totalExp = 0;
            const categoryMap: Record<string, number> = {};
            const timeMap: Record<string, { inc: number, exp: number }> = {};

            transactions.forEach((t: any) => {
                const val = Number(t.amount);

                // Manual Join
                const category = categories.find((c: any) => c.id === t.category_id);
                const type = category?.type || 'expense';
                const catName = category?.name || 'Otro';

                if (type === 'income') {
                    totalInc += val;
                } else {
                    totalExp += val;
                    // For Pie Chart (Gastos por Categoría)
                    categoryMap[catName] = (categoryMap[catName] || 0) + val;
                }

                // For Bar Chart (Time based)
                const date = new Date(t.date);
                const key = timeFilter === 'month'
                    ? `Sem ${Math.ceil(date.getDate() / 7)}` // Weekly grouping
                    : date.toLocaleString('default', { month: 'short' }); // Monthly grouping

                if (!timeMap[key]) timeMap[key] = { inc: 0, exp: 0 };
                if (type === 'income') timeMap[key].inc += val;
                else timeMap[key].exp += val;
            });

            setIncome(totalInc);
            setExpense(totalExp);
            setBalance(totalInc - totalExp);

            // Transform Maps to Arrays for Charts
            const pie = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));
            setPieData(pie);

            const bar = Object.keys(timeMap).map(k => ({ name: k, ...timeMap[k] }));
            setBarData(bar);
        }
        setLoading(false);
    };

    // Fetch user initials
    useEffect(() => {
        const fetchUserInitials = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Try to get name from user_metadata, fallback to email
                const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "U";
                const parts = name.split(/[\s@.]+/).filter(Boolean);
                if (parts.length >= 2) {
                    setUserInitials((parts[0][0] + parts[1][0]).toUpperCase());
                } else if (parts.length === 1) {
                    setUserInitials(parts[0].substring(0, 2).toUpperCase());
                }
            }
        };
        fetchUserInitials();
    }, []);

    useEffect(() => {
        refreshData();

        // Realtime subscription for Dashboard Numbers
        const channel = supabase
            .channel('dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                refreshData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId, timeFilter]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    if (loading) return <SplashScreen />;

    return (
        <div className="min-h-screen bg-background pb-24 md:pb-10">

            {/* Header / Nav */}
            <nav className="border-b border-[var(--glass-border)] sticky top-0 z-50 backdrop-blur-md bg-[var(--glass-bg)]">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="text-primary h-8 w-8" />
                        <h1 className="text-xl md:text-2xl font-bold font-headline tracking-tight text-foreground">
                            SIKAI <span className="text-primary">FINANCE</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-foreground hover:bg-white/10 hover:scale-105 transition-all"
                            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* User Profile / Menu */}
                        <div className="relative group">
                            <button className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20">
                                {userInitials}
                            </button>

                            {/* Dropdown */}
                            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-1 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 transform origin-top-right z-50 backdrop-blur-xl">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="p-4 space-y-8 pb-32 max-w-7xl mx-auto">

                {/* Time Filter Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="bg-muted/30 p-1 rounded-full border border-glass-border backdrop-blur-md flex">
                        <button
                            onClick={() => setTimeFilter('month')}
                            className={clsx("px-6 py-2 rounded-full text-sm font-medium transition-all duration-300", timeFilter === 'month' ? "bg-primary text-white shadow-neon" : "text-muted-foreground hover:text-white")}
                        >
                            Mensual
                        </button>
                        <button
                            onClick={() => setTimeFilter('year')}
                            className={clsx("px-6 py-2 rounded-full text-sm font-medium transition-all duration-300", timeFilter === 'year' ? "bg-primary text-white shadow-neon" : "text-muted-foreground hover:text-white")}
                        >
                            Anual
                        </button>
                    </div>
                </div>

                {/* Hero Stats */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Balance */}
                    <div className="glass-card p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-muted-foreground font-medium flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 rounded-full bg-primary-cyan animate-pulse"></span>
                                Saldo Disponible
                            </h3>
                            <p className="text-5xl font-bold font-mono text-foreground tracking-tighter">
                                {loading ? "..." : `$ ${balance.toLocaleString()}`}
                            </p>
                        </div>
                    </div>

                    {/* Income */}
                    <div className="glass-card p-6 flex flex-col justify-center">
                        <p className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                            <ArrowUpRight size={16} className="text-primary-cyan" /> Ingresos
                        </p>
                        <p className="text-3xl font-bold font-mono text-primary-cyan">
                            $ {income.toLocaleString()}
                        </p>
                        <div className="w-full bg-muted/50 h-1 mt-4 rounded-full overflow-hidden">
                            <div
                                className="bg-primary-cyan h-full shadow-[0_0_10px_#26d8c4] transition-all duration-1000"
                                style={{ width: `${Math.min((income / (income + expense || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Expense */}
                    <div className="glass-card p-6 flex flex-col justify-center">
                        <p className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                            <ArrowDownRight size={16} className="text-pink-500" /> Gastos
                        </p>
                        <p className="text-3xl font-bold font-mono text-pink-500">
                            $ {expense.toLocaleString()}
                        </p>
                        <div className="w-full bg-muted/50 h-1 mt-4 rounded-full overflow-hidden">
                            <div
                                className="bg-pink-500 h-full shadow-[0_0_10px_#ec4899] transition-all duration-1000"
                                style={{ width: `${Math.min((expense / (income + expense || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </section>

                {/* Analytics Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Pie Chart */}
                    <div className="glass-card p-6 lg:col-span-1 flex flex-col items-center justify-center relative min-h-[300px]">
                        <h3 className="text-lg font-headline font-semibold mb-2 w-full text-left flex items-center gap-2">
                            <Target size={18} className="text-primary" /> Gastos por Categoría
                        </h3>
                        <div className="h-64 w-full relative">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#ec4899', '#26d8c4', '#1a88ff', '#facc15'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #333' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos aún</div>
                            )}
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div className="glass-card p-6 lg:col-span-2 min-h-[300px]">
                        <h3 className="text-lg font-headline font-semibold mb-6 flex items-center gap-2">
                            <Calendar size={18} className="text-primary" /> Flujo Financiero
                        </h3>
                        <div className="h-64 cursor-crosshair">
                            {barData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#333' }}
                                        />
                                        <Bar dataKey="inc" fill="#26d8c4" radius={[4, 4, 0, 0]} maxBarSize={40} name="Ingresos" />
                                        <Bar dataKey="exp" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} name="Gastos" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Registra transacciones para ver el gráfico</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Transaction History Section (New) */}
                <section>
                    <TransactionHistory userId={userId} />
                </section>

                {/* Feature Access Grid */}
                <section className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowBudget(true)} className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 group">
                        <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:shadow-neon transition-all">
                            <Target size={24} />
                        </div>
                        <span className="text-sm font-medium">Nuevo Presupuesto</span>
                    </button>
                    <button onClick={() => setShowCategories(true)} className="glass-card p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 group">
                        <div className="p-3 rounded-full bg-primary/10 text-primary-cyan group-hover:shadow-neon-cyan transition-all">
                            <Layers size={24} />
                        </div>
                        <span className="text-sm font-medium">Categorías</span>
                    </button>
                </section>

                {/* Modals */}
                <CategoryManager isOpen={showCategories} onClose={() => setShowCategories(false)} userId={userId} />
                <BudgetManager
                    isOpen={showBudget}
                    onClose={() => setShowBudget(false)}
                    userId={userId}
                    onOpenCategories={() => { setShowBudget(false); setShowCategories(true); }}
                />

            </div>
        </div>
    );
}
