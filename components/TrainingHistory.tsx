
import React, { useState } from 'react';
import { TrainingSession, Player, MatchmakingMode, Round } from '../types';

interface TrainingHistoryProps {
  sessions: TrainingSession[];
  players: Player[];
  onDeleteRound: (sid: string, rid: string) => void;
  onDeleteSession: (sid: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onUpdateResting: (sid: string, rid: string, index: number, pid: string) => void;
  onUpdateSessionDate: (sid: string, newDate: number) => void;
  onSelectPlayer: (id: string) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, players, onDeleteRound, onDeleteSession, onUpdateScore, onReopenMatch, onUpdatePlayers, onUpdateResting, onUpdateSessionDate, onSelectPlayer 
}) => {
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  const getPlayer = (id: string) => players.find(p => p.id === id);

  const getTeamPoints = (ids: string[]) => {
    const total = ids.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p ? (p.basePoints + p.matchPoints) : 0);
    }, 0);
    return Math.round(total);
  };

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">W</span>;
    if (teamScore < opponentScore) return <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">L</span>;
    return <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">T</span>;
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Archivio Allenamenti</h2>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>
      {sessions.map(session => {
        const participants = players.filter(p => session.participantIds.includes(p.id)).sort((a,b) => a.name.localeCompare(b.name));
        return (
          <details key={session.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group">
            <summary className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none transition-all">
              <div className="flex items-center gap-6">
                <div className="bg-red-600 text-white font-black p-3 px-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg shadow-red-100 italic">
                  {new Date(session.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div>
                  <div className="font-black text-slate-800 uppercase italic tracking-tight">{session.participantIds.length} Atleti presenti</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{session.rounds.length} Round disputati</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={(e) => { e.preventDefault(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 p-2 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </summary>
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-10">
              <div className="flex justify-start items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Riepilogo Sessione:</span>
                 <div className="relative">
                    <button className="text-[10px] font-black text-red-600 hover:underline flex items-center gap-1">
                       ✏️ Modifica Data
                    </button>
                    <input 
                      type="date" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => {
                        if(e.target.value) onUpdateSessionDate(session.id, new Date(e.target.value).getTime());
                      }}
                    />
                 </div>
              </div>

              {session.rounds.map(round => {
                const conflicts = getConflicts(round);
                const isRoundLocked = round.matches.some(m => m.status === 'COMPLETED');
                return (
                  <div key={round.id} className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm">Round {round.roundNumber} ({round.mode.replace('_', ' ')})</div>
                      {conflicts.size > 0 && <span className="text-[9px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 animate-pulse uppercase tracking-widest">⚠️ Conflitto Giocatori</span>}
                      <button onClick={() => onDeleteRound(session.id, round.id)} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">Elimina Round</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {round.matches.map(m => (
                        <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex-1 grid grid-cols-2 gap-10 w-full">
                            {[1, 2].map(t => {
                               const teamIds = t === 1 ? m.team1.playerIds : m.team2.playerIds;
                               const teamScore = t === 1 ? m.team1.score : m.team2.score;
                               const oppScore = t === 1 ? m.team2.score : m.team1.score;
                               return (
                                <div key={t} className={`space-y-3 ${t === 2 ? 'text-right' : ''}`}>
                                  <div className={`flex justify-between items-center ${t === 2 ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      T{t} {m.status === 'COMPLETED' && renderStatusBadge(teamScore!, oppScore!)}
                                    </span>
                                    <span className="text-[9px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shadow-sm">{getTeamPoints(teamIds)} PT</span>
                                  </div>
                                  <div className="space-y-2">
                                    {teamIds.map((id, idx) => {
                                      const player = getPlayer(id);
                                      const delta = m.individualDeltas?.[id];
                                      return (
                                        <div key={idx} className="flex items-center gap-2">
                                          {m.status === 'PENDING' ? (
                                            <select value={id} onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, t as 1|2, idx as 0|1, e.target.value)} className={`text-[11px] font-bold p-1.5 w-full border rounded-xl outline-none shadow-sm ${conflicts.has(id) ? 'border-red-500 bg-red-50 text-red-600' : 'bg-white border-slate-200 focus:border-red-600'}`}>
                                              <option value="">Scegli...</option>
                                              {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                          ) : (
                                            <div className={`flex items-center gap-2 w-full ${t === 2 ? 'justify-end' : ''}`}>
                                              <button onClick={() => onSelectPlayer(id)} className={`text-[13px] font-black hover:text-red-600 truncate tracking-tight transition-colors ${t === 2 ? 'text-right order-2' : 'text-left'} ${conflicts.has(id) ? 'text-red-600 underline decoration-2 decoration-red-400 underline-offset-2' : 'text-slate-800'}`}>
                                                {player?.name || '???'}
                                              </button>
                                              {delta !== undefined && (
                                                <span className={`text-[9px] font-black italic px-1.5 py-0.5 rounded ${delta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                               );
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            {m.status === 'COMPLETED' ? (
                              <div className="flex flex-col items-center">
                                <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black text-2xl italic tracking-tighter shadow-xl border-2 border-white">{m.team1.score} - {m.team2.score}</div>
                                <button onClick={() => onReopenMatch(session.id, round.id, m.id)} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 mt-2 tracking-widest transition-colors">Modifica</button>
                              </div>
                            ) : (
                              <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner">
                                <input type="number" placeholder="0" className="w-12 h-10 text-center font-black text-sm rounded-lg border-none bg-white outline-none focus:ring-2 focus:ring-red-600/20" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s1: e.target.value } }))} />
                                <input type="number" placeholder="0" className="w-12 h-10 text-center font-black text-sm rounded-lg border-none bg-white outline-none focus:ring-2 focus:ring-red-600/20" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s2: e.target.value } }))} />
                                <button onClick={() => { 
                                  if (conflicts.size > 0) return alert("Risolvi i conflitti prima di salvare!");
                                  const sc = matchScores[m.id]; 
                                  if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2)); 
                                }} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-md transition-all ${conflicts.size > 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>OK</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
      {sessions.length === 0 && <div className="text-center py-24 bg-white rounded-3xl border-4 border-dotted border-slate-200 text-slate-400 font-black uppercase text-xs tracking-[0.3em]">Nessuna sessione archiviata nello storico.</div>}
    </div>
  );
};

export default TrainingHistory;
