"use client";

import { useState } from "react";
import { Plus, X, ArrowLeftRight, Target, Layers } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";
import BudgetManager from "@/components/BudgetManager";
import CategoryManager from "@/components/CategoryManager";

export default function AddTransactionButton({ userId }: { userId: string }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTransactionOpen, setIsTransactionOpen] = useState(false);
    const [isBudgetOpen, setIsBudgetOpen] = useState(false);
    const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

    const menuItems = [
        {
            label: "Nueva Transacción",
            icon: ArrowLeftRight,
            color: "from-primary to-primary/80",
            onClick: () => {
                setIsMenuOpen(false);
                setIsTransactionOpen(true);
            }
        },
        {
            label: "Presupuesto",
            icon: Target,
            color: "from-amber-500 to-orange-500",
            onClick: () => {
                setIsMenuOpen(false);
                setIsBudgetOpen(true);
            }
        },
        {
            label: "Categorías",
            icon: Layers,
            color: "from-primary-cyan to-teal-500",
            onClick: () => {
                setIsMenuOpen(false);
                setIsCategoriesOpen(true);
            }
        }
    ];

    return (
        <>
            {/* Backdrop */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-all duration-300 active:scale-95 z-50 ${isMenuOpen ? 'rotate-45' : ''}`}
            >
                {isMenuOpen ? <X size={28} /> : <Plus size={32} />}
            </button>

            {/* Speed Dial Menu */}
            <div className={`fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3 transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {menuItems.map((item, index) => (
                    <div
                        key={item.label}
                        className="flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Label */}
                        <span className="bg-foreground/90 text-background px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap">
                            {item.label}
                        </span>
                        {/* Icon Button */}
                        <button
                            onClick={item.onClick}
                            className={`h-12 w-12 rounded-full bg-gradient-to-br ${item.color} text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95`}
                        >
                            <item.icon size={22} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Transaction Form Modal */}
            {isTransactionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md h-[80vh] bg-background/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 slide-in-from-bottom-5">
                        <TransactionForm
                            onClose={() => setIsTransactionOpen(false)}
                            onSuccess={() => setIsTransactionOpen(false)}
                            userId={userId}
                        />
                    </div>
                </div>
            )}

            {/* Budget Manager Modal */}
            <BudgetManager
                isOpen={isBudgetOpen}
                onClose={() => setIsBudgetOpen(false)}
                userId={userId}
                onOpenCategories={() => {
                    setIsBudgetOpen(false);
                    setIsCategoriesOpen(true);
                }}
            />

            {/* Category Manager Modal */}
            <CategoryManager
                isOpen={isCategoriesOpen}
                onClose={() => setIsCategoriesOpen(false)}
                userId={userId}
            />
        </>
    );
}
