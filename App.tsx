
import React, { useState, useEffect, useRef } from 'react';
import { Player, MatchmakingMode, AppState, TrainingSession, Gender } from './types';
import { loadStateFromDB, saveStateToDB, isDBConfigured } from './services/storage';
import { generateRound, calculateNewRatings } from './services/matchmaking';
import PlayerList from './components/PlayerList';
import ActiveTraining from './components/ActiveTraining';
import TrainingHistory from './components/TrainingHistory';

const Logo = () => (
  <svg viewBox="0 0 100 120" className="h-12 w-12" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,40 L15,35 L15,40 M20,30 L25,25 L25,30 M30,20 L35,15 L35,20 M45,10 L50,5 L55,10 M65,20 L70,15 L70,20 M75,30 L80,25 L80,30 M85,40 L90,35 L90,40" stroke="black" strokeWidth="2" fill="none"/>
    <path d="M15,40 L15,60 L85,60 L85,40 L75,30 L75,60 M65,20 L65,60 M55,10 L55,60 M45,10 L45,60 M35,20 L35,60 M25,30 L25,60" stroke="black" strokeWidth="2" fill="none"/>
    <circle cx="50" cy="80" r="35" fill="#e11d48" />
    <path d="M40,70 L65,70 L50,85 L65,100 M40,70 L40,100" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!isDBConfigured()) {
      setDbError("Configurazione Cloud (Supabase) mancante nelle variabili d'ambiente.");
      return;
    }

    loadStateFromDB()
      .then(data => {
        setState(data);
        isInitialMount.current = false;
      })
      .catch(() => {
        setDbError("Errore di connessione al database cloud.");
      });
  }, []);

  useEffect(() => {
    if (isInitialMount.current || !state || !isDBConfigured()) return;

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      await saveStateToDB(state);
      setIsSyncing(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state]);

  const addPlayer = (name: string, gender: Gender, basePoints: number) => {
    if (!state) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      gender,
      wins: 0,
      losses: 0,
      basePoints: basePoints || 0,
      matchPoints: 1200,
      lastActive: Date.now()
    };
    setState(prev => prev ? ({ ...prev, players: [...prev.players, newPlayer] }) : null);
  };

  const updatePlayer = (id: string, name: string, gender: Gender, basePoints: number, matchPoints: number) => {
    setState(prev => prev ? ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, name, gender, basePoints, matchPoints } : p)
    }) : null);
  };

  const deletePlayer = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare definitivamente questo atleta?")) {
      setState(prev => prev ? ({
        ...prev,
        players: prev.players.filter(p => p.id !== id)
      }) : null);
    }
  };

  const startNewSession = (participantIds: string[], date: number) => {
    const newSession: TrainingSession = {
      id: Math.random().toString(36).substr(2, 9),
      date,
      participantIds,
      rounds: [],
      status: 'ACTIVE'
    };
    setState(prev => prev ? ({ 
      ...prev, 
      sessions: [newSession, ...prev.sessions],
      currentTab: 'training'
    }) : null);
  };

  const addRoundToSession = (sessionId: string, mode: MatchmakingMode) => {
    setState(prev => {
      if (!prev) return null;
      const session = prev.sessions.find(s => s.id === sessionId);
      if (!session) return prev;
      const participants = prev.players.filter(p => session.participantIds.includes(p.id));
      const newRound = generateRound(participants, mode, session.rounds.length + 1, session.rounds);
      return {
        ...prev,
        sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, rounds: [...s.rounds, newRound] } : s)
      };
    });
  };

  const deleteRound = (sessionId: string, roundId: string) => {
    if (window.confirm("Eliminare questo round e tutte le sue partite?")) {
      setState(prev => prev ? ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, rounds: s.rounds.filter(r => r.id !== roundId) } : s)
      }) : null);
    }
  };

  const deleteSession = (sessionId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare l'intera sessione?")) {
      setState(prev => prev ? ({
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId)
      }) : null);
    }
  };

  const updateMatchScore = (sessionId: string, roundId: string, matchId: string, s1: number, s2: number) => {
    if (!state) return;
    const clampedS1 = Math.min(Math.max(s1, 0), 50);
    const clampedS2 = Math.min(Math.max(s2, 0), 50);

    setState(prev => {
      if (!prev) return null;
      const session = prev.sessions.find(s => s.id === sessionId);
      if (!session) return prev;

      let playersToUpdate: Player[] = [];
      let finalDelta = 0;

      const updatedSessions = prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          rounds: s.rounds.map(r => {
            if (r.id !== roundId) return r;
            return {
              ...r,
              matches: r.matches.map(m => {
                if (m.id !== matchId) return m;
                const p1 = prev.players.find(p => p.id === m.team1.playerIds[0]);
                const p2 = prev.players.find(p => p.id === m.team1.playerIds[1]);
                const p3 = prev.players.find(p => p.id === m.team2.playerIds[0]);
                const p4 = prev.players.find(p => p.id === m.team2.playerIds[1]);
                if (!p1 || !p2 || !p3 || !p4) return m;
                const result = calculateNewRatings(p1, p2, p3, p4, clampedS1, clampedS2);
                playersToUpdate = result.players;
                finalDelta = result.delta;
                return { 
                  ...m, 
                  status: 'COMPLETED' as const, 
                  team1: { ...m.team1, score: clampedS1 }, 
                  team2: { ...m.team2, score: clampedS2 },
                  pointsDelta: finalDelta
                };
              })
            };
          })
        };
      });

      const updatedPlayers = prev.players.map(p => {
        const up = playersToUpdate.find(u => u.id === p.id);
        return up ? up : p;
      });

      return { ...prev, sessions: updatedSessions, players: updatedPlayers };
    });
  };

  const reopenMatch = (sessionId: string, roundId: string, matchId: string) => {
    if (!window.confirm("Riaprire la partita? I punti verranno stornati.")) return;
    setState(prev => {
      if (!prev) return null;
      const session = prev.sessions.find(s => s.id === sessionId);
      const round = session?.rounds.find(r => r.id === roundId);
      const match = round?.matches.find(m => m.id === matchId);
      if (!match || match.status !== 'COMPLETED') return prev;

      const delta = match.pointsDelta || 0;
      const win1 = (match.team1.score || 0) > (match.team2.score || 0) ? 1 : 0;
      const win2 = 1 - win1;

      const revertedPlayers = prev.players.map(p => {
        if (match.team1.playerIds.includes(p.id)) {
          return { ...p, matchPoints: p.matchPoints - delta, wins: p.wins - win1, losses: p.losses - win2 };
        }
        if (match.team2.playerIds.includes(p.id)) {
          return { ...p, matchPoints: p.matchPoints + delta, wins: p.wins - win2, losses: p.losses - win1 };
        }
        return p;
      });

      const updatedSessions = prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          rounds: s.rounds.map(r => {
            if (r.id !== roundId) return r;
            return {
              ...r,
              matches: r.matches.map(m => m.id === matchId ? { 
                ...m, 
                status: 'PENDING' as const, 
                team1: { ...m.team1, score: undefined }, 
                team2: { ...m.team2, score: undefined },
                pointsDelta: undefined 
              } : m)
            };
          })
        };
      });
      return { ...prev, players: revertedPlayers, sessions: updatedSessions };
    });
  };

  const updateMatchPlayers = (sessionId: string, roundId: string, matchId: string, team: 1|2, index: 0|1, newPlayerId: string) => {
    setState(prev => prev ? ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          rounds: s.rounds.map(r => {
            if (r.id !== roundId) return r;
            return {
              ...r,
              matches: r.matches.map(m => {
                if (m.id !== matchId) return m;
                const newPlayerIds = [...(team === 1 ? m.team1.playerIds : m.team2.playerIds)] as [string, string];
                newPlayerIds[index] = newPlayerId;
                return {
                  ...m,
                  team1: team === 1 ? { ...m.team1, playerIds: newPlayerIds } : m.team1,
                  team2: team === 2 ? { ...m.team2, playerIds: newPlayerIds } : m.team2,
                };
              })
            };
          })
        };
      })
    }) : null);
  };

  const archiveSession = (sessionId: string) => {
    setState(prev => prev ? ({
      ...prev,
      sessions: prev.sessions.map(s => 
        s.id === sessionId ? { ...s, status: 'ARCHIVED' as const } : s
      ),
      currentTab: 'history'
    }) : null);
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase italic mb-2">Errore Configurazione</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{dbError}</p>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 p-4 rounded-lg text-left">
            Istruzioni:<br/>
            1. Crea un progetto su supabase.com<br/>
            2. Vai in Settings &gt; API<br/>
            3. Copia Project URL e Anon Key<br/>
            4. Inseriscili nelle variabili d'ambiente di Vercel
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Connessione Cloud...</p>
        </div>
      </div>
    );
  }

  const activeSession = state.sessions.find(s => s.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none text-slate-900 flex items-center gap-2">
                RMI <span className="text-red-600">TRAINING</span>
                {isSyncing && (
                  <div className="w-2 h-2 rounded-full bg-green-500 sync-pulse" title="Sincronizzazione Cloud..."></div>
                )}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Centrale Condiviso</p>
            </div>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl">
            {(['ranking', 'training', 'history'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setState(p => p ? ({ ...p, currentTab: tab }) : null)}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  state.currentTab === tab 
                    ? 'bg-white text-red-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'ranking' ? 'Ranking' : tab === 'training' ? 'Allenamento' : 'Storico'}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {state.currentTab === 'ranking' && (
          <PlayerList 
            players={state.players} 
            onAddPlayer={addPlayer}
            onUpdatePlayer={updatePlayer}
            onDeletePlayer={deletePlayer} 
          />
        )}
        {state.currentTab === 'training' && (
          <ActiveTraining 
            session={activeSession}
            players={state.players}
            onStartSession={startNewSession}
            onAddRound={addRoundToSession}
            onDeleteRound={deleteRound}
            onUpdateScore={updateMatchScore}
            onReopenMatch={reopenMatch}
            onUpdatePlayers={updateMatchPlayers}
            onArchive={archiveSession}
          />
        )}
        {state.currentTab === 'history' && (
          <TrainingHistory 
            sessions={state.sessions.filter(s => s.status === 'ARCHIVED')}
            players={state.players}
            onDeleteRound={deleteRound}
            onDeleteSession={deleteSession}
            onUpdateScore={updateMatchScore}
            onReopenMatch={reopenMatch}
            onUpdatePlayers={updateMatchPlayers}
          />
        )}
      </main>
      <footer className="py-6 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest border-t border-slate-200">
        &copy; {new Date().getFullYear()} Roundnet Milano - Sistema Cloud Centralizzato
      </footer>
    </div>
  );
};

export default App;
