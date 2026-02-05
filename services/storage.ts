
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppSettings, AppSnapshot, Player, TrainingSession, MatchmakingMode } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const LOCAL_STORAGE_BACKUP_KEY = 'rmi_manager_local_backup';

export const isDBConfigured = (): boolean => !!supabase;

export const loadSettings = async (): Promise<AppSettings> => {
  const defaultSettings: AppSettings = {
    activeMatchmakingModes: Object.values(MatchmakingMode),
    allowManualSessionCreation: true,
    showStatsToAthletes: true,
    adminUICompactMode: false,
    ranking: {
      mode: 'CLASSIC',
      classic: {
        kBase: 12,
        bonusFactor: 1.25,
        classicBonusMargin: 7
      },
      proportional: {
        kBase: 12,
        bonusFactor: 1.25,
        maxPossibleMargin: 21
      }
    }
  };

  if (!supabase) return defaultSettings;

  const { data, error } = await supabase.from('app_settings').select('settings, updated_at').eq('id', 'main').single();
  if (error || !data) return defaultSettings;
  
  const saved = data.settings;
  const lastUpdated = data.updated_at ? new Date(data.updated_at).getTime() : undefined;

  return {
    ...defaultSettings,
    ...saved,
    lastUpdated: saved.lastUpdated || lastUpdated,
    ranking: {
      ...defaultSettings.ranking,
      ...saved.ranking,
      classic: { ...defaultSettings.ranking.classic, ...(saved.ranking?.classic || {}) },
      proportional: { ...defaultSettings.ranking.proportional, ...(saved.ranking?.proportional || {}) }
    }
  };
};

export const saveSettingsToDB = async (settings: AppSettings) => {
  if (!supabase) return;
  const { error } = await supabase.from('app_settings').upsert({ 
    id: 'main', 
    settings, 
    updated_at: new Date().toISOString() 
  });
  if (error) throw error;
};

export const loadFullState = async (): Promise<{players: Player[], sessions: TrainingSession[]}> => {
  if (!supabase) {
    const local = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    return local ? JSON.parse(local) : { players: [], sessions: [] };
  }

  const [playersRes, sessionsRes] = await Promise.all([
    supabase.from('players').select('*'),
    supabase.from('sessions').select('*').order('date', { ascending: false })
  ]);

  if (playersRes.error) throw playersRes.error;
  if (sessionsRes.error) throw sessionsRes.error;

  const players: Player[] = (playersRes.data || []).map(p => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
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

export const createSnapshot = async (players: Player[], sessions: TrainingSession[], settings: AppSettings, reason: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('app_snapshots').insert({
    reason,
    data: { players, sessions, settings }
  });
  if (error) throw error;
};

export const getSnapshots = async (): Promise<Partial<AppSnapshot>[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('app_snapshots').select('id, created_at, reason').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getSnapshotContent = async (id: string): Promise<AppSnapshot | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('app_snapshots').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const savePlayersToDB = async (players: Player[]) => {
  if (!supabase) return;
  const dbData = players.map(p => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
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

export const saveLocalBackup = (players: Player[], sessions: TrainingSession[]) => {
  localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify({ players, sessions }));
};
