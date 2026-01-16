
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
  onSelectPlayer: (id: string) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, players, onDeleteRound, onDeleteSession, onUpdateScore, onReopenMatch, onUpdatePlayers, onSelectPlayer 
}) => {
  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || '???';

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white flex items-center justify-center text-[7px] font-black">W</span>;
    if (teamScore < opponentScore) return <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[7px] font-black">L</span>;
    return <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px] font-black">T</span>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-8">Storico Allenamenti</h2>
      {sessions.map(session => (
        <details key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
          <summary className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none">
            <div className="flex items-center gap-4">
              <div className="bg-red-50 text-red-600 font-bold p-2 px-3 rounded-lg text-xs">
                {new Date(session.date).toLocaleDateString()}
              </div>
              <div className="font-bold text-slate-800 uppercase italic">{session.participantIds.length} Atleti • {session.rounds.length} Round</div>
            </div>
            <button onClick={(e) => { e.preventDefault(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 transition-colors p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </summary>
          <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-6">
            <div className="flex flex-wrap gap-2">
              {session.participantIds.map(id => (
                <button key={id} onClick={() => onSelectPlayer(id)} className="bg-white px-2 py-1 rounded text-xs border border-slate-200 font-medium text-slate-600 hover:text-red-600 hover:border-red-200">
                  {getPlayerName(id)}
                </button>
              ))}
            </div>
            {session.rounds.map(round => (
              <div key={round.id} className="space-y-3">
                <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100 w-fit">Round {round.roundNumber} ({round.mode})</div>
                <div className="grid grid-cols-1 gap-2">
                  {round.matches.map(m => (
                    <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-2 gap-4 text-xs font-bold">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1"><span className="text-[8px] text-slate-400">T1</span> {m.status === 'COMPLETED' && renderStatusBadge(m.team1.score!, m.team2.score!)}</div>
                          {m.team1.playerIds.map(id => <button key={id} onClick={() => onSelectPlayer(id)} className="block hover:text-red-600 truncate">{getPlayerName(id)}</button>)}
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="flex items-center gap-1 justify-end"><span className="text-[8px] text-slate-400">T2</span> {m.status === 'COMPLETED' && renderStatusBadge(m.team2.score!, m.team1.score!)}</div>
                          {m.team2.playerIds.map(id => <button key={id} onClick={() => onSelectPlayer(id)} className="block hover:text-red-600 truncate">{getPlayerName(id)}</button>)}
                        </div>
                      </div>
                      <div className="ml-4 font-black italic bg-slate-900 text-white px-3 py-1 rounded-lg text-sm">{m.team1.score} - {m.team2.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
};

export default TrainingHistory;
