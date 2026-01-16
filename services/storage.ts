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

export const loadStateFromDB = async (): Promise<AppState> => {
  if (!supabase) {
    return DEFAULT_STATE;
  }

  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('state')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        await saveStateToDB(DEFAULT_STATE);
      }
      return DEFAULT_STATE;
    }

    return (data.state as AppState) || DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveStateToDB = async (state: AppState) => {
  if (!supabase) return;

  try {
    await supabase
      .from('app_data')
      .upsert({
        id: 1,
        state,
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('Sync Error:', err);
  }
};
