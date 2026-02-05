
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, MatchmakingMode, AppState, TrainingSession, Gender, Match, Round, AuthMode, AppSettings } from './types';
import { loadFullState, savePlayersToDB, saveSessionsToDB, deletePlayerFromDB, deleteSessionFromDB, saveLocalBackup, loadSettings, saveSettingsToDB } from './services/storage';
import { generateRound, calculateNewRatings } from './services/matchmaking';
import PlayerList from './components/PlayerList';
import ActiveTraining from './components/ActiveTraining';
import TrainingHistory from './components/TrainingHistory';
import PlayerStats from './components/PlayerStats';
import AdminSettings from './components/AdminSettings';

const AUTH_STORAGE_KEY = 'rmi_auth_session';

const Logo = () => {
  const [error, setError] = useState(false);
  const logoSrc = `/Italien_Milano2.png?v=${Date.now()}`;
  return (
    <div className="relative">
      <div className="bg-white p-1 rounded-full shadow-md border border-slate-100 w-14 h-14 flex items-center justify-center overflow-hidden">
        {!error ? (
          <img src={logoSrc} alt="Roundnet Milano" className="w-full h-full object-contain" onError={() => setError(true)} />
        ) : (
          <div className="bg-red-600 w-full h-full flex items-center justify-center text-white font-black italic text-xs">RM</div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [auth, setAuth] = useState<AuthMode>(() => (localStorage.getItem(AUTH_STORAGE_KEY) as AuthMode) || null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    Promise.all([loadFullState(), loadSettings()]).then(([data, settings]) => {
      setState({
        players: data.players,
        sessions: data.sessions,
        settings,
        currentTab: 'ranking',
        selectedPlayerId: null
      });
      setTimeout(() => { isInitialMount.current = false; }, 800);
    }).catch(err => {
      console.error("Errore fatale caricamento:", err);
    });
  }, []);

  useEffect(() => {
    if (isInitialMount.current || !state) return;
    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await Promise.all([
          savePlayersToDB(state.players),
          saveSessionsToDB(state.sessions),
          saveSettingsToDB(state.settings)
        ]);
        saveLocalBackup(state.players, state.sessions);
      } catch (e) {
        console.error("Errore durante la sincronizzazione:", e);
      } finally {
        setIsSyncing(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state?.players, state?.sessions, state?.settings]);

  useEffect(() => {
    if (auth) localStorage.setItem(AUTH_STORAGE_KEY, auth);
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [auth]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'RMI_Training') { setAuth('admin'); setLoginError(''); }
    else setLoginError('Password Errata');
  };

  const updateMatchScore = (sessionId: string, roundId: string, matchId: string, s1: number, s2: number) => {
    setState(prev => {
      if (!prev) return null;
      let playersToUpdate: Player[] = [];
      const sessions = prev.sessions.map(s => s.id === sessionId ? {
        ...s, rounds: s.rounds.map(r => r.id === roundId ? {
          ...r, matches: r.matches.map(m => {
            if (m.id !== matchId) return m;
            const p1 = prev.players.find(p => p.id === m.team1.playerIds[0]), p2 = prev.players.find(p => p.id === m.team1.playerIds[1]);
            const p3 = prev.players.find(p => p.id === m.team2.playerIds[0]), p4 = prev.players.find(p => p.id === m.team2.playerIds[1]);
            if (!p1 || !p2 || !p3 || !p4) return m;
            const result = calculateNewRatings(p1, p2, p3, p4, s1, s2);
            playersToUpdate = result.players;
            return { ...m, status: 'COMPLETED' as const, team1: { ...m.team1, score: s1 }, team2: { ...m.team2, score: s2 }, pointsDelta: result.delta, individualDeltas: result.individualDeltas };
          })
        } : r)
      } : s);
      return { ...prev, sessions, players: prev.players.map(p => playersToUpdate.find(u => u.id === p.id) || p) };
    });
  };

  const recalculateAllPoints = async () => {
    if (!state) return;
    if (!window.confirm("Attenzione: Questa operazione azzererà tutti i Match Points e ricalcolerà l'intera classifica basandosi cronologicamente su tutti gli allenamenti archiviati. Procedere?")) return;
    
    setIsSyncing(true);
    let updatedPlayers = state.players.map(p => ({ ...p, matchPoints: 0, wins: 0, losses: 0 }));
    const sortedSessions = [...state.sessions]
      .filter(s => s.status === 'ARCHIVED')
      .sort((a, b) => a.date - b.date);

    for (const session of sortedSessions) {
      for (const round of session.rounds) {
        for (const match of round.matches) {
          if (match.status === 'COMPLETED' && match.team1.score !== undefined && match.team2.score !== undefined) {
            const p1 = updatedPlayers.find(p => p.id === match.team1.playerIds[0]);
            const p2 = updatedPlayers.find(p => p.id === match.team1.playerIds[1]);
            const p3 = updatedPlayers.find(p => p.id === match.team2.playerIds[0]);
            const p4 = updatedPlayers.find(p => p.id === match.team2.playerIds[1]);

            if (p1 && p2 && p3 && p4) {
              const result = calculateNewRatings(p1, p2, p3, p4, match.team1.score, match.team2.score);
              updatedPlayers = updatedPlayers.map(p => result.players.find(up => up.id === p.id) || p);
            }
          }
        }
      }
    }
    setState({ ...state, players: updatedPlayers });
    await savePlayersToDB(updatedPlayers);
    setIsSyncing(false);
    alert("Ricalcolo completato con successo!");
  };

  const activeSession = state?.sessions.find(s => s.status === 'ACTIVE');
  const isAdmin = auth === 'admin';
  
  const tabs = isAdmin 
    ? ['ranking', 'training', 'history', 'stats', 'settings'] 
    : (state?.settings.showStatsToAthletes ? ['ranking', 'history', 'stats'] : ['ranking', 'history']);

  const rankingDeltas = useMemo(() => {
    if (!state || state.sessions.length === 0) return {};
    const archivedSessions = state.sessions.filter(s => s.status === 'ARCHIVED').sort((a, b) => b.date - a.date);
    if (archivedSessions.length === 0) return {};
    const lastSession = archivedSessions[0];
    const deltas: Record<string, { points: number, rankChange: number }> = {};
    const visiblePlayers = state.players.filter(p => !p.isHidden);
    
    const sortFn = (playersArr: any[]) => [...playersArr].sort((a, b) => {
      const scoreA = a.basePoints + (a.matchPoints || 0);
      const scoreB = b.basePoints + (b.matchPoints || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });

    const currentRanking = sortFn(visiblePlayers);
    const prevPlayers = visiblePlayers.map(p => {
      let sessionPoints = 0;
      lastSession.rounds.forEach(r => r.matches.forEach(m => {
        if (m.status === 'COMPLETED' && m.individualDeltas && m.individualDeltas[p.id]) {
          sessionPoints += m.individualDeltas[p.id];
        }
      }));
      return { ...p, matchPoints: p.matchPoints - sessionPoints, sessionDelta: sessionPoints };
    });
    const prevRanking = sortFn(prevPlayers);
    
    visiblePlayers.forEach(p => {
      const currentRank = currentRanking.findIndex(x => x.id === p.id) + 1;
      const prevRank = prevRanking.findIndex(x => x.id === p.id) + 1;
      deltas[p.id] = { 
        points: prevPlayers.find(x => x.id === p.id)?.sessionDelta || 0, 
        rankChange: currentRank === 0 || prevRank === 0 ? 0 : prevRank - currentRank 
      };
    });
    return deltas;
  }, [state?.players, state?.sessions]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    state?.sessions.forEach(s => s.participantIds.forEach(id => { map[id] = (map[id] || 0) + 1; }));
    return map;
  }, [state?.sessions]);

  if (!state) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black italic animate-pulse uppercase tracking-[0.5em]">Caricamento...</div>;

  if (!auth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="flex justify-center"><Logo /></div>
           <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">Roundnet Milano <span className="text-red-600">Training</span></h1>
           {!showAdminLogin ? (
             <div className="space-y-4">
               <button onClick={() => setAuth('user')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-4 rounded-2xl font-black uppercase tracking-widest transition-all">Accesso Atleta</button>
               <button onClick={() => setShowAdminLogin(true)} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-200">Area Admin</button>
             </div>
           ) : (
             <form onSubmit={handleAdminLogin} className="space-y-4">
               <input type="password" placeholder="Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center outline-none focus:border-red-500 transition-all" autoFocus />
               <div className="flex gap-3">
                 <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest">Indietro</button>
                 <button type="submit" className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Entra</button>
               </div>
               {loginError && <p className="text-red-600 text-[10px] font-black uppercase">{loginError}</p>}
             </form>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900">RMI <span className="text-red-600">MANAGER</span></h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isAdmin ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-500 border border-slate-200'} uppercase`}>{isAdmin ? 'Amministratore' : 'Atleta'}</span>
                {isSyncing && <span className="text-[8px] font-black text-slate-300 uppercase animate-pulse italic">Sincronizzazione...</span>}
                <button onClick={() => setAuth(null)} className="text-[9px] font-black text-slate-400 hover:text-red-600 uppercase ml-1 transition-colors">Esci</button>
              </div>
            </div>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner overflow-x-auto max-w-full no-scrollbar">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setState(p => p ? ({ ...p, currentTab: tab as any }) : null)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${state.currentTab === tab ? 'bg-white text-red-600 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-800'}`}>{tab === 'settings' ? '⚙️ Tech' : tab}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {state.currentTab === 'ranking' && (
          <PlayerList 
            players={state.players} deltas={rankingDeltas} isAdmin={isAdmin}
            onAddPlayer={(n, ni, g, b) => setState(p => p ? ({ ...p, players: [...p.players, { id: Math.random().toString(36).substr(2, 9), name: n, nickname: ni, gender: g, wins: 0, losses: 0, basePoints: b, matchPoints: 0, lastActive: Date.now() }] }) : null)} 
            onUpdatePlayer={(id, n, ni, g, b, m) => setState(p => p ? ({ ...p, players: p.players.map(x => x.id === id ? { ...x, name: n, nickname: ni, gender: g, basePoints: b, matchPoints: m } : x) }) : null)} 
            onDeletePlayer={(id) => { if(window.confirm("Eliminare definitivamente l'atleta?")) { deletePlayerFromDB(id); setState(p => p ? ({ ...p, players: p.players.filter(x => x.id !== id) }) : null); } }} 
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} 
            onResetPoints={() => {}} onRecalculate={recalculateAllPoints}
            onToggleHidden={(id) => setState(p => p ? ({ ...p, players: p.players.map(x => x.id === id ? { ...x, isHidden: !x.isHidden } : x) }) : null)}
          />
        )}
        {isAdmin && state.currentTab === 'training' && (
          <ActiveTraining 
            attendanceMap={attendanceMap} session={activeSession} players={state.players} 
            onStartSession={(ids, date) => setState(p => p ? ({ ...p, sessions: [{ id: Math.random().toString(36).substr(2, 9), date, participantIds: ids, rounds: [], status: 'ACTIVE' }, ...p.sessions], currentTab: 'training' }) : null)} 
            onAddRound={(sid, mode) => setState(prev => { if (!prev) return null; const s = prev.sessions.find(x => x.id === sid); if (!s) return prev; return { ...prev, sessions: prev.sessions.map(x => x.id === sid ? { ...x, rounds: [...x.rounds, generateRound(prev.players.filter(p => s.participantIds.includes(p.id)), mode, x.rounds.length + 1, x.rounds)] } : x) }; })} 
            onDeleteRound={(sid, rid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.filter(r => r.id !== rid) } : s) }) : null)}
            onRefreshRound={(sid, rid) => setState(prev => { if (!prev) return null; const s = prev.sessions.find(x => x.id === sid); const r = s?.rounds.find(x => x.id === rid); if (!s || !r) return prev; const newRound = generateRound(prev.players.filter(p => s.participantIds.includes(p.id)), r.mode, r.roundNumber, s.rounds.slice(0, s.rounds.indexOf(r))); return { ...prev, sessions: prev.sessions.map(x => x.id === sid ? { ...x, rounds: x.rounds.map(y => y.id === rid ? newRound : y) } : x) }; })}
            onUpdateScore={updateMatchScore} 
            onReopenMatch={(sid, rid, mid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.map(r => r.id === rid ? { ...r, matches: r.matches.map(m => m.id === mid ? { ...m, status: 'PENDING' } : m) } : r) } : s) }) : null)}
            onUpdatePlayers={(sid, rid, mid, team, idx, pid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.map(r => r.id === rid ? { ...r, matches: r.matches.map(m => m.id === mid ? { ...m, [team === 1 ? 'team1' : 'team2']: { ...m[team === 1 ? 'team1' : 'team2'], playerIds: m[team === 1 ? 'team1' : 'team2'].playerIds.map((p, i) => i === idx ? pid : p) } } : m) } : r) } : s) }) : null)}
            onUpdateResting={(sid, rid, idx, pid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.map(r => r.id === rid ? { ...r, restingPlayerIds: r.restingPlayerIds.map((p, i) => i === idx ? pid : p) } : r) } : s) }) : null)}
            onUpdateSessionDate={(sid, date) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, date } : s) }) : null)}
            onEditParticipants={(ids) => activeSession && setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === activeSession.id ? { ...s, participantIds: ids } : s) }) : null)}
            onArchive={(id) => setState(p => p ? ({ ...p, sessions: p.sessions.map(x => x.id === id ? { ...x, status: 'ARCHIVED' } : x), currentTab: 'history' }) : null)} 
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} 
          />
        )}
        {state.currentTab === 'history' && (
          <TrainingHistory 
            sessions={state.sessions.filter(s => s.status === 'ARCHIVED')} players={state.players} isAdmin={isAdmin}
            onUpdateSessionDate={(sid, date) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, date } : s) }) : null)}
            onDeleteRound={(sid, rid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.filter(r => r.id !== rid) } : s) }) : null)} 
            onDeleteSession={(sid) => { if(window.confirm("Eliminare definitivamente l'intera sessione archiviata?")) { deleteSessionFromDB(sid); setState(prev => prev ? ({ ...prev, sessions: prev.sessions.filter(s => s.id !== sid) }) : null); } }}
            onUpdateScore={updateMatchScore} 
            onReopenMatch={(sid, rid, mid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.map(r => r.id === rid ? { ...r, matches: r.matches.map(m => m.id === mid ? { ...m, status: 'PENDING' } : m) } : r) } : s) }) : null)}
            onUpdatePlayers={(sid, rid, mid, team, idx, pid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.map(r => r.id === rid ? { ...r, matches: r.matches.map(m => m.id === mid ? { ...m, [team === 1 ? 'team1' : 'team2']: { ...m[team === 1 ? 'team1' : 'team2'], playerIds: m[team === 1 ? 'team1' : 'team2'].playerIds.map((p, i) => i === idx ? pid : p) } } : m) } : r) } : s) }) : null)}
            onUpdateResting={(sid, rid, idx, pid) => setState(prev => prev ? ({ ...prev, sessions: prev.sessions.map(s => s.id === sid ? { ...s, rounds: s.rounds.map(r => r.id === rid ? { ...r, restingPlayerIds: r.restingPlayerIds.map((p, i) => i === idx ? pid : p) } : r) } : s) }) : null)}
            onSelectPlayer={(id) => setState(p => p ? ({ ...p, currentTab: 'stats', selectedPlayerId: id }) : null)} 
          />
        )}
        {state.currentTab === 'stats' && (
          <PlayerStats players={state.players} sessions={state.sessions} selectedPlayerId={state.selectedPlayerId} onSelectPlayer={(id) => setState(p => p ? ({ ...p, selectedPlayerId: id }) : null)} />
        )}
        {isAdmin && state.currentTab === 'settings' && (
          <AdminSettings 
            settings={state.settings}
            onUpdateSettings={(newSets) => setState(p => p ? ({ ...p, settings: newSets }) : null)}
            players={state.players}
            sessions={state.sessions}
            onRestoreSnapshot={(players, sessions) => {
              if (window.confirm("Attenzione: Ripristinando questo snapshot sovrascriverai i dati attuali. Procedere?")) {
                setState(p => p ? ({ ...p, players, sessions, currentTab: 'ranking' }) : null);
              }
            }}
          />
        )}
      </main>
      <footer className="py-8 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-white border-t">&copy; {new Date().getFullYear()} Roundnet Milano Manager</footer>
    </div>
  );
};

export default App;
