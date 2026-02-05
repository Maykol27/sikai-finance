import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import AddTransactionButton from "@/components/AddTransactionButton";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-background relative pb-20">


      <Dashboard userId={user.id} />

      <AddTransactionButton userId={user.id} />
    </main>
  );
}
