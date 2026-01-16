import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// ✅ CORRETTO PER VITE
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const DEFAULT_STATE: AppState = {
  players: [],
  sessions: [],
  currentTab: 'ranking'
};

export const isDBConfigured = (): boolean => {
  return !!supabase;
};

export const getSupabaseConfig = () => ({
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY
});

export const loadStateFromDB = async (): Promise<AppState> => {
  if (!supabase) {
    throw new Error("Client Supabase non inizializzato. Verifica le variabili d'ambiente.");
  }

  const { data, error } = await supabase
    .from('app_data')
    .select('state')
    .eq('id', 1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Record non trovato: normale al primo avvio
      try {
        await saveStateToDB(DEFAULT_STATE);
      } catch (e) {
        console.warn("Impossibile creare lo stato iniziale:", e);
      }
      return DEFAULT_STATE;
    }
    // Rilanciamo l'errore per permettere all'app di mostrarlo
    throw error;
  }

  return (data.state as AppState) || DEFAULT_STATE;
};

export const saveStateToDB = async (state: AppState) => {
  if (!supabase) return;

  const { error } = await supabase
    .from('app_data')
    .upsert({
      id: 1,
      state,
      updated_at: new Date().toISOString()
    });
    
  if (error) throw error;
};