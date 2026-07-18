import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Bet, NewBetInput, UpdateBetInput } from "./types";

function getSupabase(): SupabaseClient {
  const supabase = createClient();
  if (!supabase) {
    throw new Error("Configuration Supabase manquante.");
  }
  return supabase;
}

export async function ensureAnonymousUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (sessionData.session?.user) {
    return { supabase, user: sessionData.session.user };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      "Connexion anonyme Supabase impossible. Active Anonymous Sign-Ins dans Supabase > Authentication > Providers > Anonymous."
    );
  }
  if (!data.user) throw new Error("Utilisateur Supabase introuvable.");
  return { supabase, user: data.user };
}

export async function listBets(): Promise<Bet[]> {
  const { supabase } = await ensureAnonymousUser();
  const { data, error } = await supabase
    .from("bets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Bet[];
}

export async function createBet(input: NewBetInput): Promise<Bet> {
  const { supabase, user } = await ensureAnonymousUser();
  const { data, error } = await supabase
    .from("bets")
    .insert({
      ...input,
      user_id: user.id,
      status: "pending",
      profit_loss: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Bet;
}

export async function updateBet(id: string, input: UpdateBetInput): Promise<Bet> {
  const { supabase, user } = await ensureAnonymousUser();
  const { data, error } = await supabase
    .from("bets")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Bet;
}
