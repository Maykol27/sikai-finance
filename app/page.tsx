"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import AddTransactionButton from "@/components/AddTransactionButton";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Cargando Sikai Finance...</div>;
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background relative pb-20">
      <Dashboard userId={user.id} />
      <AddTransactionButton userId={user.id} />
    </main>
  );
}
