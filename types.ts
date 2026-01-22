
export type Gender = 'M' | 'F';
export type AuthMode = 'admin' | 'user' | null;

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  wins: number;
  losses: number;
  basePoints: number; // Punti assegnati manualmente
  matchPoints: number; // Punti derivanti dalle partite
  lastActive: number;
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
  pointsDelta?: number; // Delta medio del team vincitore
  individualDeltas?: Record<string, number>; // Delta specifico per ogni ID giocatore
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
