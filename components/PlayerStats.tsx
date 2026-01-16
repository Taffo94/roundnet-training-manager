
import React, { useMemo } from 'react';
import { Player, TrainingSession, Match } from '../types';

interface PlayerStatsProps {
  players: Player[];
  sessions: TrainingSession[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ players, sessions, selectedPlayerId, onSelectPlayer }) => {
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const stats = useMemo(() => {
    if (!selectedPlayerId) return null;

    const allMatches: { match: Match; sessionDate: number }[] = [];
    sessions.forEach(s => {
      s.rounds.forEach(r => {
        r.matches.forEach(m => {
          if (m.status === 'COMPLETED' && (m.team1.playerIds.includes(selectedPlayerId) || m.team2.playerIds.includes(selectedPlayerId))) {
            allMatches.push({ match: m, sessionDate: s.date });
          }
        });
      });
    });

    // Sort matches by date desc
    allMatches.sort((a, b) => b.sessionDate - a.sessionDate);

    const partnerStats: Record<string, { wins: number; total: number }> = {};
    const opponentStats: Record<string, { winsAgainst: number; totalAgainst: number }> = {};

    allMatches.forEach(({ match }) => {
      const isTeam1 = match.team1.playerIds.includes(selectedPlayerId);
      const myTeam = isTeam1 ? match.team1 : match.team2;
      const opponentTeam = isTeam1 ? match.team2 : match.team1;
      const won = (myTeam.score || 0) > (opponentTeam.score || 0);

      // Partners
      const partnerId = myTeam.playerIds.find(id => id !== selectedPlayerId);
      if (partnerId) {
        if (!partnerStats[partnerId]) partnerStats[partnerId] = { wins: 0, total: 0 };
        partnerStats[partnerId].total++;
        if (won) partnerStats[partnerId].wins++;
      }

      // Opponents
      opponentTeam.playerIds.forEach(oppId => {
        if (!opponentStats[oppId]) opponentStats[oppId] = { winsAgainst: 0, totalAgainst: 0 };
        opponentStats[oppId].totalAgainst++;
        if (won) opponentStats[oppId].winsAgainst++;
      });
    });

    const getBestPartner = () => {
      let best = { id: '', winRate: -1, total: 0 };
      Object.entries(partnerStats).forEach(([id, data]) => {
        const wr = data.wins / data.total;
        if (data.total >= 2 && (wr > best.winRate || (wr === best.winRate && data.total > best.total))) {
          best = { id, winRate: wr, total: data.total };
        }
      });
      return best.id ? { ...players.find(p => p.id === best.id), ...best } : null;
    };

    const getNemesis = () => {
      let worst = { id: '', lossRate: -1, total: 0 };
      Object.entries(opponentStats).forEach(([id, data]) => {
        const lr = (data.totalAgainst - data.winsAgainst) / data.totalAgainst;
        if (data.totalAgainst >= 2 && (lr > worst.lossRate || (lr === worst.lossRate && data.totalAgainst > worst.total))) {
          worst = { id, lossRate: lr, total: data.totalAgainst };
        }
      });
      return worst.id ? { ...players.find(p => p.id === worst.id), ...worst } : null;
    };

    const winRate = allMatches.length > 0 
      ? (allMatches.filter(({match}) => {
          const isT1 = match.team1.playerIds.includes(selectedPlayerId);
          return isT1 ? (match.team1.score! > match.team2.score!) : (match.team2.score! > match.team1.score!);
        }).length / allMatches.length * 100).toFixed(1)
      : "0";

    return {
      totalMatches: allMatches.length,
      winRate,
      recentMatches: allMatches.slice(0, 10),
      bestPartner: getBestPartner(),
      nemesis: getNemesis()
    };
  }, [selectedPlayerId, sessions, players]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Seleziona Atleta</label>
        <select 
          value={selectedPlayerId || ''} 
          onChange={(e) => onSelectPlayer(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-red-500 outline-none"
        >
          <option value="">Scegli un giocatore per vedere le sue stats...</option>
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {!selectedPlayer && (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Seleziona un atleta per iniziare</p>
        </div>
      )}

      {selectedPlayer && stats && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Win Rate</span>
              <span className="text-4xl font-black text-red-600 italic">{stats.winRate}%</span>
              <span className="block text-[10px] text-slate-400 mt-1">{stats.totalMatches} Partite Totali</span>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Compagno Ideale</span>
              {stats.bestPartner ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 font-black">🤝</div>
                  <div>
                    <div className="font-bold text-slate-800">{stats.bestPartner.name}</div>
                    <div className="text-[10px] text-slate-400">Win Rate: {(stats.bestPartner.winRate * 100).toFixed(0)}% ({stats.bestPartner.total} partite)</div>
                  </div>
                </div>
              ) : <span className="text-xs text-slate-400 italic">Dati insufficienti</span>}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">La tua Nemesi</span>
              {stats.nemesis ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-black">🔥</div>
                  <div>
                    <div className="font-bold text-slate-800">{stats.nemesis.name}</div>
                    <div className="text-[10px] text-slate-400">Loss Rate: {(stats.nemesis.lossRate * 100).toFixed(0)}% ({stats.nemesis.total} partite)</div>
                  </div>
                </div>
              ) : <span className="text-xs text-slate-400 italic">Dati insufficienti</span>}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-black text-slate-800 uppercase italic text-sm">Ultime 10 Partite</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.recentMatches.map(({ match, sessionDate }, idx) => {
                const isT1 = match.team1.playerIds.includes(selectedPlayerId!);
                const myTeam = isT1 ? match.team1 : match.team2;
                const oppTeam = isT1 ? match.team2 : match.team1;
                const won = myTeam.score! > oppTeam.score!;
                const tied = myTeam.score! === oppTeam.score!;

                return (
                  <div key={match.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                        tied ? 'bg-blue-100 text-blue-600' : won ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {tied ? 'T' : won ? 'W' : 'L'}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          con {players.find(p => p.id === myTeam.playerIds.find(id => id !== selectedPlayerId))?.name || '??'}
                        </div>
                        <div className="text-[10px] text-slate-400">vs {oppTeam.playerIds.map(id => players.find(p => p.id === id)?.name).join(' & ')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg italic text-slate-900">{myTeam.score} - {oppTeam.score}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(sessionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              {stats.recentMatches.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs italic">Nessuna partita registrata.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
