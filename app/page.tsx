"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import AddTransactionButton from "@/components/AddTransactionButton";
import { SplashScreen } from "@/components/SplashScreen";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
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

  // Combined Loading State: 
  // We show the main app ONLY when (loading is done AND splash is finished).
  // However, the SplashScreen component stays mounted until it animates out.

  if (loading) {
    // While checking auth, show splash (or blank if you prefer, but splash is better)
    // Actually, we can just render the SplashScreen on top.
    return <SplashScreen />;
  }

  // If redirected to login, return null
  if (!user) return <SplashScreen />;

  return (
    <main className="min-h-screen bg-background relative pb-20">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}
      <Dashboard userId={user.id} />
      <AddTransactionButton userId={user.id} />
    </main>
  );
}
