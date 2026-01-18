
import React, { useState, useEffect, useRef } from 'react';
import { Player, MatchmakingMode, AppState, TrainingSession, Gender, Match, Round } from './types';
import { loadStateFromDB, saveStateToDB, isDBConfigured, getSupabaseConfig } from './services/storage';
import { generateRound, calculateNewRatings } from './services/matchmaking';
import PlayerList from './components/PlayerList';
import ActiveTraining from './components/ActiveTraining';
import TrainingHistory from './components/TrainingHistory';
import PlayerStats from './components/PlayerStats';
const Logo = () => {
  const [error, setError] = useState(false);
  
  return (
    <div className="relative">
      <div className="bg-white p-1 rounded-full shadow-md border border-slate-100 w-14 h-14 flex items-center justify-center overflow-hidden">
        {!error ? (
          <img 
            src="/logo.png" 
            alt="Roundnet Milano" 
            className="w-full h-full object-contain" 
            onError={(e) => {
            console.error("Logo non trovato o errore nel caricamento:", e);
            setError(true);
          }}
          />
        ) : (
          <div className="bg-red-600 w-full h-full flex items-center justify-center text-white font-black italic text-xs">
            RM
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbError, setDbError] = useState<{message: string, details?: string} | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!isDBConfigured()) {
      setDbError({ message: "Configurazione Cloud mancante", details: `URL=${config.url || 'Mancante'}` });
      return;
    }
    loadStateFromDB().then(data => {
      setState({ ...data, selectedPlayerId: data.selectedPlayerId || null, currentTab: data.currentTab || 'ranking' } as AppState);
      isInitialMount.current = false;
    }).catch(err => setDbError({ message: "Errore DB", details: err instanceof Error ? err.message : "" }));
  }, []);

  useEffect(() => {
    if (isInitialMount.current || !state || !isDBConfigured()) return;
    const timer = setTimeout(async () => {
      try { setIsSyncing(true); await saveStateToDB(state); setIsSyncing(false); } catch { setIsSyncing(false); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [state]);

  const revertPlayerPoints = (players: Player[], match: Match): Player[] => {
    if (match.status !== 'COMPLETED') return players;
    const delta = match.pointsDelta || 0;
    const win1 = (match.team1.score || 0) > (match.team2.score || 0) ? 1 : 0;
    const win2 = (match.team2.score || 0) > (match.team1.score || 0) ? 1 : 0;
    const isDraw = match.team1.score === match.team2.score;

    return players.map(p => {
      if (match.team1.playerIds.includes(p.id)) {
        return { ...p, matchPoints: p.matchPoints - delta, wins: isDraw ? p.wins : p.wins - win1, losses: isDraw ? p.losses : p.losses - win2 };
      }
      if (match.team2.playerIds.includes(p.id)) {
        return { ...p, matchPoints: p.matchPoints + delta, wins: isDraw ? p.wins : p.wins - win2, losses: isDraw ? p.losses : p.losses - win1 };
      }
      return p;
    });
  };

  const recalculateRanking = () => {
    if (!state) return;
    if (!window.confirm("Attenzione: ricalcolare tutti i punti basandosi cronologicamente sullo storico?")) return;

    setState(prev => {
      if (!prev) return null;
      let updatedPlayers = prev.players.map(p => ({ ...p, matchPoints: 0, wins: 0, losses: 0 }));
      const allCompletedMatches: { match: Match }[] = [];
      const sortedSessions = [...prev.sessions].sort((a, b) => a.date - b.date);

      sortedSessions.forEach(s => {
        const sortedRounds = [...s.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
        sortedRounds.forEach(r => {
          r.matches.forEach(m => {
            if (m.status === 'COMPLETED') {
              allCompletedMatches.push({ match: m });
            }
          });
        });
      });

      allCompletedMatches.forEach(({ match }) => {
        const p1 = updatedPlayers.find(p => p.id === match.team1.playerIds[0]);
        const p2 = updatedPlayers.find(p => p.id === match.team1.playerIds[1]);
        const p3 = updatedPlayers.find(p => p.id === match.team2.playerIds[0]);
        const p4 = updatedPlayers.find(p => p.id === match.team2.playerIds[1]);
        if (p1 && p2 && p3 && p4) {
          const result = calculateNewRatings(p1, p2, p3, p4, match.team1.score!, match.team2.score!);
          updatedPlayers = updatedPlayers.map(p => result.players.find(u => u.id === p.id) || p);
        }
      });
      return { ...prev, players: updatedPlayers };
    });
  };

  const updateMatchPlayers = (sessionId: string, roundId: string, matchId: string, team: 1|2, index: 0|1, newPid: string) => {
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === sessionId ? {
          ...s,
          rounds: s.rounds.map(r => {
            if (r.id !== roundId) return r;
            const match = r.matches.find(m => m.id === matchId);
            if (!match || match.status === 'COMPLETED') return r; // Blocca se completato
            const oldPid = team === 1 ? match.team1.playerIds[index] : match.team2.playerIds[index];
            let resting = [...r.restingPlayerIds];
            if (resting.includes(newPid)) resting = resting.map(id => id === newPid ? oldPid : id);
            const matches = r.matches.map(m => {
              const t1 = [...m.team1.playerIds];
              const t2 = [...m.team2.playerIds];
              let changed = false;
              [t1, t2].forEach((t, ti) => t.forEach((id, ii) => {
                if (id === newPid && (m.id !== matchId || ti+1 !== team || ii !== index)) {
                  t[ii] = oldPid; changed = true;
                }
              }));
              if (m.id === matchId) {
                if (team === 1) t1[index] = newPid; else t2[index] = newPid;
                changed = true;
              }
              return changed ? { ...m, team1: { ...m.team1, playerIds: t1 as [string, string] }, team2: { ...m.team2, playerIds: t2 as [string, string] } } : m;
            });
            return { ...r, matches, restingPlayerIds: resting };
          })
        } : s)
      };
    });
  };

  const updateRestingPlayer = (sessionId: string, roundId: string, index: number, newPid: string) => {
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === sessionId ? {
          ...s,
          rounds: s.rounds.map(r => {
            if (r.id !== roundId) return r;
            // Blocca se tutte le partite del round sono completate
            if (r.matches.every(m => m.status === 'COMPLETED')) return r;

            const oldPid = r.restingPlayerIds[index];
            const resting = r.restingPlayerIds.map((id, i) => i === index ? newPid : id);
            const matches = r.matches.map(m => {
              const t1 = [...m.team1.playerIds];
              const t2 = [...m.team2.playerIds];
              let changed = false;
              [t1, t2].forEach((t) => t.forEach((id, ii) => {
                if (id === newPid) { t[ii] = oldPid; changed = true; }
              }));
              return changed ? { ...m, team1: { ...m.team1, playerIds: t1 as [string, string] }, team2: { ...m.team2, playerIds: t2 as [string, string] } } : m;
            });
            return { ...r, matches, restingPlayerIds: resting };
          })
        } : s)
      };
    });
  };

  const deleteRound = (sessionId: string, roundId: string) => {
    if (!window.confirm("Eliminare round e stornare i punti?")) return;
    setState(prev => {
      if (!prev) return null;
      const session = prev.sessions.find(s => s.id === sessionId);
      const round = session?.rounds.find(r => r.id === roundId);
      if (!round) return prev;
      let players = [...prev.players];
      round.matches.forEach(m => players = revertPlayerPoints(players, m));
      return { ...prev, players, sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, rounds: s.rounds.filter(r => r.id !== roundId) } : s) };
    });
  };

  const deleteSession = (sessionId: string) => {
    if (!window.confirm("Eliminare intera sessione e stornare tutti i punti?")) return;
    setState(prev => {
      if (!prev) return null;
      const session = prev.sessions.find(s => s.id === sessionId);
      if (!session) return prev;
      let players = [...prev.players];
      session.rounds.forEach(r => r.matches.forEach(m => players = revertPlayerPoints(players, m)));
      return { ...prev, players, sessions: prev.sessions.filter(s => s.id !== sessionId) };
    });
  };

  const reopenMatch = (sessionId: string, roundId: string, matchId: string) => {
    if (!window.confirm("Riaprire partita e stornare i punti?")) return;
    setState(prev => {
      if (!prev) return null;
      const session = prev.sessions.find(s => s.id === sessionId);
      const round = session?.rounds.find(r => r.id === roundId);
      const match = round?.matches.find(m => m.id === matchId);
      if (!match || match.status !== 'COMPLETED') return prev;
      const players = revertPlayerPoints(prev.players, match);
      const sessions = prev.sessions.map(s => s.id === sessionId ? {
        ...s, rounds: s.rounds.map(r => r.id === roundId ? {
          ...r, matches: r.matches.map(m => m.id === matchId ? { ...m, status: 'PENDING' as const, team1: { ...m.team1, score: undefined }, team2: { ...m.team2, score: undefined }, pointsDelta: undefined } : m)
        } : r)
      } : s);
      return { ...prev, players, sessions };
    });
  };

  const updateMatchScore = (sessionId: string, roundId: string, matchId: string, s1: number, s2: number) => {
    setState(prev => {
      if (!prev) return null;
      let playersToUpdate: Player[] = [];
      let finalDelta = 0;
      const sessions = prev.sessions.map(s => s.id === sessionId ? {
        ...s, rounds: s.rounds.map(r => r.id === roundId ? {
          ...r, matches: r.matches.map(m => {
            if (m.id !== matchId) return m;
            const p1 = prev.players.find(p => p.id === m.team1.playerIds[0]);
            const p2 = prev.players.find(p => p.id === m.team1.playerIds[1]);
            const p3 = prev.players.find(p => p.id === m.team2.playerIds[0]);
            const p4 = prev.players.find(p => p.id === m.team2.playerIds[1]);
            if (!p1 || !p2 || !p3 || !p4) return m;
            const result = calculateNewRatings(p1, p2, p3, p4, s1, s2);
            playersToUpdate = result.players;
            finalDelta = result.delta;
            return { ...m, status: 'COMPLETED' as const, team1: { ...m.team1, score: s1 }, team2: { ...m.team2, score: s2 }, pointsDelta: finalDelta };
          })
        } : r)
      } : s);
      const players = prev.players.map(p => playersToUpdate.find(u => u.id === p.id) || p);
      return { ...prev, sessions, players };
    });
  };

  const resetAllPoints = () => {
    if (window.confirm("Resettare TUTTI i punti e le stats?")) {
      if (window.confirm("CONFERMA FINALE: Procedere?")) {
        setState(prev => prev ? ({ ...prev, players: prev.players.map(p => ({ ...p, basePoints: 0, matchPoints: 0, wins: 0, losses: 0 })) }) : null);
      }
    }
  };

  if (!state) return <div className="min-h-screen flex items-center justify-center font-black uppercase italic text-slate-400">RMI Manager Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-slate-900">RMI <span className="text-red-600">TRAINING</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                {isSyncing ? <span className="w-2.5 h-2.5 bg-green-500 rounded-full sync-pulse shadow-sm shadow-green-200"></span> : <span className="w-2.5 h-2.5 bg-slate-300 rounded-full"></span>}
                Cloud Sync attivo
              </p>
            </div>
          </div>
          <nav className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200">
            {(['ranking', 'training', 'history', 'stats'] as const).map(tab => (
              <button key={tab} onClick={() => setState(p => p ? ({ ...p, currentTab: tab }) : null)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${state.currentTab === tab ? 'bg-white text-red-600 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>{tab}</button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {state.currentTab === 'ranking' && <PlayerList players={state.players} onAddPlayer={(n, g, b) => setState(p => p ? ({ ...p, players: [...p.players, { id: Math.random().toString(36).substr(2, 9), name: n, gender: g, wins: 0, losses: 0, basePoints: b, matchPoints: 0, lastActive: Date.now() }] }) : null)} onUpdatePlayer={(id, n, g, b, m) => setState(p => p ? ({ ...p, players: p.players.map(x => x.id === id ? { ...x, name: n, gender: g, basePoints: b, matchPoints: m } : x) }) : null)} onDeletePlayer={(id) => window.confirm("Eliminare?") && setState(p => p ? ({ ...p, players: p.players.filter(x => x.id !== id) }) : null)} onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} onResetPoints={resetAllPoints} onRecalculate={recalculateRanking} />}
        {state.currentTab === 'training' && <ActiveTraining session={state.sessions.find(s => s.status === 'ACTIVE')} players={state.players} onStartSession={(ids, date) => setState(p => p ? ({ ...p, sessions: [{ id: Math.random().toString(36).substr(2, 9), date, participantIds: ids, rounds: [], status: 'ACTIVE' }, ...p.sessions], currentTab: 'training' }) : null)} onAddRound={(sid, mode) => setState(prev => { if (!prev) return null; const s = prev.sessions.find(x => x.id === sid); if (!s) return prev; return { ...prev, sessions: prev.sessions.map(x => x.id === sid ? { ...x, rounds: [...x.rounds, generateRound(prev.players.filter(p => s.participantIds.includes(p.id)), mode, x.rounds.length + 1, x.rounds)] } : x) }; })} onDeleteRound={deleteRound} onUpdateScore={updateMatchScore} onReopenMatch={reopenMatch} onUpdatePlayers={updateMatchPlayers} onUpdateResting={updateRestingPlayer} onArchive={(id) => setState(p => p ? ({ ...p, sessions: p.sessions.map(x => x.id === id ? { ...x, status: 'ARCHIVED' } : x), currentTab: 'history' }) : null)} onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} />}
        {state.currentTab === 'history' && <TrainingHistory sessions={state.sessions.filter(s => s.status === 'ARCHIVED')} players={state.players} onDeleteRound={deleteRound} onDeleteSession={deleteSession} onUpdateScore={updateMatchScore} onReopenMatch={reopenMatch} onUpdatePlayers={updateMatchPlayers} onUpdateResting={updateRestingPlayer} onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} />}
        {state.currentTab === 'stats' && <PlayerStats players={state.players} sessions={state.sessions} selectedPlayerId={state.selectedPlayerId} onSelectPlayer={(id) => setState(p => p ? ({ ...p, selectedPlayerId: id }) : null)} />}
      </main>
      <footer className="py-8 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest border-t border-slate-100 bg-white">&copy; {new Date().getFullYear()} Roundnet Milano</footer>
    </div>
  );
};

export default App;
