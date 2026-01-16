
import React, { useState } from 'react';
import { Player, TrainingSession, MatchmakingMode } from '../types';

interface ActiveTrainingProps {
  session?: TrainingSession;
  players: Player[];
  onStartSession: (ids: string[]) => void;
  onAddRound: (sessionId: string, mode: MatchmakingMode) => void;
  onDeleteRound: (sessionId: string, roundId: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onArchive: (sessionId: string) => void;
}

const ActiveTraining: React.FC<ActiveTrainingProps> = ({ 
  session, players, onStartSession, onAddRound, onDeleteRound, onUpdateScore, onReopenMatch, onUpdatePlayers, onArchive 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getPlayer = (id: string) => players.find(p => p.id === id);
  const getPlayerName = (id: string) => getPlayer(id)?.name || 'Scegli...';
  
  const participants = session ? players.filter(p => session.participantIds.includes(p.id)) : [];

  const getTeamPoints = (ids: string[]) => {
    return ids.reduce((acc, id) => acc + (getPlayer(id)?.points || 0), 0);
  };

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 uppercase italic">Nuovo Allenamento</h2>
          <p className="text-slate-500">Chi c'è oggi in campo?</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex flex-col ${
                selectedIds.includes(p.id) ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-300'
              }`}
            >
              <span className="truncate">{p.name}</span>
              <span className={`text-[10px] mt-1 ${selectedIds.includes(p.id) ? 'text-white/60' : 'text-slate-400'}`}>
                {p.gender} • {p.points}pt
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => onStartSession(selectedIds)}
            disabled={selectedIds.length < 4}
            className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            Inizia ({selectedIds.length} Atleti)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Sessione Attiva</h2>
          <p className="text-sm text-slate-500">{new Date(session.date).toLocaleDateString()} • {session.participantIds.length} Atleti</p>
        </div>
        <button 
          onClick={() => {
            if(window.confirm("Terminare l'allenamento? Verrà salvato nello storico.")) {
               onArchive(session.id);
            }
          }}
          className="bg-slate-900 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all shadow-md"
        >
          Termina Sessione
        </button>
      </div>

      <div className="space-y-12">
        {session.rounds.map((round) => (
          <div key={round.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="font-black italic uppercase tracking-wider">Round {round.roundNumber}</span>
                <span className="text-[10px] font-bold bg-slate-700 px-3 py-1 rounded-full">{round.mode}</span>
              </div>
              <button 
                onClick={() => onDeleteRound(session.id, round.id)}
                className="text-white hover:text-red-400 p-1 bg-red-600/20 rounded transition-colors"
                title="Elimina Round"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {round.matches.map(match => (
                <div key={match.id} className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 grid grid-cols-2 gap-8 w-full">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team 1</p>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {getTeamPoints(match.team1.playerIds)} PT
                        </span>
                      </div>
                      {[0, 1].map(idx => (
                        <div key={idx}>
                          <select
                            value={match.team1.playerIds[idx]}
                            disabled={match.status === 'COMPLETED'}
                            onChange={(e) => onUpdatePlayers(session.id, round.id, match.id, 1, idx as 0|1, e.target.value)}
                            className="block w-full text-sm font-black bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none appearance-none disabled:bg-transparent disabled:border-transparent disabled:p-0"
                          >
                            <option value="">Scegli Atleta...</option>
                            {participants.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.points})</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 text-right">
                      <div className="flex justify-between items-center flex-row-reverse">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team 2</p>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {getTeamPoints(match.team2.playerIds)} PT
                        </span>
                      </div>
                      {[0, 1].map(idx => (
                        <div key={idx}>
                          <select
                            value={match.team2.playerIds[idx]}
                            disabled={match.status === 'COMPLETED'}
                            onChange={(e) => onUpdatePlayers(session.id, round.id, match.id, 2, idx as 0|1, e.target.value)}
                            className="block w-full text-sm font-black bg-white border border-slate-200 rounded-lg p-2 text-right focus:ring-2 focus:ring-red-500 outline-none appearance-none disabled:bg-transparent disabled:border-transparent disabled:p-0"
                          >
                            <option value="">Scegli Atleta...</option>
                            {participants.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.points})</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {match.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black text-2xl italic min-w-[100px] text-center shadow-lg">
                          {match.team1.score} : {match.team2.score}
                        </div>
                        <button 
                          onClick={() => onReopenMatch(session.id, round.id, match.id)}
                          className="bg-white text-slate-400 hover:text-red-600 border border-slate-200 p-2.5 rounded-lg shadow-sm transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-inner">
                        <input 
                          type="number" 
                          placeholder="0"
                          value={matchScores[match.id]?.s1 || ''}
                          onChange={e => setMatchScores(p => ({ ...p, [match.id]: { ...(p[match.id] || { s1: '', s2: '' }), s1: e.target.value } }))}
                          className="w-14 h-12 text-center font-black text-xl rounded-lg border-none focus:ring-2 focus:ring-red-500 outline-none bg-slate-50" 
                        />
                        <span className="font-black text-slate-300">:</span>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={matchScores[match.id]?.s2 || ''}
                          onChange={e => setMatchScores(p => ({ ...p, [match.id]: { ...(p[match.id] || { s1: '', s2: '' }), s2: e.target.value } }))}
                          className="w-14 h-12 text-center font-black text-xl rounded-lg border-none focus:ring-2 focus:ring-red-500 outline-none bg-slate-50" 
                        />
                        <button 
                          onClick={() => {
                            const sc = matchScores[match.id];
                            if (sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, match.id, parseInt(sc.s1), parseInt(sc.s2));
                          }}
                          disabled={!match.team1.playerIds[0] || !match.team1.playerIds[1] || !match.team2.playerIds[0] || !match.team2.playerIds[1]}
                          className="bg-red-600 text-white px-5 py-3 rounded-lg text-xs font-black uppercase hover:bg-red-700 transition-all shadow-md ml-2 disabled:opacity-30"
                        >
                          Salva
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {round.restingPlayerIds.length > 0 && (
                <div className="text-center py-3 px-6 bg-yellow-50 rounded-xl border border-yellow-100 flex items-center justify-center gap-3">
                  <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest bg-yellow-100 px-2 py-1 rounded">In Pausa</span>
                  <span className="text-xs text-yellow-800 font-bold italic">
                    {round.restingPlayerIds.map(id => getPlayerName(id)).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-slate-200 space-y-6">
          <div className="text-center">
            <h3 className="font-black text-slate-800 uppercase italic text-lg">Prossimo Round ({session.rounds.length + 1})</h3>
            <p className="text-sm text-slate-500">Quale algoritmo vuoi usare?</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { mode: MatchmakingMode.FULL_RANDOM, label: 'Full Random' },
              { mode: MatchmakingMode.SAME_LEVEL, label: 'Stesso Livello' },
              { mode: MatchmakingMode.BALANCED_PAIRS, label: 'Balanced Points' },
              { mode: MatchmakingMode.GENDER_BALANCED, label: 'Balanced Gender' },
              { mode: MatchmakingMode.CUSTOM, label: 'Manuale (Vuoto)' },
            ].map(opt => (
              <button 
                key={opt.mode}
                onClick={() => onAddRound(session.id, opt.mode)}
                className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-wider hover:border-red-500 hover:text-red-600 hover:bg-white transition-all shadow-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveTraining;
