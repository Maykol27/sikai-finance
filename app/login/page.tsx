"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ArrowRight, UserPlus } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    // Notification state
    const [msg, setMsg] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);

        try {
            if (isRegistering) {
                // REGISTRATION LOGIC
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split("@")[0],
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
                        }
                    }
                });

                if (error) throw error;

                setMsg({ text: "¡Cuenta creada! Revisa tu email o inicia sesión.", type: 'success' });
                setIsRegistering(false);
            } else {
                // LOGIN LOGIC
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                router.push("/");
                router.refresh();
            }
        } catch (error: any) {
            setMsg({ text: error.message || "Ocurrió un error", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden text-white font-sans">
            {/* Background decoration - matching the dark/blue vibe */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px]" />

            {/* Main Card */}
            <div className="w-full max-w-[400px] bg-[#0A0A0A] border border-gray-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-in zoom-in-50 duration-500">
                {/* Top Border Glow (Gradient Line) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70"></div>

                {/* Logo Section */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-black border border-gray-800 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-pulse"></div>
                        <img src="/favicon.ico" alt="Sikai Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                    </div>
                </div>

                {/* Headers */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        {isRegistering ? "Crear Cuenta SIKAI" : "Bienvenido a SIKAI"}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {isRegistering ? "Comienza a gestionar tus finanzas hoy" : "Inicia sesión para gestionar tus finanzas"}
                    </p>
                </div>

                {msg && (
                    <div className={`mb-6 p-3 rounded-lg text-xs font-bold text-center ${msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400 ml-1">Email Corporativo / Personal</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-600"
                            placeholder="nombre@empresa.com"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-400 ml-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-600"
                            placeholder="••••••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-900/20 mt-2 text-sm flex items-center justify-center gap-2"
                    >
                        {loading ? "Procesando..." : isRegistering ? "Registrarse Ahora" : "Iniciar Sesión"}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setMsg(null);
                        }}
                        className="text-gray-500 hover:text-white text-sm transition-colors"
                    >
                        {isRegistering ? (
                            <>¿Ya tienes cuenta? <span className="text-gray-300 hover:underline">Inicia Sesión</span></>
                        ) : (
                            <>¿No tienes cuenta? <span className="text-gray-300 hover:underline">Regístrate</span></>
                        )}
                    </button>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-gray-600 uppercase tracking-widest">
                Sikai Finance System
            </div>
        </div>
    );
}
