"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
            setLoading(false);
        } else {
            router.push("/");
            router.refresh();
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: email.split("@")[0], // Default name
                    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
                }
            }
        });

        if (error) {
            alert(error.message);
        } else {
            alert("¡Registro exitoso! Revisa tu email (si la confirmación está activa) o inicia sesión.");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#26d8c4]/10 rounded-full blur-[100px]" />

            <div className="bg-card w-full max-w-sm border border-border rounded-xl p-8 shadow-2xl backdrop-blur-sm z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-primary/10 rounded-full mb-4">
                        <Wallet className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-headline font-bold text-foreground">Bienvenido a Sikai</h1>
                    <p className="text-muted-foreground text-sm">Tu asistente financiero inteligente</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-muted/50 border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors mt-2"
                    >
                        {loading ? "Cargando..." : "Iniciar Sesión"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">¿No tienes cuenta?</p>
                    <button
                        onClick={handleSignUp}
                        disabled={loading}
                        className="text-primary hover:underline text-sm font-medium"
                    >
                        Regístrate Ahora
                    </button>
                </div>
            </div>
        </div>
    );
}
