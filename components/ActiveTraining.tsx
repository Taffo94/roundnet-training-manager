
import React, { useState } from 'react';
import { Player, TrainingSession, MatchmakingMode } from '../types';

interface ActiveTrainingProps {
  session?: TrainingSession;
  players: Player[];
  onStartSession: (ids: string[], date: number) => void;
  onAddRound: (sessionId: string, mode: MatchmakingMode) => void;
  onDeleteRound: (sessionId: string, roundId: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onArchive: (sessionId: string) => void;
  onSelectPlayer: (id: string) => void;
}

const ActiveTraining: React.FC<ActiveTrainingProps> = ({ 
  session, players, onStartSession, onAddRound, onDeleteRound, onUpdateScore, onReopenMatch, onUpdatePlayers, onArchive, onSelectPlayer 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || 'Scegli...';
  
  const participants = session ? players.filter(p => session.participantIds.includes(p.id)) : [];

  const getTeamPoints = (ids: string[]) => {
    return ids.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p ? (p.basePoints + p.matchPoints) : 0);
    }, 0);
  };

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px] font-black shadow-sm">W</span>;
    if (teamScore < opponentScore) return <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] font-black shadow-sm">L</span>;
    return <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-black shadow-sm">T</span>;
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 uppercase italic">Nuovo Allenamento</h2>
          <p className="text-slate-500">Chi c'è oggi in campo?</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex flex-col ${
                selectedIds.includes(p.id) ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span className={`text-[10px] mt-1 ${selectedIds.includes(p.id) ? 'text-white/60' : 'text-slate-400'}`}>
                {p.gender} • {p.basePoints + p.matchPoints}pt
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <button onClick={() => onStartSession(selectedIds, new Date(sessionDate).getTime())} disabled={selectedIds.length < 4} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30">Inizia Allenamento</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-black text-slate-800 uppercase italic">Sessione Attiva</h2>
        <button onClick={() => onArchive(session.id)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-md">Termina Sessione</button>
      </div>
      <div className="space-y-12">
        {session.rounds.map((round) => (
          <div key={round.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center">
              <span className="font-black italic uppercase tracking-wider">Round {round.roundNumber} ({round.mode})</span>
              <button onClick={() => onDeleteRound(session.id, round.id)} className="text-white hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              {round.matches.map(match => (
                <div key={match.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 grid grid-cols-2 gap-8 w-full">
                    {/* Team 1 */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">T1 {match.status === 'COMPLETED' && renderStatusBadge(match.team1.score!, match.team2.score!)}</span>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{getTeamPoints(match.team1.playerIds)} PT</span>
                      </div>
                      {match.team1.playerIds.map((id, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          {match.status === 'PENDING' ? (
                            <select 
                              value={id}
                              onChange={(e) => onUpdatePlayers(session.id, round.id, match.id, 1, idx as 0|1, e.target.value)}
                              className="text-[11px] font-bold p-1 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-red-500"
                            >
                              {participants.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          ) : (
                            <button onClick={() => onSelectPlayer(id)} className="text-sm font-black text-slate-800 hover:text-red-600 underline decoration-slate-200 underline-offset-2 transition-colors truncate text-left">{getPlayerName(id)}</button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Team 2 */}
                    <div className="space-y-3 text-right">
                      <div className="flex justify-between items-center flex-row-reverse">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 flex-row-reverse">T2 {match.status === 'COMPLETED' && renderStatusBadge(match.team2.score!, match.team1.score!)}</span>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{getTeamPoints(match.team2.playerIds)} PT</span>
                      </div>
                      {match.team2.playerIds.map((id, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          {match.status === 'PENDING' ? (
                            <select 
                              value={id}
                              onChange={(e) => onUpdatePlayers(session.id, round.id, match.id, 2, idx as 0|1, e.target.value)}
                              className="text-[11px] font-bold p-1 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-red-500"
                            >
                              {participants.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          ) : (
                            <button onClick={() => onSelectPlayer(id)} className="text-sm font-black text-slate-800 hover:text-red-600 underline decoration-slate-200 underline-offset-2 transition-colors truncate text-right">{getPlayerName(id)}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score & Controls */}
                  <div className="flex items-center gap-2">
                    {match.status === 'COMPLETED' ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black text-2xl italic shadow-lg">{match.team1.score} - {match.team2.score}</div>
                        <button onClick={() => onReopenMatch(session.id, round.id, match.id)} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 tracking-widest">Modifica</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200">
                        <input type="number" placeholder="0" className="w-12 h-10 text-center font-black rounded border-none bg-slate-50 outline-none" onChange={e => setMatchScores(p => ({ ...p, [match.id]: { ...(p[match.id] || { s1: '', s2: '' }), s1: e.target.value } }))} />
                        <input type="number" placeholder="0" className="w-12 h-10 text-center font-black rounded border-none bg-slate-50 outline-none" onChange={e => setMatchScores(p => ({ ...p, [match.id]: { ...(p[match.id] || { s1: '', s2: '' }), s2: e.target.value } }))} />
                        <button onClick={() => { const sc = matchScores[match.id]; if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, match.id, parseInt(sc.s1), parseInt(sc.s2)); }} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase">Salva</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {round.restingPlayerIds.length > 0 && (
                <div className="text-center py-2 bg-yellow-50 rounded-xl text-xs font-bold text-yellow-700">In Pausa: {round.restingPlayerIds.map(id => getPlayerName(id)).join(', ')}</div>
              )}
            </div>
          </div>
        ))}
        <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-200 flex flex-wrap justify-center gap-3">
          {Object.values(MatchmakingMode).map(m => (
            <button key={m} onClick={() => onAddRound(session.id, m)} className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-wider hover:text-red-600 hover:border-red-500 transition-all">{m.replace('_', ' ')}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveTraining;
