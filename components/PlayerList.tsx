
import React, { useState } from 'react';
import { Player, Gender } from '../types';

interface PlayerListProps {
  players: Player[];
  onAddPlayer: (name: string, gender: Gender, points: number) => void;
  onUpdatePlayer: (id: string, name: string, gender: Gender, points: number) => void;
  onDeletePlayer: (id: string) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', gender: 'M' as Gender, points: 1200 });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameLower = formData.name.trim().toLowerCase();
    const exists = players.some(p => p.name.toLowerCase() === nameLower && p.id !== isEditing);
    
    if (!formData.name.trim()) {
      setError("Inserisci un nome.");
      return;
    }

    if (exists) {
      setError("Un atleta con questo nome esiste già!");
      return;
    }

    if (isEditing) {
      onUpdatePlayer(isEditing, formData.name.trim(), formData.gender, formData.points);
      setIsEditing(null);
    } else {
      onAddPlayer(formData.name.trim(), formData.gender, formData.points);
    }
    setFormData({ name: '', gender: 'M', points: 1200 });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita conflitti con eventuali click sulla riga
    onDeletePlayer(id);
  };

  const startEdit = (p: Player) => {
    setIsEditing(p.id);
    setError(null);
    setFormData({ name: p.name, gender: p.gender, points: p.points });
  };

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-50 border-b border-slate-200">
        <h2 className="font-black text-xl text-slate-800 uppercase italic mb-4">
          {isEditing ? 'Modifica Atleta' : 'Nuovo Atleta'}
        </h2>
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
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Punti</label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData(p => ({ ...p, points: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-black uppercase hover:bg-red-700 transition-colors shadow-md"
            >
              {isEditing ? 'Salva' : 'Aggiungi'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(null);
                  setFormData({ name: '', gender: 'M', points: 1200 });
                  setError(null);
                }}
                className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold uppercase hover:bg-slate-300"
              >
                Annulla
              </button>
            )}
          </div>
        </form>
        {error && <p className="mt-2 text-xs font-bold text-red-600 uppercase tracking-tighter italic">! {error}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">Atleta</th>
              <th className="px-6 py-3 text-center">Sesso</th>
              <th className="px-6 py-3 text-center">Punti</th>
              <th className="px-6 py-3 text-center">V / S</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPlayers.map((player, index) => (
              <tr key={player.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-black text-slate-300 italic">#{index + 1}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{player.name}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[10px] font-black px-2 py-1 rounded ${player.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                    {player.gender}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-black italic">
                    {player.points}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">
                  <span className="text-green-600">{player.wins}</span> / <span className="text-red-400">{player.losses}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => startEdit(player)} className="text-slate-300 hover:text-blue-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, player.id)} 
                      className="text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic text-sm">Nessun atleta registrato. Inizia aggiungendone uno sopra!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerList;
