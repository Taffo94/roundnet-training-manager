
import React, { useState } from 'react';
import { Player, TrainingSession, MatchmakingMode, Round } from '../types';

interface ActiveTrainingProps {
  session?: TrainingSession;
  players: Player[];
  onStartSession: (ids: string[], date: number) => void;
  onAddRound: (sessionId: string, mode: MatchmakingMode) => void;
  onDeleteRound: (sessionId: string, roundId: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onUpdateResting: (sid: string, rid: string, index: number, pid: string) => void;
  onArchive: (sessionId: string) => void;
  onSelectPlayer: (id: string) => void;
}

const getNextMonday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 1) ? 0 : (1 - day + 7) % 7;
  const nextMonday = new Date(d);
  nextMonday.setDate(d.getDate() + diff);
  return nextMonday.toISOString().split('T')[0];
};

const ActiveTraining: React.FC<ActiveTrainingProps> = ({ 
  session, players, onStartSession, onAddRound, onDeleteRound, onUpdateScore, onReopenMatch, onUpdatePlayers, onUpdateResting, onArchive, onSelectPlayer 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  const [sessionDate, setSessionDate] = useState<string>(getNextMonday());

  const togglePlayer = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const participants = session ? players.filter(p => session.participantIds.includes(p.id)).sort((a,b) => a.name.localeCompare(b.name)) : [];

  const getTeamPoints = (ids: string[]) => {
    return ids.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p ? (p.basePoints + p.matchPoints) : 0);
    }, 0);
  };

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white ring-1 ring-green-100">W</span>;
    if (teamScore < opponentScore) return <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white ring-1 ring-red-100">L</span>;
    return <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white ring-1 ring-blue-100">T</span>;
  };

  const getConflicts = (round: Round) => {
    const counts: Record<string, number> = {};
    round.restingPlayerIds.forEach(id => { if (id) counts[id] = (counts[id] || 0) + 1; });
    round.matches.forEach(m => {
      [...m.team1.playerIds, ...m.team2.playerIds].forEach(id => {
        if (id) counts[id] = (counts[id] || 0) + 1;
      });
    });
    return new Set(Object.keys(counts).filter(id => counts[id] > 1));
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-10 space-y-10">
        <div className="text-center">
          <h2 className="text-4xl font-black text-slate-800 uppercase italic tracking-tighter">Nuova Sessione</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Default: Prossimo Lunedì</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Data Allenamento</label>
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-red-600/20" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <button key={p.id} onClick={() => togglePlayer(p.id)} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all text-left flex flex-col ${selectedIds.includes(p.id) ? 'bg-red-600 border-red-600 text-white shadow-lg transform scale-105' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'}`}>
              <span className="truncate">{p.name}</span>
              <span className={`text-[9px] font-black mt-1 uppercase tracking-widest ${selectedIds.includes(p.id) ? 'text-white/60' : 'text-slate-400'}`}>{p.gender} • {p.basePoints + p.matchPoints} PT</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => onStartSession(selectedIds, new Date(sessionDate).getTime())} disabled={selectedIds.length < 4} className="bg-slate-900 text-white px-16 py-5 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 shadow-2xl hover:bg-black transition-all">Inizia Allenamento ({selectedIds.length})</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter leading-tight">Sessione Attiva</h2>
          <p className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em]">{new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>
        <button onClick={() => onArchive(session.id)} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-black transition-all">Archivia Sessione</button>
      </div>
      <div className="space-y-12">
        {session.rounds.map((round) => {
          const conflicts = getConflicts(round);
          return (
            <div key={round.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="font-black italic uppercase tracking-widest text-sm">Round {round.roundNumber}</span>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase">{round.mode.replace('_', ' ')}</span>
                </div>
                {conflicts.size > 0 && (
                  <span className="bg-red-500 text-white text-[9px] px-3 py-1 rounded-full font-black animate-pulse flex items-center gap-2 border border-red-400 shadow-sm">
                    ⚠️ CONFLITTO GIOCATORI
                  </span>
                )}
                <button onClick={() => onDeleteRound(session.id, round.id)} className="text-white/40 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
              <div className="p-8 space-y-6">
                {round.matches.map(m => (
                  <div key={m.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 hover:bg-white transition-all hover:shadow-md group">
                    <div className="flex-1 grid grid-cols-2 gap-10 w-full">
                      {[1, 2].map(t => {
                        const teamIds = t === 1 ? m.team1.playerIds : m.team2.playerIds;
                        const oppScore = t === 1 ? m.team2.score : m.team1.score;
                        const teamScore = t === 1 ? m.team1.score : m.team2.score;
                        
                        return (
                          <div key={t} className={`space-y-4 ${t === 2 ? 'text-right' : ''}`}>
                            <div className={`flex justify-between items-center ${t === 2 ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Team {t} {m.status === 'COMPLETED' && renderStatusBadge(teamScore!, oppScore!)}
                              </span>
                              <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm">
                                {getTeamPoints(teamIds)} PT
                              </span>
                            </div>
                            <div className="space-y-2">
                              {teamIds.map((id, idx) => (
                                <div key={idx}>
                                  {m.status === 'PENDING' ? (
                                    <select 
                                      value={id} 
                                      onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, t as 1|2, idx as 0|1, e.target.value)} 
                                      className={`text-[12px] font-bold p-2 bg-white border rounded-xl outline-none w-full shadow-sm ${conflicts.has(id) ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-200 focus:border-red-600'}`}
                                    >
                                      <option value="">Scegli...</option>
                                      {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                  ) : (
                                    <button 
                                      onClick={() => onSelectPlayer(id)} 
                                      className={`text-[15px] font-black hover:text-red-600 truncate block w-full text-inherit ${t === 2 ? 'text-right' : 'text-left'} ${conflicts.has(id) ? 'text-red-600 underline decoration-red-500 decoration-2 underline-offset-4' : 'text-slate-800'}`}
                                    >
                                      {getPlayer(id)?.name || '???'}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      {m.status === 'COMPLETED' ? (
                        <div className="flex flex-col items-center">
                          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-3xl italic shadow-xl tracking-tighter border-2 border-white">{m.team1.score} - {m.team2.score}</div>
                          <button onClick={() => onReopenMatch(session.id, round.id, m.id)} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-600 mt-2 tracking-widest transition-colors">Modifica Risultato</button>
                        </div>
                      ) : (
                        <div className="flex gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                          <input type="number" placeholder="0" className="w-14 h-12 text-center font-black text-xl rounded-xl border-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 transition-all" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s1: e.target.value } }))} />
                          <span className="flex items-center text-slate-300 font-bold">-</span>
                          <input type="number" placeholder="0" className="w-14 h-12 text-center font-black text-xl rounded-xl border-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-600/20 transition-all" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s2: e.target.value } }))} />
                          <button 
                            onClick={() => { 
                              if (conflicts.size > 0) {
                                alert("Risolvi i conflitti di giocatori prima di salvare il risultato.");
                                return;
                              }
                              const sc = matchScores[m.id]; 
                              if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2)); 
                            }} 
                            className={`px-6 h-12 rounded-xl text-xs font-black uppercase shadow-md transition-all ${conflicts.size > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {round.restingPlayerIds.length > 0 && (
                  <div className={`p-5 rounded-2xl border-2 border-dashed flex flex-wrap gap-4 items-center ${conflicts.size > 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50/30 border-yellow-200'}`}>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${conflicts.size > 0 ? 'text-red-600' : 'text-yellow-700'}`}>Giocatori in Pausa:</span>
                    {round.restingPlayerIds.map((id, idx) => (
                      <select 
                        key={idx} 
                        value={id} 
                        onChange={(e) => onUpdateResting(session.id, round.id, idx, e.target.value)} 
                        className={`text-[11px] font-bold p-2 bg-white border rounded-xl outline-none shadow-sm ${conflicts.has(id) ? 'border-red-500 text-red-600 bg-red-50' : 'border-yellow-200 focus:border-yellow-500'}`}
                      >
                        {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div className="bg-white rounded-3xl p-10 border-4 border-dotted border-slate-200 flex flex-wrap justify-center gap-4">
          {Object.values(MatchmakingMode).filter(m => m !== 'CUSTOM').map(m => (
            <button key={m} onClick={() => onAddRound(session.id, m)} className="bg-slate-50 border border-slate-200 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:text-red-600 hover:border-red-500 transition-all hover:bg-red-50/50 shadow-sm">{m.replace('_', ' ')}</button>
          ))}
          <button onClick={() => onAddRound(session.id, MatchmakingMode.CUSTOM)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl">Aggiungi Manuale</button>
        </div>
      </div>
    </div>
  );
};

export default ActiveTraining;
