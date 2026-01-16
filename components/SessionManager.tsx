
import React, { useState } from 'react';
import { Player, MatchmakingMode } from '../types';

interface SessionManagerProps {
  players: Player[];
  onGenerate: (selectedIds: string[], mode: MatchmakingMode, count: number) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ players, onGenerate }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<MatchmakingMode>(MatchmakingMode.BALANCED_PAIRS);
  const [count, setCount] = useState(3);

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (selectedIds.length < 4) {
      alert("Seleziona almeno 4 giocatori per generare una partita!");
      return;
    }
    onGenerate(selectedIds, mode, count);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Nuovo Allenamento</h2>
        <p className="text-sm text-slate-500">Seleziona i presenti e scegli la modalità di generazione.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border rounded-lg border-slate-100">
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => togglePlayer(p.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left truncate ${
              selectedIds.includes(p.id) 
                ? 'bg-red-600 text-white shadow-md' 
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Modalità</label>
          <div className="space-y-2">
            {[
              { id: MatchmakingMode.FULL_RANDOM, label: 'Full Random', desc: 'Senza logica di livello' },
              { id: MatchmakingMode.SAME_LEVEL, label: 'Equilibrato Stesso Livello', desc: 'Forti vs Forti, Deboli vs Deboli' },
              { id: MatchmakingMode.BALANCED_PAIRS, label: 'Equilibrato High-Low', desc: 'Forte+Debole vs Media+Media' },
            ].map(m => (
              <label key={m.id} className={`flex items-start p-3 rounded-xl border cursor-pointer transition-all ${mode === m.id ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  className="mt-1 mr-3 text-red-600" 
                  name="mode" 
                  checked={mode === m.id} 
                  onChange={() => setMode(m.id)} 
                />
                <div>
                  <div className="font-bold text-sm text-slate-800">{m.label}</div>
                  <div className="text-xs text-slate-500">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Numero di Partite</label>
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={count} 
            onChange={e => setCount(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
          />
          <p className="text-xs text-slate-400">Suggerimento: Genera poche partite alla volta per ruotare meglio gli atleti.</p>
          
          <button
            onClick={handleGenerate}
            disabled={selectedIds.length < 4}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            Genera Partite
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
