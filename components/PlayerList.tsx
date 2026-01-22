
import React, { useState } from 'react';
import { Player, Gender } from '../types';

interface PlayerListProps {
  players: Player[];
  isAdmin: boolean;
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
    <span className={`pointer-events-none absolute ${position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 w-48 p-3 bg-slate-900 text-white text-[11px] font-medium leading-relaxed normal-case rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-[9999] shadow-2xl border border-white/10`}>
      {text}
      <span className={`absolute ${position === 'bottom' ? 'bottom-full border-b-slate-900' : 'top-full border-t-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></span>
    </span>
  </span>
);

const PlayerList: React.FC<PlayerListProps> = ({ players, isAdmin, onAddPlayer, onUpdatePlayer, onDeletePlayer, onSelectPlayer, onResetPoints, onRecalculate }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', gender: 'M' as Gender, basePoints: 0, matchPoints: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
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
    if (!isAdmin) return;
    setIsEditing(p.id);
    setError(null);
    setFormData({ name: p.name, gender: p.gender, basePoints: p.basePoints, matchPoints: p.matchPoints });
  };

  const sortedPlayers = [...players].sort((a, b) => (b.basePoints + b.matchPoints) - (a.basePoints + a.matchPoints));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-visible relative z-10">
      <div className="p-8 bg-slate-50 border-b border-slate-200 rounded-t-3xl flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="font-black text-2xl text-slate-800 uppercase italic tracking-tighter">
            {isEditing ? 'Modifica Atleta' : 'Classifica Atleti'}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Totale: {players.length} Atleti Registrati</p>
        </div>
        {isAdmin && !isEditing && (
          <div className="flex gap-3">
            <button 
              onClick={onRecalculate}
              className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
            >
              Ricalcola Ranking
            </button>
            <button 
              onClick={onResetPoints}
              className="bg-red-50 text-red-600 border border-red-100 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
            >
              Reset Punti
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="p-8 border-b border-slate-100 bg-white">
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome Atleta</label>
              <input
                type="text"
                placeholder="Inserisci nome..."
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 transition-all ${error ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:ring-red-600/10 focus:border-red-600'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Sesso</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value as Gender }))}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            <div className="w-28">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Punti Base</label>
              <input
                type="number"
                value={formData.basePoints}
                onChange={(e) => setFormData(p => ({ ...p, basePoints: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                {isEditing ? 'Salva' : 'Aggiungi'}
              </button>
              {isEditing && (
                <button type="button" onClick={() => setIsEditing(null)} className="bg-slate-100 text-slate-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Annulla</button>
              )}
            </div>
          </form>
          {error && <p className="text-red-500 text-[10px] font-black uppercase mt-3 tracking-widest">{error}</p>}
        </div>
      )}

      <div className="overflow-x-auto overflow-visible p-4">
        <table className="w-full text-left border-collapse overflow-visible">
          <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 rounded-tl-2xl tracking-widest">Rank</th>
              <th className="px-6 py-4 tracking-widest">Atleta</th>
              <th className="px-6 py-4 text-center tracking-widest">Sesso</th>
              {isAdmin && (
                <>
                  <th className="px-6 py-4 text-center tracking-widest">
                    Base
                    <InfoTooltip text="Punti assegnati manualmente in base al livello tecnico." position="bottom" />
                  </th>
                  <th className="px-6 py-4 text-center tracking-widest">
                    Match
                    <InfoTooltip text="Punti accumulati o persi tramite il sistema ELO (K=12)." position="bottom" />
                  </th>
                </>
              )}
              <th className="px-6 py-4 text-center text-red-600 font-black italic tracking-widest">
                Totale
                <InfoTooltip text="Punteggio finale che determina la posizione in classifica." position="bottom" />
              </th>
              <th className="px-6 py-4 text-center tracking-widest">V / S</th>
              {isAdmin && <th className="px-6 py-4 text-right rounded-tr-2xl tracking-widest">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-5 font-black text-slate-300 italic text-lg">#{index + 1}</td>
                <td className="px-6 py-5">
                  <button 
                    onClick={() => onSelectPlayer(player.id)}
                    className="font-black text-slate-800 hover:text-red-600 transition-all underline decoration-slate-100 underline-offset-8 decoration-2 hover:decoration-red-200"
                  >
                    {player.name}
                  </button>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${player.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>{player.gender}</span>
                </td>
                {isAdmin && (
                  <>
                    <td className="px-6 py-5 text-center font-bold text-slate-500">
                      {Math.round(player.basePoints)}
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-slate-500">
                      {Math.round(player.matchPoints) > 0 ? `+${Math.round(player.matchPoints)}` : Math.round(player.matchPoints)}
                    </td>
                  </>
                )}
                <td className="px-6 py-5 text-center">
                  <span className="bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-black italic shadow-sm">{Math.round(player.basePoints + player.matchPoints)}</span>
                </td>
                <td className="px-6 py-5 text-center text-xs font-black text-slate-400">
                  <span className="text-green-500">{player.wins}</span> / <span className="text-red-400">{player.losses}</span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-5 text-right">
                    <div className="flex gap-4 justify-end">
                      <button onClick={() => startEdit(player)} className="text-slate-300 hover:text-blue-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => onDeletePlayer(player.id)} className="text-slate-300 hover:text-red-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerList;
