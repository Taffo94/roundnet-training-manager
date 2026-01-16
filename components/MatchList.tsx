
import React, { useState } from 'react';
import { Match, Player } from '../types';

interface MatchListProps {
  matches: Match[];
  players: Player[];
  onCompleteMatch: (matchId: string, s1: number, s2: number) => void;
  onCancelMatch: (matchId: string) => void;
}

const MatchList: React.FC<MatchListProps> = ({ matches, players, onCompleteMatch, onCancelMatch }) => {
  const [scores, setScores] = useState<Record<string, { s1: string, s2: string }>>({});

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const handleScoreChange = (matchId: string, team: 's1' | 's2', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: { ... (prev[matchId] || { s1: '', s2: '' }), [team]: value }
    }));
  };

  const handleSave = (matchId: string) => {
    const score = scores[matchId];
    if (score && score.s1 !== '' && score.s2 !== '') {
      onCompleteMatch(matchId, parseInt(score.s1), parseInt(score.s2));
    } else {
      alert("Inserisci entrambi i punteggi!");
    }
  };

  if (matches.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-700 uppercase tracking-wider text-sm px-1">Partite in Corso</h3>
      <div className="grid grid-cols-1 gap-4">
        {matches.map(match => (
          <div key={match.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Team 1</div>
                <div className="font-semibold text-slate-800 truncate">{getPlayerName(match.team1.playerIds[0])}</div>
                <div className="font-semibold text-slate-800 truncate">{getPlayerName(match.team1.playerIds[1])}</div>
              </div>
              <div className="space-y-1 text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Team 2</div>
                <div className="font-semibold text-slate-800 truncate">{getPlayerName(match.team2.playerIds[0])}</div>
                <div className="font-semibold text-slate-800 truncate">{getPlayerName(match.team2.playerIds[1])}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <input
                type="number"
                placeholder="0"
                min="0"
                max="50"
                value={scores[match.id]?.s1 || ''}
                onChange={(e) => handleScoreChange(match.id, 's1', e.target.value)}
                className="w-12 h-10 text-center font-bold text-xl rounded border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-slate-300 font-bold">-</span>
              <input
                type="number"
                placeholder="0"
                min="0"
                max="50"
                value={scores[match.id]?.s2 || ''}
                onChange={(e) => handleScoreChange(match.id, 's2', e.target.value)}
                className="w-12 h-10 text-center font-bold text-xl rounded border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleSave(match.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
              >
                Salva Risultato
              </button>
              <button
                onClick={() => onCancelMatch(match.id)}
                className="text-slate-400 hover:text-red-500 transition-colors p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchList;
