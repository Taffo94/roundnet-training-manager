
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, MatchmakingMode, AppState, TrainingSession, Gender, Match, Round, AuthMode } from './types';
import { loadStateFromDB, saveStateToDB, isDBConfigured, getSupabaseConfig } from './services/storage';
import { generateRound, calculateNewRatings } from './services/matchmaking';
import PlayerList from './components/PlayerList';
import ActiveTraining from './components/ActiveTraining';
import TrainingHistory from './components/TrainingHistory';
import PlayerStats from './components/PlayerStats';

import logoImg from './Italien_Milano.png';

const AUTH_STORAGE_KEY = 'rmi_auth_session';

const Logo = () => {
  const [error, setError] = useState(false);
  return (
    <div className="relative group">
      <div className="bg-white p-1 rounded-2xl shadow-lg shadow-slate-200 w-14 h-14 flex items-center justify-center overflow-hidden transform group-hover:scale-110 transition-transform duration-300 border border-slate-100">
        {!error ? (
          <img 
            src={logoImg} 
            alt="Roundnet Milano" 
            className="w-full h-full object-contain" 
            onError={() => setError(true)}
          />
        ) : (
          <div className="bg-red-600 w-full h-full flex items-center justify-center text-white font-black italic text-xs">
            RMI
          </div>
        )}
      </div>
      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-100">
        <div className="w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  
  const [auth, setAuth] = useState<AuthMode>(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    return (savedAuth as AuthMode) || null;
  });

  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbError, setDbError] = useState<{message: string, details?: string} | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (auth) {
      localStorage.setItem(AUTH_STORAGE_KEY, auth);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [auth]);

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

  const attendanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!state) return map;
    state.sessions.forEach(s => {
      s.participantIds.forEach(id => {
        map[id] = (map[id] || 0) + 1;
      });
    });
    return map;
  }, [state?.sessions]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'RMI_Training') {
      setAuth('admin');
      setLoginError('');
    } else {
      setLoginError('Password Errata');
    }
  };

  const handleLogout = () => {
    setAuth(null);
    setAdminPassword('');
    setShowAdminLogin(false);
  };

  const updateSessionDate = (sessionId: string, newDate: number) => {
    setState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, date: newDate } : s)
      };
    });
  };

  const revertPlayerPoints = (players: Player[], match: Match): Player[] => {
    if (match.status !== 'COMPLETED' || !match.individualDeltas) return players;
    const win1 = (match.team1.score || 0) > (match.team2.score || 0) ? 1 : 0;
    const win2 = (match.team2.score || 0) > (match.team1.score || 0) ? 1 : 0;
    const isDraw = match.team1.score === match.team2.score;

    return players.map(p => {
      const d = match.individualDeltas![p.id];
      if (d !== undefined) {
        const isTeam1 = match.team1.playerIds.includes(p.id);
        const win = isTeam1 ? win1 : win2;
        const loss = isTeam1 ? win2 : win1;
        return { 
          ...p, 
          matchPoints: p.matchPoints - d, 
          wins: isDraw ? p.wins : p.wins - win, 
          losses: isDraw ? p.losses : p.losses - loss 
        };
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
      const sortedSessions = [...prev.sessions].sort((a, b) => a.date - b.date);

      sortedSessions.forEach(s => {
        const sortedRounds = [...s.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
        sortedRounds.forEach(r => {
          r.matches.forEach(m => {
            if (m.status === 'COMPLETED') {
              const p1 = updatedPlayers.find(p => p.id === m.team1.playerIds[0]);
              const p2 = updatedPlayers.find(p => p.id === m.team1.playerIds[1]);
              const p3 = updatedPlayers.find(p => p.id === m.team2.playerIds[0]);
              const p4 = updatedPlayers.find(p => p.id === m.team2.playerIds[1]);
              if (p1 && p2 && p3 && p4) {
                const result = calculateNewRatings(p1, p2, p3, p4, m.team1.score!, m.team2.score!);
                updatedPlayers = updatedPlayers.map(p => result.players.find(u => u.id === p.id) || p);
                m.individualDeltas = result.individualDeltas;
                m.pointsDelta = result.delta;
              }
            }
          });
        });
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
            if (!match || match.status === 'COMPLETED') return r;
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
            if (r.matches.some(m => m.status === 'COMPLETED')) return r;
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
          ...r, matches: r.matches.map(m => m.id === matchId ? { ...m, status: 'PENDING' as const, team1: { ...m.team1, score: undefined }, team2: { ...m.team2, score: undefined }, pointsDelta: undefined, individualDeltas: undefined } : m)
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
      let indDeltas: Record<string, number> = {};
      
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
            indDeltas = result.individualDeltas;
            return { ...m, status: 'COMPLETED' as const, team1: { ...m.team1, score: s1 }, team2: { ...m.team2, score: s2 }, pointsDelta: finalDelta, individualDeltas: indDeltas };
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

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-3xl mb-6 mx-auto">⚠️</div>
          <h2 className="text-2xl font-black text-center text-slate-800 uppercase italic tracking-tight mb-4">{dbError.message}</h2>
          <p className="text-slate-500 text-sm text-center mb-6">{dbError.details}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all">Ricarica Pagina</button>
        </div>
      </div>
    );
  }

  if (!state) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black uppercase italic text-slate-400 text-sm tracking-widest animate-pulse">Inizializzazione Sistema...</p>
      </div>
    </div>
  );

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="flex justify-center"><Logo /></div>
           <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">Roundnet Milano <span className="rm-gradient-text italic">Training</span></h1>
           
           {!showAdminLogin ? (
             <div className="space-y-4">
               <button 
                 onClick={() => setAuth('user')} 
                 className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
               >
                 Accesso Atleta
               </button>
               <button 
                 onClick={() => setShowAdminLogin(true)} 
                 className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-200"
               >
                 Area Admin
               </button>
             </div>
           ) : (
             <form onSubmit={handleAdminLogin} className="space-y-4">
               <div>
                 <input 
                   type="password" 
                   placeholder="Inserisci Password" 
                   value={adminPassword}
                   onChange={(e) => setAdminPassword(e.target.value)}
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-slate-800 focus:ring-4 focus:ring-red-600/10 focus:border-red-500 outline-none transition-all"
                   autoFocus
                 />
                 {loginError && <p className="text-red-600 text-[10px] font-black uppercase mt-2">{loginError}</p>}
               </div>
               <div className="flex gap-3">
                 <button 
                   type="button" 
                   onClick={() => { setShowAdminLogin(false); setAdminPassword(''); setLoginError(''); }}
                   className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest"
                 >
                   Indietro
                 </button>
                 <button 
                   type="submit"
                   className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
                 >
                   Entra
                 </button>
               </div>
             </form>
           )}
           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">&copy; {new Date().getFullYear()} RMI Training Manager</p>
        </div>
      </div>
    );
  }

  const isAdmin = auth === 'admin';
  const tabs = isAdmin ? ['ranking', 'training', 'history', 'stats'] : ['ranking', 'history', 'stats'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-slate-900">RMI <span className="text-red-600">MANAGER</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isAdmin ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-500 border border-slate-200'} uppercase`}>
                  {isAdmin ? 'Amministratore' : 'Utente'}
                </span>
                <button onClick={handleLogout} className="text-[9px] font-black text-slate-400 hover:text-red-600 uppercase transition-colors ml-1">Esci</button>
              </div>
            </div>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
            {tabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setState(p => p ? ({ ...p, currentTab: tab as any }) : null)} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${state.currentTab === tab ? 'bg-white text-red-600 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 relative">
        {isSyncing && (
          <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-[100] animate-in fade-in slide-in-from-bottom-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Sincronizzazione...</span>
          </div>
        )}

        {state.currentTab === 'ranking' && (
          <PlayerList 
            players={state.players} 
            isAdmin={isAdmin}
            onAddPlayer={(n, g, b) => setState(p => p ? ({ ...p, players: [...p.players, { id: Math.random().toString(36).substr(2, 9), name: n, gender: g, wins: 0, losses: 0, basePoints: b, matchPoints: 0, lastActive: Date.now() }] }) : null)} 
            onUpdatePlayer={(id, n, g, b, m) => setState(p => p ? ({ ...p, players: p.players.map(x => x.id === id ? { ...x, name: n, gender: g, basePoints: b, matchPoints: m } : x) }) : null)} 
            onDeletePlayer={(id) => window.confirm("Eliminare definitivamente?") && setState(p => p ? ({ ...p, players: p.players.filter(x => x.id !== id) }) : null)} 
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} 
            onResetPoints={resetAllPoints} 
            onRecalculate={recalculateRanking} 
          />
        )}
        {isAdmin && state.currentTab === 'training' && (
          <ActiveTraining 
            attendanceMap={attendanceMap} 
            session={state.sessions.find(s => s.status === 'ACTIVE')} 
            players={state.players} 
            onStartSession={(ids, date) => setState(p => p ? ({ ...p, sessions: [{ id: Math.random().toString(36).substr(2, 9), date, participantIds: ids, rounds: [], status: 'ACTIVE' }, ...p.sessions], currentTab: 'training' }) : null)} 
            onAddRound={(sid, mode) => setState(prev => { if (!prev) return null; const s = prev.sessions.find(x => x.id === sid); if (!s) return prev; return { ...prev, sessions: prev.sessions.map(x => x.id === sid ? { ...x, rounds: [...x.rounds, generateRound(prev.players.filter(p => s.participantIds.includes(p.id)), mode, x.rounds.length + 1, x.rounds)] } : x) }; })} 
            onDeleteRound={deleteRound} 
            onUpdateScore={updateMatchScore} 
            onReopenMatch={reopenMatch} 
            onUpdatePlayers={updateMatchPlayers} 
            onUpdateResting={updateRestingPlayer} 
            onUpdateSessionDate={updateSessionDate} 
            onArchive={(id) => setState(p => p ? ({ ...p, sessions: p.sessions.map(x => x.id === id ? { ...x, status: 'ARCHIVED' } : x), currentTab: 'history' }) : null)} 
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} 
          />
        )}
        {state.currentTab === 'history' && (
          <TrainingHistory 
            onUpdateSessionDate={updateSessionDate} 
            sessions={state.sessions.filter(s => s.status === 'ARCHIVED')} 
            players={state.players} 
            isAdmin={isAdmin}
            onDeleteRound={deleteRound} 
            onDeleteSession={deleteSession} 
            onUpdateScore={updateMatchScore} 
            onReopenMatch={reopenMatch} 
            onUpdatePlayers={updateMatchPlayers} 
            onUpdateResting={updateRestingPlayer} 
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} 
          />
        )}
        {state.currentTab === 'stats' && (
          <PlayerStats 
            players={state.players} 
            sessions={state.sessions} 
            selectedPlayerId={state.selectedPlayerId} 
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, selectedPlayerId: id }) : null)} 
          />
        )}
      </main>

      <footer className="py-8 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest border-t border-slate-100 bg-white">&copy; {new Date().getFullYear()} Roundnet Milano Official Manager</footer>
    </div>
  );
};

export default App;
