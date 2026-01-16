
import { AppState } from '../types';

const STORAGE_KEY = 'roundnet_milano_state';

const DEFAULT_STATE: AppState = {
  players: [],
  sessions: [],
  currentTab: 'ranking'
};

export const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(saved);
    // Assicura che le proprietà fondamentali esistano
    return {
      ...DEFAULT_STATE,
      ...parsed
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
