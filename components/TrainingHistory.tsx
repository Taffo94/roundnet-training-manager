
import React, { useState } from 'react';
import { TrainingSession, Player, MatchmakingMode } from '../types';

interface TrainingHistoryProps {
  sessions: TrainingSession[];
  players: Player[];
  onDeleteRound: (sid: string, rid: string) => void;
  onDeleteSession: (sid: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onSelectPlayer: (id: string) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, players, onDeleteRound, onDeleteSession, onUpdateScore, onReopenMatch, onUpdatePlayers, onSelectPlayer 
}) => {
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || '???';

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white flex items-center justify-center text-[7px] font-black">W</span>;
    if (teamScore < opponentScore) return <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[7px] font-black">L</span>;
    return <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-black">T</span>;
  };

  const getTeamPoints = (ids: string[]) => {
    return ids.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p ? (p.basePoints + p.matchPoints) : 0);
    }, 0);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-8">Storico Allenamenti</h2>
      {sessions.map(session => {
        const participants = players.filter(p => session.participantIds.includes(p.id));
        
        return (
          <details key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
            <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none">
              <div className="flex items-center gap-4">
                <div className="bg-red-50 text-red-600 font-bold p-2 px-3 rounded-lg text-xs">
                  {new Date(session.date).toLocaleDateString()}
                </div>
                <div className="font-bold text-slate-800 uppercase italic">{session.participantIds.length} Atleti • {session.rounds.length} Round</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-300 uppercase opacity-0 group-open:opacity-100 transition-opacity">Espandi per Modificare</span>
                <button onClick={(e) => { e.preventDefault(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 transition-colors p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </summary>
            <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-8">
              <div className="flex flex-wrap gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase w-full mb-1">Partecipanti</span>
                {session.participantIds.map(id => (
                  <button key={id} onClick={() => onSelectPlayer(id)} className="bg-white px-2 py-1 rounded text-[10px] border border-slate-200 font-bold text-slate-600 hover:text-red-600 hover:border-red-200 shadow-sm">
                    {getPlayerName(id)}
                  </button>
                ))}
              </div>
              
              {session.rounds.map(round => (
                <div key={round.id} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200 w-fit">Round {round.roundNumber} ({round.mode})</div>
                    <button onClick={() => onDeleteRound(session.id, round.id)} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Elimina Round</button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {round.matches.map(m => (
                      <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                        <div className="flex-1 grid grid-cols-2 gap-6 w-full">
                          {/* Team 1 */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                               <span className="text-[8px] font-black text-slate-300 uppercase">T1 {m.status === 'COMPLETED' && renderStatusBadge(m.team1.score!, m.team2.score!)}</span>
                               <span className="text-[8px] font-black text-red-500">{getTeamPoints(m.team1.playerIds)} PT</span>
                            </div>
                            {m.team1.playerIds.map((id, idx) => (
                              <div key={idx}>
                                {m.status === 'PENDING' ? (
                                  <select 
                                    value={id}
                                    onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, 1, idx as 0|1, e.target.value)}
                                    className="text-[10px] font-bold p-1 w-full bg-slate-50 border border-slate-200 rounded outline-none"
                                  >
                                    {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                ) : (
                                  <button onClick={() => onSelectPlayer(id)} className="text-xs font-black text-slate-800 hover:text-red-600 transition-colors block truncate">{getPlayerName(id)}</button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Team 2 */}
                          <div className="space-y-2 text-right">
                            <div className="flex justify-between items-center flex-row-reverse">
                               <span className="text-[8px] font-black text-slate-300 uppercase flex-row-reverse">T2 {m.status === 'COMPLETED' && renderStatusBadge(m.team2.score!, m.team1.score!)}</span>
                               <span className="text-[8px] font-black text-red-500">{getTeamPoints(m.team2.playerIds)} PT</span>
                            </div>
                            {m.team2.playerIds.map((id, idx) => (
                              <div key={idx}>
                                {m.status === 'PENDING' ? (
                                  <select 
                                    value={id}
                                    onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, 2, idx as 0|1, e.target.value)}
                                    className="text-[10px] font-bold p-1 w-full bg-slate-50 border border-slate-200 rounded outline-none"
                                  >
                                    {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                ) : (
                                  <button onClick={() => onSelectPlayer(id)} className="text-xs font-black text-slate-800 hover:text-red-600 transition-colors block truncate">{getPlayerName(id)}</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          {m.status === 'COMPLETED' ? (
                            <div className="flex flex-col items-center">
                              <div className="bg-slate-900 text-white px-4 py-1.5 rounded-lg font-black text-lg italic">{m.team1.score} - {m.team2.score}</div>
                              <button onClick={() => onReopenMatch(session.id, round.id, m.id)} className="text-[8px] font-black uppercase text-slate-400 hover:text-red-600 mt-1">Modifica</button>
                            </div>
                          ) : (
                            <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                              <input type="number" placeholder="0" className="w-10 h-8 text-center font-black text-xs rounded border-none bg-white outline-none" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s1: e.target.value } }))} />
                              <input type="number" placeholder="0" className="w-10 h-8 text-center font-black text-xs rounded border-none bg-white outline-none" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s2: e.target.value } }))} />
                              <button onClick={() => { const sc = matchScores[m.id]; if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2)); }} className="bg-red-600 text-white px-3 py-1 rounded text-[9px] font-black uppercase">Ok</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
      {sessions.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-widest text-xs">Nessuna sessione archiviata.</div>
      )}
    </div>
  );
};

export default TrainingHistory;
