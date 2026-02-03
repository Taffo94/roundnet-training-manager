
import React, { useMemo } from 'react';
import { Player, TrainingSession, Match } from '../types';

interface PlayerStatsProps {
  players: Player[];
  sessions: TrainingSession[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string) => void;
}

const InfoTooltip = ({ text, position = 'bottom' }: { text: string, position?: 'top' | 'bottom' }) => (
  <span className="ml-1 cursor-help group relative inline-block">
    <span className="text-slate-400 font-bold bg-slate-100 rounded-full w-4 h-4 inline-flex items-center justify-center text-[10px]">?</span>
    <span className={`pointer-events-none absolute ${position === 'bottom' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-900 text-white text-[10px] font-normal normal-case rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-[100] shadow-2xl`}>
      {text}
      <span className={`absolute ${position === 'bottom' ? 'top-full border-t-slate-900' : 'bottom-full border-b-slate-900'} left-1/2 -translate-x-1/2 border-8 border-transparent`}></span>
    </span>
  </span>
);

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

    allMatches.sort((a, b) => b.sessionDate - a.sessionDate);

    const partnerStats: Record<string, { wins: number; total: number; losses: number }> = {};
    const opponentStats: Record<string, { wins: number; total: number; losses: number }> = {};

    allMatches.forEach(({ match }) => {
      const isTeam1 = match.team1.playerIds.includes(selectedPlayerId);
      const myTeam = isTeam1 ? match.team1 : match.team2;
      const opponentTeam = isTeam1 ? match.team2 : match.team1;
      const won = (myTeam.score || 0) > (opponentTeam.score || 0);
      const lost = (opponentTeam.score || 0) > (myTeam.score || 0);

      const partnerId = myTeam.playerIds.find(id => id !== selectedPlayerId);
      if (partnerId) {
        if (!partnerStats[partnerId]) partnerStats[partnerId] = { wins: 0, total: 0, losses: 0 };
        partnerStats[partnerId].total++;
        if (won) partnerStats[partnerId].wins++;
        if (lost) partnerStats[partnerId].losses++;
      }

      opponentTeam.playerIds.forEach(oppId => {
        if (!opponentStats[oppId]) opponentStats[oppId] = { wins: 0, total: 0, losses: 0 };
        opponentStats[oppId].total++;
        if (won) opponentStats[oppId].wins++; // Io ho vinto contro di lui
        if (lost) opponentStats[oppId].losses++; // Io ho perso contro di lui
      });
    });

    const findTop = (data: Record<string, any>, criteria: (id: string, d: any) => number) => {
      let topId = '';
      let topVal = -1;
      const entries = Object.entries(data).sort(([idA], [idB]) => {
         const nameA = players.find(p => p.id === idA)?.name || '';
         const nameB = players.find(p => p.id === idB)?.name || '';
         return nameA.localeCompare(nameB);
      });

      entries.forEach(([id, d]) => {
        const val = criteria(id, d);
        if (val > topVal) {
          topVal = val;
          topId = id;
        }
      });
      const player = players.find(p => p.id === topId);
      return player ? { ...player, ...data[topId], val: topVal } : null;
    };

    const totalWins = allMatches.filter(({match}) => {
      const isT1 = match.team1.playerIds.includes(selectedPlayerId);
      return isT1 ? (match.team1.score! > match.team2.score!) : (match.team2.score! > match.team1.score!);
    }).length;

    const winRate = allMatches.length > 0 ? ((totalWins / allMatches.length) * 100).toFixed(1) : "0";

    return {
      totalMatches: allMatches.length,
      winRate,
      recentMatches: allMatches.slice(0, 10),
      partners: {
        wins: findTop(partnerStats, (_, d) => d.wins),
        wr: findTop(partnerStats, (_, d) => d.wins / d.total),
        freq: findTop(partnerStats, (_, d) => d.total),
        worst: findTop(partnerStats, (_, d) => d.losses)
      },
      opponents: {
        losses: findTop(opponentStats, (_, d) => d.losses),
        lr: findTop(opponentStats, (_, d) => d.losses / d.total),
        freq: findTop(opponentStats, (_, d) => d.total),
        victim: findTop(opponentStats, (_, d) => d.wins)
      }
    };
  }, [selectedPlayerId, sessions, players]);

  const StatCard = ({ title, player, subtitle, icon, color, help }: { title: string, player: any, subtitle: string, icon: string, color: string, help: string }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-xl shadow-sm`}>{icon}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{title}</div>
          </div>
          <InfoTooltip text={help} position="top" />
        </div>
        {player ? (
          <div>
            <button 
              onClick={() => onSelectPlayer(player.id)}
              className="font-black text-slate-800 hover:text-red-600 transition-colors block mb-1 text-left"
            >
              {player.name}
            </button>
            <div className="text-[11px] font-bold text-slate-500 uppercase">{subtitle}</div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">Dati non disponibili</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Seleziona Atleta per l'Analisi</label>
        <select 
          value={selectedPlayerId || ''} 
          onChange={(e) => onSelectPlayer(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
        >
          <option value="">Scegli un giocatore...</option>
          {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && stats && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg viewBox="0 0 100 100" className="w-32 h-32 fill-white"><circle cx="50" cy="50" r="40"/></svg>
             </div>
             <div className="relative z-10 text-center md:text-left">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-1">{selectedPlayer.name}</h2>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-slate-400 justify-center md:justify-start">
                   <span>{selectedPlayer.gender === 'M' ? 'Uomo' : 'Donna'}</span>
                   <span>•</span>
                   <span>{Math.round(selectedPlayer.basePoints + selectedPlayer.matchPoints)} Punti Ranking</span>
                </div>
             </div>
             <div className="flex gap-12 text-center relative z-10">
                <div className="group relative">
                   <div className="text-4xl font-black italic text-red-500">{stats.winRate}%</div>
                   <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center">
                     Win Rate <InfoTooltip text="Percentuale di partite vinte su quelle totali disputate." position="top" />
                   </div>
                </div>
                <div>
                   <div className="text-4xl font-black italic">{stats.totalMatches}</div>
                   <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Partite</div>
                </div>
             </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest border-l-4 border-green-500 pl-3">Compagni di Squadra</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Compagno Vincente" player={stats.partners.wins} subtitle={`${stats.partners.wins?.wins || 0} Vittorie insieme`} icon="🤝" color="bg-green-50 text-green-600" help="Il giocatore con cui hai ottenuto il maggior numero assoluto di vittorie." />
              <StatCard title="Affinità Tecnica" player={stats.partners.wr} subtitle={`${((stats.partners.wr?.wins / stats.partners.wr?.total) * 100 || 0).toFixed(0)}% Win Rate`} icon="📈" color="bg-blue-50 text-blue-600" help="Il compagno con cui hai la percentuale di vittoria più alta (minimo 1 partita)." />
              <StatCard title="Partner Fedele" player={stats.partners.freq} subtitle={`${stats.partners.freq?.total || 0} Partite giocate`} icon="🔄" color="bg-slate-100 text-slate-600" help="Il giocatore con cui sei stato accoppiato più spesso." />
              <StatCard title="Compagno Sfortunato" player={stats.partners.worst} subtitle={`${stats.partners.worst?.losses || 0} Sconfitte insieme`} icon="📉" color="bg-red-50 text-red-400" help="Il partner con cui hai subito il maggior numero di sconfitte totali." />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest border-l-4 border-red-500 pl-3">Avversari & Rivali</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Bestia Nera" player={stats.opponents.losses} subtitle={`Ti ha battuto ${stats.opponents.losses?.losses || 0} volte`} icon="🔥" color="bg-red-50 text-red-600" help="L'avversario che ti ha inflitto il maggior numero di sconfitte." />
              <StatCard title="Incubo" player={stats.opponents.lr} subtitle={`${((stats.opponents.lr?.losses / stats.opponents.lr?.total) * 100 || 0).toFixed(0)}% Sconfitte`} icon="💀" color="bg-orange-50 text-orange-600" help="L'avversario contro cui hai la percentuale di sconfitta più alta." />
              <StatCard title="Rivale Storico" player={stats.opponents.freq} subtitle={`${stats.opponents.freq?.total || 0} Scontri diretti`} icon="⚔️" color="bg-slate-100 text-slate-600" help="L'avversario che hai affrontato più volte in assoluto." />
              <StatCard title="Vittima Preferita" player={stats.opponents.victim} subtitle={`Lo hai battuto ${stats.opponents.victim?.wins || 0} volte`} icon="🎯" color="bg-green-100 text-green-700" help="L'avversario contro cui hai ottenuto il maggior numero di vittorie in valore assoluto." />
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase italic text-sm">Cronologia Recente (Ultimi 10)</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.recentMatches.map(({ match, sessionDate }) => {
                const isT1 = match.team1.playerIds.includes(selectedPlayerId!);
                const myTeam = isT1 ? match.team1 : match.team2;
                const oppTeam = isT1 ? match.team2 : match.team1;
                const won = (myTeam.score || 0) > (oppTeam.score || 0);
                const tied = myTeam.score !== undefined && oppTeam.score !== undefined && myTeam.score === oppTeam.score;
                const partnerId = myTeam.playerIds.find(id => id !== selectedPlayerId);
                return (
                  <div key={match.id} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner ${tied ? 'bg-blue-100 text-blue-600' : won ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tied ? 'PAR' : won ? 'VIN' : 'PER'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Partner:</span>
                          <button onClick={() => onSelectPlayer(partnerId!)} className="text-sm font-bold text-slate-800 hover:text-red-600 transition-colors underline decoration-slate-200">
                            {players.find(p => p.id === partnerId)?.name}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">vs:</span>
                          <div className="flex gap-2">
                             {oppTeam.playerIds.map(id => (
                               <button key={id} onClick={() => onSelectPlayer(id)} className="text-[11px] font-medium text-slate-500 hover:text-red-600">
                                 {players.find(p => p.id === id)?.name}
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-2xl italic text-slate-900 tracking-tighter">{(myTeam.score !== undefined) ? myTeam.score : ''} - {(oppTeam.score !== undefined) ? oppTeam.score : ''}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {new Date(sessionDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {stats.recentMatches.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nessuna partita registrata.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {!selectedPlayer && (
        <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Seleziona un atleta per visualizzare il report completo</p>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
