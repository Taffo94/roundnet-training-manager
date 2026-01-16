
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

// Variabili d'ambiente (devono essere configurate nel pannello di controllo del deploy)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

// Inizializza il client solo se le variabili sono presenti
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

export const loadStateFromDB = async (): Promise<AppState> => {
  if (!supabase) {
    console.warn("Supabase non configurato. Utilizzo stato di default.");
    return DEFAULT_STATE;
  }

  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('state')
      .eq('id', 1)
      .single();

    if (error) {
      // Se la riga non esiste, creiamola con lo stato di default
      if (error.code === 'PGRST116') {
        await saveStateToDB(DEFAULT_STATE);
        return DEFAULT_STATE;
      }
      console.error("Errore caricamento DB:", error);
      return DEFAULT_STATE;
    }

    return (data.state as AppState) || DEFAULT_STATE;
  } catch (err) {
    console.error("Eccezione durante il caricamento:", err);
    return DEFAULT_STATE;
  }
};

export const saveStateToDB = async (state: AppState) => {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ 
        id: 1, 
        state, 
        updated_at: new Date().toISOString() 
      });

    if (error) {
      console.error("Errore salvataggio DB:", error);
    }
  } catch (err) {
    console.error("Eccezione durante il salvataggio:", err);
  }
};
