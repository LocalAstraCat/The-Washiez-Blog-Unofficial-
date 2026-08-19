import { supabase } from "@/lib/supabase";

export const startLogin = async () => {
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo },
  });
  if (error) throw error;
};
