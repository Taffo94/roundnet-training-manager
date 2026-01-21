
import React, { useState } from 'react';
import { Player, Gender } from '../types';

interface PlayerListProps {
  players: Player[];
  onAddPlayer: (name: string, gender: Gender, basePoints: number) => void;
  onUpdatePlayer: (id: string, name: string, gender: Gender, basePoints: number, matchPoints: number) => void;
  onDeletePlayer: (id: string) => void;
  onSelectPlayer: (id: string) => void;
  onResetPoints: () => void;
  onRecalculate: () => void;
}

const InfoTooltip = ({ text, position = 'bottom' }: { text: string, position?: 'top' | 'bottom' }) => (
  <span className="ml-1 cursor-help group relative inline-block">
    <span className="text-slate-400 font-bold bg-slate-100 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">?</span>
    <span className={`pointer-events-none absolute ${position === 'bottom' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white text-[10px] font-normal normal-case rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[999] shadow-2xl`}>
      {text}
      <span className={`absolute ${position === 'bottom' ? 'top-full border-t-slate-900' : 'bottom-full border-b-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></span>
    </span>
  </span>
);

const PlayerList: React.FC<PlayerListProps> = ({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer, onSelectPlayer, onResetPoints, onRecalculate }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', gender: 'M' as Gender, basePoints: 0, matchPoints: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const nameLower = formData.name.trim().toLowerCase();
    const exists = players.some(p => p.name.toLowerCase() === nameLower && p.id !== isEditing);
    if (!formData.name.trim()) { setError("Inserisci un nome."); return; }
    if (exists) { setError("Un atleta con questo nome esiste già!"); return; }

    if (isEditing) {
      onUpdatePlayer(isEditing, formData.name.trim(), formData.gender, formData.basePoints, formData.matchPoints);
      setIsEditing(null);
    } else {
      onAddPlayer(formData.name.trim(), formData.gender, formData.basePoints);
    }
    setFormData({ name: '', gender: 'M', basePoints: 0, matchPoints: 0 });
  };

  const startEdit = (p: Player) => {
    setIsEditing(p.id);
    setError(null);
    setFormData({ name: p.name, gender: p.gender, basePoints: p.basePoints, matchPoints: p.matchPoints });
  };

  const sortedPlayers = [...players].sort((a, b) => (b.basePoints + b.matchPoints) - (a.basePoints + a.matchPoints));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible relative z-10">
      <div className="p-6 bg-slate-50 border-b border-slate-200 rounded-t-xl flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="font-black text-xl text-slate-800 uppercase italic">
            {isEditing ? 'Modifica Atleta' : 'Classifica Atleti'}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Totale: {players.length} Atleti</p>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <button 
              onClick={onRecalculate}
              className="bg-slate-100 text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
            >
              Ricalcola Ranking
            </button>
            <button 
              onClick={onResetPoints}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              Reset Punti
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-b border-slate-100">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome</label>
            <input
              type="text"
              placeholder="Nome atleta..."
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-red-500'}`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sesso</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value as Gender }))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Punti Base</label>
            <input
              type="number"
              value={formData.basePoints}
              onChange={(e) => setFormData(p => ({ ...p, basePoints: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-black uppercase hover:bg-black transition-colors shadow-md">
              {isEditing ? 'Salva' : 'Aggiungi'}
            </button>
            {isEditing && (
              <button type="button" onClick={() => setIsEditing(null)} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold uppercase">Annulla</button>
            )}
          </div>
        </form>
        {error && <p className="text-red-500 text-[10px] font-bold uppercase mt-2">{error}</p>}
      </div>

      <div className="overflow-x-auto overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">Atleta</th>
              <th className="px-6 py-3 text-center">Sesso</th>
              <th className="px-6 py-3 text-center">
                Punti Base
                <InfoTooltip text="Punti iniziali assegnati in base al livello tecnico stimato." position="top" />
              </th>
              <th className="px-6 py-3 text-center">
                Match
                <InfoTooltip text="Punti accumulati o persi tramite logica Elo (K=12, Bonus Margin ≥ 7)." position="top" />
              </th>
              <th className="px-6 py-3 text-center text-red-600 font-black italic">
                Totale
                <InfoTooltip text="Somma di Punti Base e Match che determina la posizione in classifica." position="top" />
              </th>
              <th className="px-6 py-3 text-center">V / S</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-black text-slate-300 italic">#{index + 1}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onSelectPlayer(player.id)}
                    className="font-bold text-slate-900 hover:text-red-600 transition-colors underline decoration-slate-200 underline-offset-4"
                  >
                    {player.name}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[10px] font-black px-2 py-1 rounded ${player.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{player.gender}</span>
                </td>
                <td className="px-6 py-4 text-center font-medium text-slate-500">
                  {player.basePoints}
                </td>
                <td className="px-6 py-4 text-center font-medium text-slate-500">
                  {Math.round(player.matchPoints) > 0 ? `+${Math.round(player.matchPoints)}` : Math.round(player.matchPoints)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-black italic">{Math.round(player.basePoints + player.matchPoints)}</span>
                </td>
                <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">
                  <span className="text-green-600">{player.wins}</span> / <span className="text-red-400">{player.losses}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => startEdit(player)} className="text-slate-300 hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => onDeletePlayer(player.id)} className="text-slate-300 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerList;
