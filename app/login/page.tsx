"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ArrowRight, UserPlus, LogIn } from "lucide-react";

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
                setIsRegistering(false); // Switch back to login for them to enter credentials or auto-login if session established
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
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">
            {/* Background decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-cyan/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />

            <div className="glass-card w-full max-w-sm border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md z-10 relative animation-delay-200 animate-in fade-in zoom-in duration-500">

                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-4 shadow-neon">
                        <Wallet className="w-8 h-8 text-primary-cyan" />
                    </div>
                    <h1 className="text-3xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        {isRegistering ? "Crear Cuenta" : "Bienvenido a SIKAI"}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        {isRegistering ? "Únete a la revolución financiera" : "Tu asistente financiero inteligente"}
                    </p>
                </div>

                {msg && (
                    <div className={`mb-4 p-3 rounded-lg text-xs font-bold text-center ${msg.type === 'error' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-primary-cyan focus:border-primary-cyan focus:outline-none transition-all placeholder:text-white/20"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:ring-1 focus:ring-primary-cyan focus:border-primary-cyan focus:outline-none transition-all placeholder:text-white/20"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full group bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-neon mt-4 flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="relative z-10 flex items-center gap-2">
                            {loading ? "Procesando..." : isRegistering ? (
                                <>Registrarse <UserPlus size={18} /></>
                            ) : (
                                <>Iniciar Sesión <ArrowRight size={18} /></>
                            )}
                        </span>
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                        {isRegistering ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}
                    </p>
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setMsg(null);
                        }}
                        className="text-primary-cyan hover:text-white hover:underline text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        {isRegistering ? "Inicia Sesión" : "Regístrate Ahora"}
                    </button>
                </div>
            </div>

            <p className="mt-8 text-xs text-muted-foreground opacity-50">
                &copy; 2026 SIKAI Finance. All rights reserved.
            </p>
        </div>
    );
}
