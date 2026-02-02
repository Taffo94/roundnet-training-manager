
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Player, TrainingSession } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const LOCAL_STORAGE_BACKUP_KEY = 'rmi_manager_local_backup';

export const isDBConfigured = (): boolean => !!supabase;

export const loadFullState = async (): Promise<{players: Player[], sessions: TrainingSession[]}> => {
  if (!supabase) {
    const local = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    return local ? JSON.parse(local) : { players: [], sessions: [] };
  }

  // Carichiamo i dati in parallelo dalle due tabelle
  const [playersRes, sessionsRes] = await Promise.all([
    supabase.from('players').select('*'),
    supabase.from('sessions').select('*').order('date', { ascending: false })
  ]);

  if (playersRes.error) throw playersRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const players: Player[] = (playersRes.data || []).map(p => ({
    id: p.id,
    name: p.name,
    gender: p.gender,
    basePoints: p.base_points,
    matchPoints: p.match_points,
    wins: p.wins,
    losses: p.losses,
    isHidden: p.is_hidden,
    lastActive: Date.now()
  }));

  const sessions: TrainingSession[] = (sessionsRes.data || []).map(s => ({
    id: s.id,
    date: s.date,
    status: s.status,
    participantIds: s.participant_ids,
    rounds: s.rounds
  }));

  return { players, sessions };
};

// Salvataggio granulare: salviamo solo quello che serve
export const savePlayersToDB = async (players: Player[]) => {
  if (!supabase) return;
  
  // Mappiamo i dati per il DB (snake_case)
  const dbData = players.map(p => ({
    id: p.id,
    name: p.name,
    gender: p.gender,
    base_points: p.basePoints,
    match_points: p.matchPoints,
    wins: p.wins,
    losses: p.losses,
    is_hidden: p.isHidden
  }));

  const { error } = await supabase.from('players').upsert(dbData);
  if (error) throw error;
};

export const saveSessionsToDB = async (sessions: TrainingSession[]) => {
  if (!supabase) return;

  const dbData = sessions.map(s => ({
    id: s.id,
    date: s.date,
    status: s.status,
    participant_ids: s.participantIds,
    rounds: s.rounds
  }));

  const { error } = await supabase.from('sessions').upsert(dbData);
  if (error) throw error;
};

export const deletePlayerFromDB = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
};

export const deleteSessionFromDB = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
};

// Backup locale per sicurezza estrema
export const saveLocalBackup = (players: Player[], sessions: TrainingSession[]) => {
  localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify({ players, sessions }));
};
