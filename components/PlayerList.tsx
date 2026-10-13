import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Player, Gender, TrainingSession, RankingWindowFilter, RankingFilterMode } from '../types';

interface PlayerListProps {
  players: Player[];
  sessions?: TrainingSession[];
  deltas: Record<string, { points: number, rankChange: number }>;
  isAdmin: boolean;
  rankingWindow?: RankingWindowFilter;
  onSaveRankingWindow?: (filter: RankingWindowFilter) => Promise<void> | void;
  onAddPlayer: (name: string, nickname: string, gender: Gender, basePoints: number) => void;
  onUpdatePlayer: (id: string, name: string, nickname: string, gender: Gender, basePoints: number, matchPoints: number) => void;
  onDeletePlayer: (id: string) => void;
  onSelectPlayer: (id: string) => void;
  onResetPoints: () => void;
  onRecalculate: () => void;
  onToggleHidden: (id: string) => void;
  onExport?: () => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconDelete = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const IconHide = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconShow = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconSave = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const InfoTooltip = ({ text, position = 'bottom' }: { text: string, position?: 'top' | 'bottom' }) => (
  <span className="ml-1 cursor-help group relative inline-block align-middle">
    <span className="text-slate-400 font-bold bg-slate-100 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[8px]">?</span>
    <span className={`pointer-events-none absolute ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white text-[9px] font-normal normal-case rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-2xl text-center`}>
      {text}
      <span className={`absolute ${position === 'bottom' ? 'bottom-full border-b-slate-900 rotate-180' : 'top-full border-t-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></span>
    </span>
  </span>
);

const PlayerList: React.FC<PlayerListProps> = ({ 
  players, sessions = [], deltas, isAdmin, rankingWindow, onSaveRankingWindow,
  onAddPlayer, onUpdatePlayer, onDeletePlayer, onSelectPlayer, onResetPoints, onRecalculate, onToggleHidden, onExport, onImport 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{name: string, nickname: string, gender: Gender, basePoints: number, matchPoints: number} | null>(null);
  const [newPlayerData, setNewPlayerData] = useState({ name: '', nickname: '', gender: 'M' as Gender, basePoints: 1000 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stato filtro ranking (inizializzato da rankingWindow globale o default ALL)
  const defaultFilter: RankingWindowFilter = { mode: 'ALL', months: 3, sessionCount: 10 };
  const [activeFilter, setActiveFilter] = useState<RankingWindowFilter>(rankingWindow || defaultFilter);
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Sincronizza se rankingWindow cambia dall'esterno (es. appena caricato dal DB)
  useEffect(() => {
    if (rankingWindow) {
      setActiveFilter(rankingWindow);
    }
  }, [rankingWindow?.mode, rankingWindow?.months, rankingWindow?.sessionCount, rankingWindow?.startDate, rankingWindow?.endDate]);

  // Calcolo dinamico ATP / Finestra temporale
  const { computedPlayers, statsMeta } = useMemo(() => {
    // 1. Sessioni archiviate ordinate dalla più recente alla più vecchia
    const archivedSessions = [...sessions]
      .filter(s => s.status === 'ARCHIVED' || s.rounds.some(r => r.matches.some(m => m.status === 'COMPLETED')))
      .sort((a, b) => b.date - a.date);

    let matchingSessions = [...archivedSessions];

    // Filtro per data / mesi
    if (activeFilter.mode === 'MONTHS' || activeFilter.mode === 'COMBO') {
      const m = activeFilter.months || 3;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - m);
      const cutoffMs = cutoff.getTime();
      matchingSessions = matchingSessions.filter(s => s.date >= cutoffMs);
    } else if (activeFilter.mode === 'CUSTOM') {
      if (activeFilter.startDate) {
        const startMs = new Date(activeFilter.startDate).setHours(0, 0, 0, 0);
        matchingSessions = matchingSessions.filter(s => s.date >= startMs);
      }
      if (activeFilter.endDate) {
        const endMs = new Date(activeFilter.endDate).setHours(23, 59, 59, 999);
        matchingSessions = matchingSessions.filter(s => s.date <= endMs);
      }
    }

    // Filtro per volume di allenamenti (ultimi N)
    if (activeFilter.mode === 'SESSIONS' || activeFilter.mode === 'COMBO') {
      const limit = activeFilter.sessionCount || 10;
      matchingSessions = matchingSessions.slice(0, limit);
    }

    // Se ALL, matchingSessions sono tutte le sessioni archiviate
    let totalCompletedMatches = 0;
    const playerStats: Record<string, { delta: number; wins: number; losses: number; attendances: number }> = {};
    players.forEach(p => {
      playerStats[p.id] = { delta: 0, wins: 0, losses: 0, attendances: 0 };
    });

    matchingSessions.forEach(session => {
      const attended = new Set(session.participantIds || []);
      session.rounds.forEach(r => {
        r.matches.forEach(m => {
          if (m.team1?.playerIds) m.team1.playerIds.forEach(id => attended.add(id));
          if (m.team2?.playerIds) m.team2.playerIds.forEach(id => attended.add(id));
        });
      });
      attended.forEach(id => {
        if (playerStats[id]) playerStats[id].attendances++;
      });

      session.rounds.forEach(r => {
        r.matches.forEach(m => {
          if (m.status === 'COMPLETED' && m.team1.score !== undefined && m.team2.score !== undefined) {
            totalCompletedMatches++;
            const s1 = m.team1.score;
            const s2 = m.team2.score;
            const t1Wins = s1 > s2 ? 1 : 0;
            const t2Wins = s2 > s1 ? 1 : 0;

            m.team1.playerIds.forEach(id => {
              if (playerStats[id]) {
                playerStats[id].delta += m.individualDeltas?.[id] || 0;
                playerStats[id].wins += t1Wins;
                playerStats[id].losses += (1 - t1Wins);
              }
            });
            m.team2.playerIds.forEach(id => {
              if (playerStats[id]) {
                playerStats[id].delta += m.individualDeltas?.[id] || 0;
                playerStats[id].wins += t2Wins;
                playerStats[id].losses += (1 - t2Wins);
              }
            });
          }
        });
      });
    });

    const isAll = activeFilter.mode === 'ALL';

    const processed = players.map(p => {
      const st = playerStats[p.id] || { delta: 0, wins: 0, losses: 0, attendances: 0 };
      const displayMatchPoints = isAll ? p.matchPoints : st.delta;
      const displayTotalPoints = p.basePoints + displayMatchPoints;
      const displayWins = isAll ? p.wins : st.wins;
      const displayLosses = isAll ? p.losses : st.losses;
      const hasPlayed = st.attendances > 0 || (st.wins + st.losses > 0);

      return {
        ...p,
        displayMatchPoints,
        displayTotalPoints,
        displayWins,
        displayLosses,
        attendances: st.attendances,
        hasPlayed
      };
    });

    return {
      computedPlayers: processed,
      statsMeta: {
        sessionsCount: matchingSessions.length,
        matchesCount: totalCompletedMatches,
        isFilterActive: !isAll,
        matchingSessionIds: matchingSessions.map(s => s.id)
      }
    };
  }, [players, sessions, activeFilter]);

  const deterministicSort = (a: any, b: any) => {
    const scoreA = a.displayTotalPoints;
    const scoreB = b.displayTotalPoints;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  };

  const visiblePlayers = isAdmin 
    ? [...computedPlayers].sort((a, b) => {
        if (a.isHidden && !b.isHidden) return 1;
        if (!a.isHidden && b.isHidden) return -1;
        return deterministicSort(a, b);
      })
    : [...computedPlayers].filter(p => !p.isHidden).sort(deterministicSort);

  const handleStartEdit = (player: Player) => {
    setEditingId(player.id);
    setEditFormData({ 
      name: player.name, 
      nickname: player.nickname || '', 
      gender: player.gender, 
      basePoints: player.basePoints, 
      matchPoints: player.matchPoints 
    });
  };

  const handleSaveEdit = (id: string) => {
    if (editFormData) {
      onUpdatePlayer(id, editFormData.name, editFormData.nickname, editFormData.gender, editFormData.basePoints, editFormData.matchPoints);
      setEditingId(null);
      setEditFormData(null);
    }
  };

  const handleConfirmOfficialWindow = async () => {
    if (!onSaveRankingWindow) return;
    setIsSavingFilter(true);
    try {
      await onSaveRankingWindow(activeFilter);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3500);
    } catch (e) {
      console.error("Errore salvataggio finestra ufficiale:", e);
      alert("Errore durante il salvataggio della finestra");
    } finally {
      setIsSavingFilter(false);
    }
  };

  // Verifica se il filtro corrente differisce da quello convalidato ufficiale
  const isDifferentFromOfficial = useMemo(() => {
    const official = rankingWindow || defaultFilter;
    if (activeFilter.mode !== official.mode) return true;
    if (activeFilter.mode === 'MONTHS' && activeFilter.months !== official.months) return true;
    if (activeFilter.mode === 'SESSIONS' && activeFilter.sessionCount !== official.sessionCount) return true;
    if (activeFilter.mode === 'COMBO' && (activeFilter.months !== official.months || activeFilter.sessionCount !== official.sessionCount)) return true;
    if (activeFilter.mode === 'CUSTOM' && (activeFilter.startDate !== official.startDate || activeFilter.endDate !== official.endDate)) return true;
    return false;
  }, [activeFilter, rankingWindow]);

  const getFilterDescription = (f: RankingWindowFilter) => {
    switch (f.mode) {
      case 'ALL': return 'Storico Completo (Tutte le partite)';
      case 'MONTHS': return `Ultimi ${f.months || 3} mesi`;
      case 'SESSIONS': return `Ultimi ${f.sessionCount || 10} allenamenti svolti`;
      case 'COMBO': return `Ultimi ${f.months || 3} mesi (max ${f.sessionCount || 10} allenamenti)`;
      case 'CUSTOM': return `Intervallo: ${f.startDate || 'Inizio'} → ${f.endDate || 'Oggi'}`;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* HEADER PRINCIPALE */}
      <div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-black text-2xl text-slate-800 uppercase italic tracking-tighter text-red-600">Classifica Atleti</h2>
            {statsMeta.isFilterActive ? (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-amber-200 shadow-sm">
                🎾 ATP Window: {getFilterDescription(activeFilter)}
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                🌐 Storico Completo
              </span>
            )}
            {!isDifferentFromOfficial && activeFilter.mode !== 'ALL' && (
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
                Ufficiale Attiva
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Classifica ufficiale Roundnet Milano</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={onRecalculate} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">Ricalcola Classifica</button>
            <button onClick={onExport} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Full Backup JSON</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Import</button>
            <input type="file" ref={fileInputRef} onChange={onImport} className="hidden" accept=".json" />
          </div>
        )}
      </div>

      {/* BARRA FILTRI ATP / ROLLING WINDOW */}
      <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>🎾</span> Finestra Classifica (Stile ATP)
            </span>
            <InfoTooltip position="top" text="Filtra le partite considerate per la classifica. I punti delle partite non vengono ricalcolati: vengono considerati solo i delta accumulati nelle sessioni selezionate, mantenendo i punti base iniziali." />
          </div>

          {/* PULSANTE CONVALIDA (Solo Admin) */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              {saveSuccessMsg && (
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-pulse">
                  <IconCheck /> Finestra Convalidata come Ufficiale!
                </span>
              )}
              {isDifferentFromOfficial ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveFilter(rankingWindow || defaultFilter)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Ripristina Ufficiale
                  </button>
                  <button
                    onClick={handleConfirmOfficialWindow}
                    disabled={isSavingFilter}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                  >
                    <span>{isSavingFilter ? 'Salvataggio...' : '💾 Convalida come Ufficiale'}</span>
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Finestra salvata come predefinita
                </span>
              )}
            </div>
          )}
        </div>

        {/* TABS MODALITÀ FILTRO */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <button
            onClick={() => setActiveFilter(prev => ({ ...prev, mode: 'ALL' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter.mode === 'ALL'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            🌐 Tutto lo Storico
          </button>
          <button
            onClick={() => setActiveFilter(prev => ({ ...prev, mode: 'MONTHS' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter.mode === 'MONTHS'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            📅 Ultimi Mesi
          </button>
          <button
            onClick={() => setActiveFilter(prev => ({ ...prev, mode: 'SESSIONS' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter.mode === 'SESSIONS'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            🏋️ Ultimi Allenamenti
          </button>
          <button
            onClick={() => setActiveFilter(prev => ({ ...prev, mode: 'COMBO' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter.mode === 'COMBO'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            ⚡ Combo Mesi + Allenamenti
          </button>
          <button
            onClick={() => setActiveFilter(prev => ({ ...prev, mode: 'CUSTOM' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeFilter.mode === 'CUSTOM'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            📆 Date Personalizzate
          </button>
        </div>

        {/* PARAMETRI DETTAGLIATI DEL FILTRO SELEZIONATO */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {(activeFilter.mode === 'MONTHS' || activeFilter.mode === 'COMBO') && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Finestra Temporale:</span>
                <select
                  value={activeFilter.months || 3}
                  onChange={e => setActiveFilter(prev => ({ ...prev, months: parseInt(e.target.value) || 3 }))}
                  className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl border border-slate-700 outline-none focus:border-amber-400"
                >
                  <option value={1}>Ultimo 1 Mese</option>
                  <option value={2}>Ultimi 2 Mesi</option>
                  <option value={3}>Ultimi 3 Mesi (Consigliato)</option>
                  <option value={6}>Ultimi 6 Mesi</option>
                  <option value={12}>Ultimi 12 Mesi (Stagione Completa)</option>
                </select>
              </div>
            )}

            {(activeFilter.mode === 'SESSIONS' || activeFilter.mode === 'COMBO') && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Volume Allenamenti:</span>
                <select
                  value={activeFilter.sessionCount || 10}
                  onChange={e => setActiveFilter(prev => ({ ...prev, sessionCount: parseInt(e.target.value) || 10 }))}
                  className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl border border-slate-700 outline-none focus:border-amber-400"
                >
                  <option value={5}>Ultimi 5 Allenamenti</option>
                  <option value={8}>Ultimi 8 Allenamenti</option>
                  <option value={10}>Ultimi 10 Allenamenti (Consigliato)</option>
                  <option value={15}>Ultimi 15 Allenamenti</option>
                  <option value={20}>Ultimi 20 Allenamenti</option>
                </select>
              </div>
            )}

            {activeFilter.mode === 'CUSTOM' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Da:</span>
                  <input
                    type="date"
                    value={activeFilter.startDate || ''}
                    onChange={e => setActiveFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl border border-slate-700 outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">A:</span>
                  <input
                    type="date"
                    value={activeFilter.endDate || ''}
                    onChange={e => setActiveFilter(prev => ({ ...prev, endDate: e.target.value }))}
                    className="bg-slate-800 text-white font-bold text-xs p-2 rounded-xl border border-slate-700 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {activeFilter.mode === 'ALL' && (
              <span className="text-xs text-slate-400 font-medium">
                Vengono conteggiati tutti i punti e tutte le partite registrate dall'inizio dello storico.
              </span>
            )}
          </div>

          {/* STATS DEL PERIODO FILTRATO */}
          <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
            <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              🏋️ <strong className="text-amber-400">{statsMeta.sessionsCount}</strong> Allenamenti considerati
            </span>
            <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              ⚡ <strong className="text-amber-400">{statsMeta.matchesCount}</strong> Partite
            </span>
          </div>
        </div>
      </div>

      {/* FORM AGGIUNTA ATLETA (Solo Admin) */}
      {isAdmin && (
        <div className="p-8 bg-white border-b border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Aggiungi Nuovo Atleta</h3>
          <form onSubmit={(e) => { e.preventDefault(); if(!newPlayerData.name) return; onAddPlayer(newPlayerData.name, newPlayerData.nickname, newPlayerData.gender, newPlayerData.basePoints); setNewPlayerData({ name: '', nickname: '', gender: 'M', basePoints: 1000 }); }} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Nome Cognome</label>
              <input type="text" placeholder="Es: Mario Rossi" value={newPlayerData.name} onChange={e => setNewPlayerData({...newPlayerData, name: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Soprannome (Opt)</label>
              <input type="text" placeholder="Es: Il Toro" value={newPlayerData.nickname} onChange={e => setNewPlayerData({...newPlayerData, nickname: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Sesso</label>
              <select value={newPlayerData.gender} onChange={e => setNewPlayerData({...newPlayerData, gender: e.target.value as Gender})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm h-[46px]">
                <option value="M">Uomo (M)</option>
                <option value="F">Donna (F)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Punti Base Iniziali</label>
              <input type="number" placeholder="1000" value={newPlayerData.basePoints} onChange={e => setNewPlayerData({...newPlayerData, basePoints: parseInt(e.target.value) || 0})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm" />
            </div>
            <div className="flex flex-col justify-end">
              <button type="submit" className="bg-red-600 text-white font-black uppercase text-[10px] tracking-widest h-[46px] rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100">Aggiungi Atleta</button>
            </div>
          </form>
        </div>
      )}

      {/* TABELLA CLASSIFICA */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Atleta</th>
              <th className="px-6 py-4 text-center">Sesso</th>
              {statsMeta.isFilterActive ? (
                <>
                  <th className="px-6 py-4 text-center whitespace-nowrap">
                    Punti Periodo <InfoTooltip text="Punti accumulati solo negli allenamenti selezionati dalla finestra temporale." />
                  </th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">
                    Presenze <InfoTooltip text="Allenamenti giocati all'interno della finestra temporale selezionata." />
                  </th>
                </>
              ) : (
                isAdmin && (
                  <th className="px-6 py-4 text-center whitespace-nowrap">
                    Match Points <InfoTooltip text="Punti accumulati giocando durante tutti gli allenamenti storici." />
                  </th>
                )
              )}
              <th className="px-6 py-4 text-center text-red-600 font-black italic whitespace-nowrap">
                {statsMeta.isFilterActive ? 'Totale Periodo' : 'Totale'} 
                <InfoTooltip text="Punti Base + Punti guadagnati/persi nelle partite del periodo." />
              </th>
              <th className="px-6 py-4 text-center whitespace-nowrap">
                {statsMeta.isFilterActive ? 'V / S (Periodo)' : 'V / S'} 
                <InfoTooltip text="Vittorie e Sconfitte maturate all'interno del periodo considerato." />
              </th>
              {isAdmin && <th className="px-6 py-4 text-right">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visiblePlayers.map((player: any, index) => {
              const d = deltas[player.id];
              const isEditing = editingId === player.id;
              const displayName = player.nickname || player.name;
              const hasNoPeriodActivity = statsMeta.isFilterActive && !player.hasPlayed;
              
              return (
                <tr key={player.id} className={`hover:bg-slate-50 transition-colors group ${player.isHidden ? 'opacity-50' : ''} ${hasNoPeriodActivity ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                  <td className="px-6 py-5 font-black text-slate-300 italic text-lg">#{index + 1}</td>
                  <td className="px-6 py-5">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input type="text" placeholder="Nome Completo" value={editFormData?.name} onChange={e => setEditFormData(prev => prev ? {...prev, name: e.target.value} : null)} className="p-2 border border-slate-200 rounded-lg font-bold text-sm w-full outline-none focus:border-red-500" />
                        <input type="text" placeholder="Soprannome (opzionale)" value={editFormData?.nickname} onChange={e => setEditFormData(prev => prev ? {...prev, nickname: e.target.value} : null)} className="p-2 border border-slate-200 rounded-lg font-bold text-xs w-full outline-none focus:border-red-500" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={() => onSelectPlayer(player.id)} className="font-black text-slate-800 hover:text-red-600 transition-all underline decoration-slate-100 underline-offset-8 decoration-2 flex flex-col items-start">
                          <span className={hasNoPeriodActivity ? 'text-slate-500 font-semibold' : ''}>{displayName}</span>
                          {player.nickname && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">({player.name})</span>}
                        </button>
                        {d && d.rankChange !== 0 && !player.isHidden && !statsMeta.isFilterActive && (
                          <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${d.rankChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <span>{d.rankChange > 0 ? '▲' : '▼'}</span>
                            <span>{Math.abs(d.rankChange)}</span>
                          </div>
                        )}
                        {hasNoPeriodActivity && (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">Inattivo nel periodo</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {isEditing ? (
                      <select value={editFormData?.gender} onChange={e => setEditFormData(prev => prev ? {...prev, gender: e.target.value as Gender} : null)} className="p-2 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-red-500">
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${player.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{player.gender}</span>
                    )}
                  </td>

                  {/* COLONNA MATCH POINTS / PUNTI PERIODICA */}
                  {statsMeta.isFilterActive ? (
                    <>
                      <td className="px-6 py-5 text-center">
                        <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                          player.displayMatchPoints > 0 ? 'text-emerald-700 bg-emerald-50' : 
                          player.displayMatchPoints < 0 ? 'text-red-700 bg-red-50' : 'text-slate-400 bg-slate-50'
                        }`}>
                          {player.displayMatchPoints > 0 ? '+' : ''}{player.displayMatchPoints.toFixed(1)} pt
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-bold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {player.attendances} / {statsMeta.sessionsCount}
                        </span>
                      </td>
                    </>
                  ) : (
                    isAdmin && (
                      <td className="px-6 py-5 text-center">
                        {isEditing ? (
                          <input type="number" value={editFormData?.matchPoints} onChange={e => setEditFormData(prev => prev ? {...prev, matchPoints: parseInt(e.target.value) || 0} : null)} className="p-1 border border-slate-200 rounded-lg font-bold text-xs w-20 text-center outline-none focus:border-red-500" />
                        ) : (
                          <span className="font-bold text-slate-600">{Math.round(player.matchPoints)}</span>
                        )}
                      </td>
                    )
                  )}

                  {/* COLONNA TOTALE PUNTI */}
                  <td className="px-6 py-5 text-center">
                    {isEditing ? (
                      <input type="number" value={editFormData?.basePoints} onChange={e => setEditFormData(prev => prev ? {...prev, basePoints: parseInt(e.target.value) || 0} : null)} className="p-1 border border-slate-200 rounded-lg font-bold text-xs w-20 text-center outline-none focus:border-red-500" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-black italic shadow-sm">
                          {Math.round(player.displayTotalPoints)}
                        </span>
                        {!statsMeta.isFilterActive && d && d.points !== 0 && (
                          <span className={`text-[10px] font-black italic ${d.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {d.points > 0 ? '▲' : '▼'} {Math.abs(d.points).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* COLONNA V / S */}
                  <td className="px-6 py-5 text-center text-xs font-black text-slate-400">
                    <span className="text-green-500">{player.displayWins}</span> / <span className="text-red-400">{player.displayLosses}</span>
                  </td>

                  {/* AZIONI (Solo Admin) */}
                  {isAdmin && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isEditing ? (
                          <button onClick={() => handleSaveEdit(player.id)} className="text-green-600 hover:text-green-800 p-2" title="Salva"><IconSave /></button>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(player)} className="text-slate-300 hover:text-blue-600 p-2" title="Modifica"><IconEdit /></button>
                            <button onClick={() => onToggleHidden(player.id)} className="text-slate-300 hover:text-slate-600 p-2" title={player.isHidden ? "Mostra" : "Nascondi"}>
                              {player.isHidden ? <IconShow /> : <IconHide />}
                            </button>
                            <button onClick={() => onDeletePlayer(player.id)} className="text-slate-300 hover:text-red-600 p-2" title="Elimina"><IconDelete /></button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerList;
