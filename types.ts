
export type Gender = 'M' | 'F';
export type AuthMode = 'admin' | 'user' | null;

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  gender: Gender;
  wins: number;
  losses: number;
  basePoints: number; 
  matchPoints: number; 
  lastActive: number;
  isHidden?: boolean; 
}

export enum MatchmakingMode {
  FULL_RANDOM = 'FULL_RANDOM',
  SAME_LEVEL = 'SAME_LEVEL',
  BALANCED_PAIRS = 'BALANCED_PAIRS',
  GENDER_BALANCED = 'GENDER_BALANCED',
  CUSTOM = 'CUSTOM'
}

export type RankingMode = 'CLASSIC' | 'PROPORTIONAL';

export interface RankingSettings {
  mode: RankingMode;
  kBase: number;
  bonusFactor: number;
  maxPossibleMargin: number; // Solo per Proportional
  classicBonusMargin: number; // Solo per Classic
}

export interface AppSettings {
  activeMatchmakingModes: MatchmakingMode[];
  allowManualSessionCreation: boolean;
  showStatsToAthletes: boolean;
  adminUICompactMode: boolean;
  ranking: RankingSettings;
}

export interface AppSnapshot {
  id: string;
  created_at: string;
  reason: string;
  data: {
    players: Player[];
    sessions: TrainingSession[];
  };
}

export interface Team {
  playerIds: [string, string];
  score?: number;
}

export interface Match {
  id: string;
  team1: Team;
  team2: Team;
  status: 'PENDING' | 'COMPLETED';
  mode: MatchmakingMode;
  createdAt: number;
  pointsDelta?: number; 
  individualDeltas?: Record<string, number>; 
}

export interface Round {
  id: string;
  roundNumber: number;
  matches: Match[];
  restingPlayerIds: string[];
  mode: MatchmakingMode;
}

export interface TrainingSession {
  id: string;
  date: number;
  participantIds: string[];
  rounds: Round[];
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface AppState {
  players: Player[];
  sessions: TrainingSession[];
  settings: AppSettings;
  currentTab: 'ranking' | 'training' | 'history' | 'stats' | 'settings';
  selectedPlayerId: string | null;
}
