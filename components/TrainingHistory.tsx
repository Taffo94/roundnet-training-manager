
import React, { useState } from 'react';
import { TrainingSession, Player } from '../types';

interface TrainingHistoryProps {
  sessions: TrainingSession[];
  players: Player[];
  onDeleteRound: (sid: string, rid: string) => void;
  onDeleteSession: (sid: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, players, onDeleteRound, onDeleteSession, onUpdateScore, onReopenMatch, onUpdatePlayers 
}) => {
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || '???';

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) {
      return <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white flex items-center justify-center text-[7px] font-black">W</span>;
    } else if (teamScore < opponentScore) {
      return <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[7px] font-black">L</span>;
    } else {
      return <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-black">T</span>;
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-slate-400 italic">Ancora nessuna sessione conclusa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-8">Storico Allenamenti</h2>
      {sessions.map(session => (
        <details key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none">
            <div className="flex items-center gap-4">
              <div className="bg-red-50 text-red-600 font-bold p-2 px-3 rounded-lg text-xs">
                {new Date(session.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              <div className="font-bold text-slate-800 uppercase italic tracking-tighter">
                {session.participantIds.length} Atleti • {session.rounds.length} Round
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  onDeleteSession(session.id);
                }}
                className="text-slate-300 hover:text-red-600 transition-colors p-1"
                title="Elimina intera sessione"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <span className="text-slate-300 group-open:rotate-180 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
          </summary>
          <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-8">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase w-full">Partecipanti:</span>
              {session.participantIds.map(id => (
                <span key={id} className="bg-white px-2 py-1 rounded text-xs border border-slate-200 font-medium text-slate-600">
                  {getPlayerName(id)}
                </span>
              ))}
            </div>
            
            <div className="space-y-6">
               {session.rounds.map(round => (
                 <div key={round.id} className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                       Round {round.roundNumber} ({round.mode})
                     </span>
                     <button 
                        onClick={() => onDeleteRound(session.id, round.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                   </div>
                   <div className="grid grid-cols-1 gap-3">
                     {round.matches.map(m => (
                       <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                         <div className="flex-1 grid grid-cols-2 gap-4 text-xs font-bold w-full">
                           <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-slate-400 uppercase">T1</span>
                                {m.status === 'COMPLETED' && renderStatusBadge(m.team1.score!, m.team2.score!)}
                              </div>
                              {[0, 1].map(idx => (
                                <select 
                                  key={idx}
                                  value={m.team1.playerIds[idx]} 
                                  disabled={m.status === 'COMPLETED'}
                                  onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, 1, idx as 0|1, e.target.value)}
                                  className="w-full bg-slate-50 border-none p-1 rounded disabled:bg-transparent disabled:p-0 appearance-none font-bold"
                                >
                                  {players.filter(p => session.participantIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              ))}
                           </div>
                           <div className="space-y-1 text-right">
                              <div className="flex items-center gap-1 flex-row-reverse">
                                <span className="text-[8px] text-slate-400 uppercase">T2</span>
                                {m.status === 'COMPLETED' && renderStatusBadge(m.team2.score!, m.team1.score!)}
                              </div>
                              {[0, 1].map(idx => (
                                <select 
                                  key={idx}
                                  value={m.team2.playerIds[idx]} 
                                  disabled={m.status === 'COMPLETED'}
                                  onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, 2, idx as 0|1, e.target.value)}
                                  className="w-full bg-slate-50 border-none p-1 rounded text-right disabled:bg-transparent disabled:p-0 appearance-none font-bold"
                                >
                                  {players.filter(p => session.participantIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              ))}
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2">
                           {m.status === 'COMPLETED' ? (
                             <>
                              <span className="font-black text-xl italic bg-slate-900 text-white px-4 py-1 rounded-lg shadow-md">
                                {m.team1.score} - {m.team2.score}
                              </span>
                              <button 
                                onClick={() => onReopenMatch(session.id, round.id, m.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                             </>
                           ) : (
                             <div className="flex gap-2">
                               <input 
                                  type="number" 
                                  placeholder="0"
                                  min="0"
                                  max="50"
                                  className="w-10 h-8 text-center font-bold bg-slate-100 rounded border-none focus:ring-2 focus:ring-red-500 outline-none"
                                  value={matchScores[m.id]?.s1 || ''}
                                  onChange={e => setMatchScores(p => ({...p, [m.id]: {...(p[m.id]||{s1:'',s2:''}), s1: e.target.value}}))}
                                />
                               <input 
                                  type="number" 
                                  placeholder="0"
                                  min="0"
                                  max="50"
                                  className="w-10 h-8 text-center font-bold bg-slate-100 rounded border-none focus:ring-2 focus:ring-red-500 outline-none"
                                  value={matchScores[m.id]?.s2 || ''}
                                  onChange={e => setMatchScores(p => ({...p, [m.id]: {...(p[m.id]||{s1:'',s2:''}), s2: e.target.value}}))}
                                />
                               <button 
                                onClick={() => {
                                  const sc = matchScores[m.id];
                                  if(sc?.s1 !== undefined && sc?.s2 !== undefined && sc?.s1 !== '' && sc?.s2 !== '') onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2));
                                }}
                                className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-green-700 transition-colors"
                               >OK</button>
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
};

export default TrainingHistory;
