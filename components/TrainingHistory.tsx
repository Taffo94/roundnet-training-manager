
import React from 'react';
import { TrainingSession, Player } from '../types';

interface TrainingHistoryProps {
  sessions: TrainingSession[];
  players: Player[];
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ sessions, players }) => {
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '???';

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-slate-400 italic">Ancora nessuna sessione conclusa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-8">Storico Allenamenti</h2>
      {sessions.map(session => (
        <details key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none">
            <div className="flex items-center gap-4">
              <div className="bg-red-50 text-red-600 font-bold p-2 rounded-lg text-xs">
                {new Date(session.date).toLocaleDateString()}
              </div>
              <div className="font-bold text-slate-800">
                {session.participantIds.length} partecipanti • {session.rounds.length} round
              </div>
            </div>
            <span className="text-slate-300 group-open:rotate-180 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </summary>
          <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase w-full">Partecipanti:</span>
              {session.participantIds.map(id => (
                <span key={id} className="bg-white px-2 py-1 rounded text-xs border border-slate-200 text-slate-600">
                  {getPlayerName(id)}
                </span>
              ))}
            </div>
            
            <div className="space-y-2">
               {session.rounds.map(round => (
                 <div key={round.id} className="text-xs space-y-1">
                   <div className="font-black text-slate-500 uppercase tracking-tighter">Round {round.roundNumber} ({round.mode})</div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     {round.matches.map(m => (
                       <div key={m.id} className="bg-white p-2 rounded border border-slate-200 flex justify-between">
                         <span className="truncate flex-1">
                           {getPlayerName(m.team1.playerIds[0])} + {getPlayerName(m.team1.playerIds[1])} vs {getPlayerName(m.team2.playerIds[0])} + {getPlayerName(m.team2.playerIds[1])}
                         </span>
                         <span className="font-mono font-bold bg-slate-100 px-2 rounded">{m.team1.score} - {m.team2.score}</span>
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
