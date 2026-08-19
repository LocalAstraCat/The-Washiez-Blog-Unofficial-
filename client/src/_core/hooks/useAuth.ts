import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

type ChronicleUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "user" | "writer" | "admin";
};

export function useAuth() {
  const [user, setUser] = useState<ChronicleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) { setError(sessionError); setLoading(false); return; }
    if (!session?.user) { setUser(null); setLoading(false); return; }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("display_name,role").eq("id", session.user.id).maybeSingle();
    if (profileError) { setError(profileError); }
    setUser({ id: session.user.id, name: profile?.display_name ?? session.user.user_metadata.full_name ?? session.user.email ?? null, email: session.user.email ?? null, role: profile?.role ?? "user" });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void loadUser(); });
    return () => listener.subscription.unsubscribe();
  }, [loadUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) { setError(logoutError); }
    setUser(null); setLoading(false);
  }, []);

  return { user, loading, error, isAuthenticated: Boolean(user), refresh: loadUser, logout };
}
