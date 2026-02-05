"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import TransactionForm from "@/components/TransactionForm";

export default function AddTransactionButton({ userId }: { userId: string }) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsDrawerOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-40"
            >
                <Plus size={32} />
            </button>

            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md h-[80vh] bg-background/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 slide-in-from-bottom-5">
                        <TransactionForm
                            onClose={() => setIsDrawerOpen(false)}
                            onSuccess={() => setIsDrawerOpen(false)}
                            userId={userId}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
