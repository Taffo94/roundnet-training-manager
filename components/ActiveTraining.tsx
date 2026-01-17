
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

const ActiveTraining: React.FC<ActiveTrainingProps> = ({ 
  session, players, onStartSession, onAddRound, onDeleteRound, onUpdateScore, onReopenMatch, onUpdatePlayers, onUpdateResting, onArchive, onSelectPlayer 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const togglePlayer = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const participants = session ? players.filter(p => session.participantIds.includes(p.id)).sort((a,b) => a.name.localeCompare(b.name)) : [];

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
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 uppercase italic">Nuovo Allenamento</h2>
          <p className="text-slate-500">Seleziona i presenti e imposta la data.</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Sessione</label>
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-slate-800 outline-none" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <button key={p.id} onClick={() => togglePlayer(p.id)} className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex flex-col ${selectedIds.includes(p.id) ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'}`}>
              <span className="truncate">{p.name}</span>
              <span className={`text-[10px] mt-1 ${selectedIds.includes(p.id) ? 'text-white/60' : 'text-slate-400'}`}>{p.gender} • {p.basePoints + p.matchPoints}pt</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => onStartSession(selectedIds, new Date(sessionDate).getTime())} disabled={selectedIds.length < 4} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 shadow-xl">Inizia Allenamento ({selectedIds.length})</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div><h2 className="text-2xl font-black text-slate-800 uppercase italic">Sessione Attiva</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(session.date).toLocaleDateString()}</p></div>
        <button onClick={() => onArchive(session.id)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase shadow-md">Termina Sessione</button>
      </div>
      <div className="space-y-12">
        {session.rounds.map((round) => {
          const conflicts = getConflicts(round);
          return (
            <div key={round.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center">
                <span className="font-black italic uppercase tracking-wider">Round {round.roundNumber} ({round.mode})</span>
                {conflicts.size > 0 && (
                  <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                    ⚠️ CONFLITTO GIOCATORI DUPLICATI
                  </span>
                )}
                <button onClick={() => onDeleteRound(session.id, round.id)} className="text-white hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
              <div className="p-6 space-y-4">
                {round.matches.map(m => (
                  <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 grid grid-cols-2 gap-8 w-full">
                      {[1, 2].map(t => (
                        <div key={t} className={`space-y-3 ${t === 2 ? 'text-right' : ''}`}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team {t}</span>
                          {(t === 1 ? m.team1.playerIds : m.team2.playerIds).map((id, idx) => (
                            <div key={idx}>
                              {m.status === 'PENDING' ? (
                                <select 
                                  value={id} 
                                  onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, t as 1|2, idx as 0|1, e.target.value)} 
                                  className={`text-[11px] font-bold p-1 bg-white border rounded outline-none w-full ${conflicts.has(id) ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-200'}`}
                                >
                                  <option value="">Scegli...</option>
                                  {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              ) : (
                                <button 
                                  onClick={() => onSelectPlayer(id)} 
                                  className={`text-sm font-black hover:text-red-600 truncate block w-full text-inherit ${conflicts.has(id) ? 'text-red-600 underline decoration-red-500' : 'text-slate-800'}`}
                                >
                                  {getPlayer(id)?.name || '???'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {m.status === 'COMPLETED' ? (
                        <div className="flex flex-col items-center">
                          <div className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black text-2xl italic">{m.team1.score} - {m.team2.score}</div>
                          <button onClick={() => onReopenMatch(session.id, round.id, m.id)} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 mt-1">Modifica</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200">
                          <input type="number" placeholder="0" className="w-12 h-10 text-center font-black rounded border-none bg-slate-50" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s1: e.target.value } }))} />
                          <input type="number" placeholder="0" className="w-12 h-10 text-center font-black rounded border-none bg-slate-50" onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s2: e.target.value } }))} />
                          <button 
                            onClick={() => { 
                              if (conflicts.size > 0) {
                                alert("Attenzione: Ci sono giocatori duplicati in questo round! Risolvi i conflitti prima di salvare.");
                                return;
                              }
                              const sc = matchScores[m.id]; 
                              if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2)); 
                            }} 
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase shadow-sm ${conflicts.size > 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white'}`}
                          >
                            Ok
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {round.restingPlayerIds.length > 0 && (
                  <div className={`p-4 rounded-xl border flex flex-wrap gap-4 items-center ${conflicts.size > 0 ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${conflicts.size > 0 ? 'text-red-600' : 'text-yellow-600'}`}>In Pausa:</span>
                    {round.restingPlayerIds.map((id, idx) => (
                      <select 
                        key={idx} 
                        value={id} 
                        onChange={(e) => onUpdateResting(session.id, round.id, idx, e.target.value)} 
                        className={`text-[11px] font-bold p-1 bg-white border rounded outline-none ${conflicts.has(id) ? 'border-red-500 text-red-600' : 'border-yellow-200'}`}
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
        <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-200 flex flex-wrap justify-center gap-3">
          {Object.values(MatchmakingMode).filter(m => m !== 'CUSTOM').map(m => (
            <button key={m} onClick={() => onAddRound(session.id, m)} className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-wider hover:text-red-600 hover:border-red-500 transition-all">{m.replace('_', ' ')}</button>
          ))}
          <button onClick={() => onAddRound(session.id, MatchmakingMode.CUSTOM)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-black transition-all">Manuale</button>
        </div>
      </div>
    </div>
  );
};

export default ActiveTraining;
