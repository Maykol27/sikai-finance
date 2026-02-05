"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Sector } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, Target, Layers, Calendar, Sun, Moon, ArrowLeft, PiggyBank } from "lucide-react";
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
    const [savings, setSavings] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('month');

    // Modal States
    const [showCategories, setShowCategories] = useState(false);
    const [showBudget, setShowBudget] = useState(false);
    const [userInitials, setUserInitials] = useState("U");

    // Chart Data
    const [pieData, setPieData] = useState<any[]>([]);
    const [subPieData, setSubPieData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [allCategories, setAllCategories] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);

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

        // 2. Fetch Categories with parent_id
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type, parent_id')
            .eq('user_id', userId);

        if (transactions && categories) {
            let totalInc = 0;
            let totalExp = 0;
            let totalSav = 0;
            const categoryMap: Record<string, number> = {};
            const timeMap: Record<string, { inc: number, exp: number, sav: number }> = {};

            transactions.forEach((t: any) => {
                const val = Number(t.amount);

                // Manual Join
                const category = categories.find((c: any) => c.id === t.category_id);
                const type = category?.type || 'expense';
                const catName = category?.name || 'Otro';

                if (type === 'income') {
                    totalInc += val;
                } else if (type === 'savings') {
                    totalSav += val;
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

                if (!timeMap[key]) timeMap[key] = { inc: 0, exp: 0, sav: 0 };
                if (type === 'income') timeMap[key].inc += val;
                else if (type === 'savings') timeMap[key].sav += val;
                else timeMap[key].exp += val;
            });

            setIncome(totalInc);
            setExpense(totalExp);
            setSavings(totalSav);
            setBalance(totalInc - totalExp - totalSav);
            setAllCategories(categories);
            setAllTransactions(transactions);

            // Transform Maps to Arrays for Charts - only parent categories
            const parentCategoryMap: Record<string, number> = {};
            transactions.forEach((t: any) => {
                const category = categories.find((c: any) => c.id === t.category_id);
                if (!category || category.type === 'income') return;

                // Find the parent category
                let parentCat = category;
                if (category.parent_id) {
                    const parent = categories.find((c: any) => c.id === category.parent_id);
                    if (parent) parentCat = parent;
                }

                parentCategoryMap[parentCat.name] = (parentCategoryMap[parentCat.name] || 0) + Number(t.amount);
            });

            const pie = Object.keys(parentCategoryMap).map(k => ({ name: k, value: parentCategoryMap[k] }));
            setPieData(pie);

            const bar = Object.keys(timeMap).map(k => ({ name: k, ...timeMap[k] }));
            setBarData(bar);

            // Reset drill-down
            setSelectedCategory(null);
            setSubPieData([]);
        }
        setLoading(false);
    };

    // Handle click on category to show subcategories
    const handleCategoryClick = (categoryName: string) => {
        // Find the parent category by name
        const parentCat = allCategories.find((c: any) => c.name === categoryName && !c.parent_id);
        if (!parentCat) return;

        // Find all subcategories of this parent
        const subcategories = allCategories.filter((c: any) => c.parent_id === parentCat.id);

        if (subcategories.length === 0) {
            // No subcategories, don't drill down
            return;
        }

        // Calculate amounts per subcategory
        const subCategoryMap: Record<string, number> = {};
        allTransactions.forEach((t: any) => {
            const category = allCategories.find((c: any) => c.id === t.category_id);
            if (!category) return;

            // Check if this transaction belongs to a subcategory of the selected parent
            if (category.parent_id === parentCat.id) {
                subCategoryMap[category.name] = (subCategoryMap[category.name] || 0) + Number(t.amount);
            }
        });

        const subData = Object.keys(subCategoryMap).map(k => ({ name: k, value: subCategoryMap[k] }));

        if (subData.length > 0) {
            setSelectedCategory(categoryName);
            setSubPieData(subData);
        }
    };

    // Go back to parent categories view
    const handleBackToCategories = () => {
        setSelectedCategory(null);
        setSubPieData([]);
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
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                    {/* Savings */}
                    <div className="glass-card p-6 flex flex-col justify-center">
                        <p className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                            <PiggyBank size={16} className="text-emerald-500" /> Ahorros
                        </p>
                        <p className="text-3xl font-bold font-mono text-emerald-500">
                            $ {savings.toLocaleString()}
                        </p>
                        <div className="w-full bg-muted/50 h-1 mt-4 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full shadow-[0_0_10px_#10b981] transition-all duration-1000"
                                style={{ width: `${Math.min((savings / (income || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </section>

                {/* Analytics Grid */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Pie Chart */}
                    <div className="glass-card p-6 lg:col-span-1 flex flex-col relative min-h-[300px]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-headline font-semibold flex items-center gap-2">
                                <Target size={18} className="text-primary" />
                                {selectedCategory ? (
                                    <span className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Subcategorías de</span>
                                        <span className="text-primary-cyan">{selectedCategory}</span>
                                    </span>
                                ) : (
                                    'Gastos por Categoría'
                                )}
                            </h3>
                            {selectedCategory && (
                                <button
                                    onClick={handleBackToCategories}
                                    className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1 text-xs"
                                >
                                    <ArrowLeft size={14} /> Volver
                                </button>
                            )}
                        </div>
                        <div className="h-48 w-full relative">
                            {(selectedCategory ? subPieData : pieData).length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={selectedCategory ? subPieData : pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                            onClick={(data) => !selectedCategory && handleCategoryClick(data.name)}
                                            style={{ cursor: selectedCategory ? 'default' : 'pointer' }}
                                        >
                                            {(selectedCategory ? subPieData : pieData).map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={selectedCategory
                                                        ? ['#a855f7', '#f97316', '#14b8a6', '#f43f5e', '#3b82f6'][index % 5]
                                                        : ['#ec4899', '#26d8c4', '#1a88ff', '#facc15'][index % 4]
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', borderRadius: '8px', border: '1px solid #333' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value) => [`$${Number(value).toLocaleString('es-CO')}`, '']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos aún</div>
                            )}
                        </div>
                        {/* Custom Legend for Pie Chart */}
                        {(selectedCategory ? subPieData : pieData).length > 0 && (
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-2 px-2">
                                {(selectedCategory ? subPieData : pieData).map((entry, index) => (
                                    <button
                                        key={entry.name}
                                        onClick={() => !selectedCategory && handleCategoryClick(entry.name)}
                                        className={`flex items-center gap-1.5 text-xs transition-all ${!selectedCategory ? 'hover:scale-105 cursor-pointer' : ''}`}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{
                                                backgroundColor: selectedCategory
                                                    ? ['#a855f7', '#f97316', '#14b8a6', '#f43f5e', '#3b82f6'][index % 5]
                                                    : ['#ec4899', '#26d8c4', '#1a88ff', '#facc15'][index % 4]
                                            }}
                                        />
                                        <span className="text-muted-foreground truncate max-w-[70px]">{entry.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!selectedCategory && pieData.length > 0 && (
                            <p className="text-[10px] text-center text-muted-foreground/50 mt-2">Toca una categoría para ver subcategorías</p>
                        )}
                    </div>

                    {/* Bar Chart */}
                    <div className="glass-card p-6 lg:col-span-2 min-h-[300px]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                            <h3 className="text-lg font-headline font-semibold flex items-center gap-2">
                                <Calendar size={18} className="text-primary" /> Flujo Financiero
                            </h3>
                            {/* Legend for Bar Chart */}
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-[#26d8c4]"></span>
                                    <span className="text-muted-foreground">Ingresos</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm bg-[#ec4899]"></span>
                                    <span className="text-muted-foreground">Gastos</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-56 cursor-crosshair">
                            {barData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                            formatter={(value) => value !== undefined ? [`$${Number(value).toLocaleString('es-CO')}`, ''] : ['', '']}
                                            labelFormatter={(label) => label}
                                        />
                                        <Bar dataKey="inc" fill="#26d8c4" radius={[4, 4, 0, 0]} maxBarSize={35} name="Ingresos" />
                                        <Bar dataKey="exp" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={35} name="Gastos" />
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
