
import React, { useState } from 'react';
import { Player, Gender } from '../types';

interface PlayerListProps {
  players: Player[];
  deltas: Record<string, { points: number, rankChange: number }>;
  isAdmin: boolean;
  onAddPlayer: (name: string, gender: Gender, basePoints: number) => void;
  onUpdatePlayer: (id: string, name: string, gender: Gender, basePoints: number, matchPoints: number) => void;
  onDeletePlayer: (id: string) => void;
  onSelectPlayer: (id: string) => void;
  onResetPoints: () => void;
  onRecalculate: () => void;
  onToggleHidden: (id: string) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, deltas, isAdmin, onAddPlayer, onUpdatePlayer, onDeletePlayer, onSelectPlayer, onResetPoints, onRecalculate, onToggleHidden }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', gender: 'M' as Gender, basePoints: 0, matchPoints: 0 });
  
  // Filtra i giocatori in base al ruolo
  const visiblePlayers = isAdmin 
    ? [...players].sort((a, b) => {
        // Admin: giocatori nascosti vanno in fondo
        if (a.isHidden && !b.isHidden) return 1;
        if (!a.isHidden && b.isHidden) return -1;
        return (b.basePoints + b.matchPoints) - (a.basePoints + a.matchPoints);
      })
    : [...players].filter(p => !p.isHidden).sort((a, b) => (b.basePoints + b.matchPoints) - (a.basePoints + a.matchPoints));
  
  const sortedPlayers = visiblePlayers;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="font-black text-2xl text-slate-800 uppercase italic tracking-tighter">Classifica Atleti</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Stato aggiornato all'ultimo allenamento</p>
        </div>
        {isAdmin && (
          <button onClick={onRecalculate} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Ricalcola Ranking</button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Atleta</th>
              <th className="px-6 py-4 text-center">Sesso</th>
              <th className="px-6 py-4 text-center">Match Points</th>
              <th className="px-6 py-4 text-center text-red-600 font-black italic">Totale</th>
              <th className="px-6 py-4 text-center">V / S</th>
              {isAdmin && <th className="px-6 py-4 text-right">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedPlayers.map((player, index) => {
              const d = deltas[player.id];
              return (
                <tr key={player.id} className={`hover:bg-slate-50 transition-colors group ${player.isHidden ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-5 font-black text-slate-300 italic text-lg">#{index + 1}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => onSelectPlayer(player.id)} className="font-black text-slate-800 hover:text-red-600 transition-all underline decoration-slate-100 underline-offset-8 decoration-2">{player.name}</button>
                      {player.isHidden && isAdmin && (
                        <span className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-200 text-slate-500 uppercase">Nascosto</span>
                      )}
                      {d && d.rankChange !== 0 && !player.isHidden && (
                        <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${d.rankChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span>{d.rankChange > 0 ? '▲' : '▼'}</span>
                          <span>{Math.abs(d.rankChange)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${player.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{player.gender}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-600">{Math.round(player.matchPoints)}</span>
                      {d && d.points !== 0 && (
                        <span className={`text-[9px] font-black italic ${d.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {d.points > 0 ? '+' : ''}{d.points.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-black italic shadow-sm">{Math.round(player.basePoints + player.matchPoints)}</span>
                  </td>
                  <td className="px-6 py-5 text-center text-xs font-black text-slate-400">
                    <span className="text-green-500">{player.wins}</span> / <span className="text-red-400">{player.losses}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => onToggleHidden(player.id)} 
                          className={`transition-colors ${player.isHidden ? 'text-slate-400 hover:text-blue-600' : 'text-slate-300 hover:text-slate-600'}`}
                          title={player.isHidden ? 'Mostra giocatore' : 'Nascondi giocatore'}
                        >
                          {player.isHidden ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <button onClick={() => onDeletePlayer(player.id)} className="text-slate-300 hover:text-red-600 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerList;
