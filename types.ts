
export type Gender = 'M' | 'F';
export type AuthMode = 'admin' | 'user' | null;

export interface Player {
  id: string;
  name: string;
  nickname?: string; // Campo opzionale per il soprannome
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
  currentTab: 'ranking' | 'training' | 'history' | 'stats';
  selectedPlayerId: string | null;
}
