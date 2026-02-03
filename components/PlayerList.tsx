
import React, { useState, useRef } from 'react';
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
  onExport?: () => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconDelete = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const IconHide = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconShow = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconSave = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;

const InfoTooltip = ({ text, position = 'bottom' }: { text: string, position?: 'top' | 'bottom' }) => (
  <span className="ml-1 cursor-help group relative inline-block align-middle">
    <span className="text-slate-400 font-bold bg-slate-100 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[8px]">?</span>
    <span className={`pointer-events-none absolute ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white text-[9px] font-normal normal-case rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-2xl text-center`}>
      {text}
      <span className={`absolute ${position === 'bottom' ? 'bottom-full border-b-slate-900 rotate-180' : 'top-full border-t-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></span>
    </span>
  </span>
);

const PlayerList: React.FC<PlayerListProps> = ({ 
  players, deltas, isAdmin, onAddPlayer, onUpdatePlayer, onDeletePlayer, onSelectPlayer, onResetPoints, onRecalculate, onToggleHidden, onExport, onImport 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{name: string, gender: Gender, basePoints: number, matchPoints: number} | null>(null);
  const [newPlayerData, setNewPlayerData] = useState({ name: '', gender: 'M' as Gender, basePoints: 1000 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ordinamento deterministico stabile: punti (desc) -> nome (asc)
  const deterministicSort = (a: Player, b: Player) => {
    const scoreA = a.basePoints + a.matchPoints;
    const scoreB = b.basePoints + b.matchPoints;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name);
  };

  const visiblePlayers = isAdmin 
    ? [...players].sort((a, b) => {
        if (a.isHidden && !b.isHidden) return 1;
        if (!a.isHidden && b.isHidden) return -1;
        return deterministicSort(a, b);
      })
    : [...players].filter(p => !p.isHidden).sort(deterministicSort);

  const handleStartEdit = (player: Player) => {
    setEditingId(player.id);
    setEditFormData({ name: player.name, gender: player.gender, basePoints: player.basePoints, matchPoints: player.matchPoints });
  };

  const handleSaveEdit = (id: string) => {
    if (editFormData) {
      onUpdatePlayer(id, editFormData.name, editFormData.gender, editFormData.basePoints, editFormData.matchPoints);
      setEditingId(null);
      setEditFormData(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="font-black text-2xl text-slate-800 uppercase italic tracking-tighter text-red-600">Classifica Atleti</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Classifica ufficiale Roundnet Milano</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={onRecalculate} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">Ricalcola Classifica</button>
            <button onClick={onExport} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Full Backup JSON</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Import</button>
            <input type="file" ref={fileInputRef} onChange={onImport} className="hidden" accept=".json" />
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="p-8 bg-white border-b border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Aggiungi Nuovo Atleta</h3>
          <form onSubmit={(e) => { e.preventDefault(); if(!newPlayerData.name) return; onAddPlayer(newPlayerData.name, newPlayerData.gender, newPlayerData.basePoints); setNewPlayerData({ name: '', gender: 'M', basePoints: 1000 }); }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Nome Cognome</label>
              <input type="text" placeholder="Es: Mario Rossi" value={newPlayerData.name} onChange={e => setNewPlayerData({...newPlayerData, name: e.target.value})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Sesso</label>
              <select value={newPlayerData.gender} onChange={e => setNewPlayerData({...newPlayerData, gender: e.target.value as Gender})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm h-[46px]">
                <option value="M">Uomo (M)</option>
                <option value="F">Donna (F)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase text-slate-400 px-1">Punti Base Iniziali</label>
              <input type="number" placeholder="1000" value={newPlayerData.basePoints} onChange={e => setNewPlayerData({...newPlayerData, basePoints: parseInt(e.target.value) || 0})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm" />
            </div>
            <div className="flex flex-col justify-end">
              <button type="submit" className="bg-red-600 text-white font-black uppercase text-[10px] tracking-widest h-[46px] rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100">Aggiungi Atleta</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Rank</th>
              <th className="px-6 py-4">Atleta</th>
              <th className="px-6 py-4 text-center">Sesso</th>
              {isAdmin && (
                <th className="px-6 py-4 text-center whitespace-nowrap">
                  Match Points <InfoTooltip text="Punti accumulati esclusivamente giocando partite durante gli allenamenti." />
                </th>
              )}
              <th className="px-6 py-4 text-center text-red-600 font-black italic whitespace-nowrap">
                Totale <InfoTooltip text="Somma tra Punti Base (fissi) e Match Points (dinamici)." />
              </th>
              <th className="px-6 py-4 text-center whitespace-nowrap">
                V / S <InfoTooltip text="Rapporto tra Vittorie e Sconfitte totali." />
              </th>
              {isAdmin && <th className="px-6 py-4 text-right">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visiblePlayers.map((player, index) => {
              const d = deltas[player.id];
              const isEditing = editingId === player.id;
              return (
                <tr key={player.id} className={`hover:bg-slate-50 transition-colors group ${player.isHidden ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-5 font-black text-slate-300 italic text-lg">#{index + 1}</td>
                  <td className="px-6 py-5">
                    {isEditing ? (
                      <input type="text" value={editFormData?.name} onChange={e => setEditFormData(prev => prev ? {...prev, name: e.target.value} : null)} className="p-2 border border-slate-200 rounded-lg font-bold text-sm w-full outline-none focus:border-red-500" />
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={() => onSelectPlayer(player.id)} className="font-black text-slate-800 hover:text-red-600 transition-all underline decoration-slate-100 underline-offset-8 decoration-2">{player.name}</button>
                        {d && d.rankChange !== 0 && !player.isHidden && (
                          <div className={`flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${d.rankChange > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <span>{d.rankChange > 0 ? '▲' : '▼'}</span>
                            <span>{Math.abs(d.rankChange)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {isEditing ? (
                      <select value={editFormData?.gender} onChange={e => setEditFormData(prev => prev ? {...prev, gender: e.target.value as Gender} : null)} className="p-2 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-red-500">
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${player.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{player.gender}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-5 text-center">
                      {isEditing ? (
                        <input type="number" value={editFormData?.matchPoints} onChange={e => setEditFormData(prev => prev ? {...prev, matchPoints: parseInt(e.target.value) || 0} : null)} className="p-1 border border-slate-200 rounded-lg font-bold text-xs w-20 text-center outline-none focus:border-red-500" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-600">{Math.round(player.matchPoints)}</span>
                          {d && d.points !== 0 && <span className={`text-[9px] font-black italic ${d.points > 0 ? 'text-green-500' : 'text-red-500'}`}>{d.points > 0 ? '+' : ''}{d.points.toFixed(1)}</span>}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-5 text-center">
                    {isEditing ? (
                      <input type="number" value={editFormData?.basePoints} onChange={e => setEditFormData(prev => prev ? {...prev, basePoints: parseInt(e.target.value) || 0} : null)} className="p-1 border border-slate-200 rounded-lg font-bold text-xs w-20 text-center outline-none focus:border-red-500" />
                    ) : (
                      <span className="bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-black italic shadow-sm">{Math.round(player.basePoints + player.matchPoints)}</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center text-xs font-black text-slate-400">
                    <span className="text-green-500">{player.wins}</span> / <span className="text-red-400">{player.losses}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {isEditing ? (
                          <button onClick={() => handleSaveEdit(player.id)} className="text-green-600 hover:text-green-800 p-2" title="Salva"><IconSave /></button>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(player)} className="text-slate-300 hover:text-blue-600 p-2" title="Modifica"><IconEdit /></button>
                            <button onClick={() => onToggleHidden(player.id)} className="text-slate-300 hover:text-slate-600 p-2" title={player.isHidden ? "Mostra" : "Nascondi"}>
                              {player.isHidden ? <IconShow /> : <IconHide />}
                            </button>
                            <button onClick={() => onDeletePlayer(player.id)} className="text-slate-300 hover:text-red-600 p-2" title="Elimina"><IconDelete /></button>
                          </>
                        )}
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
