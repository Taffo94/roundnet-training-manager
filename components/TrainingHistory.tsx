
import React, { useState, useRef } from 'react';
import { TrainingSession, Player, MatchmakingMode, Round } from '../types';

interface TrainingHistoryProps {
  sessions: TrainingSession[];
  players: Player[];
  isAdmin: boolean;
  onDeleteRound: (sid: string, rid: string) => void;
  onDeleteSession: (sid: string) => void;
  onUpdateScore: (sid: string, rid: string, mid: string, s1: number, s2: number) => void;
  onReopenMatch: (sid: string, rid: string, mid: string) => void;
  onUpdatePlayers: (sid: string, rid: string, mid: string, team: 1|2, index: 0|1, pid: string) => void;
  onUpdateResting: (sid: string, rid: string, index: number, pid: string) => void;
  onUpdateSessionDate: (sid: string, newDate: number) => void;
  onSelectPlayer: (id: string) => void;
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ 
  sessions, players, isAdmin, onDeleteRound, onDeleteSession, onUpdateScore, onReopenMatch, onUpdatePlayers, onUpdateResting, onUpdateSessionDate, onSelectPlayer 
}) => {
  const [matchScores, setMatchScores] = useState<Record<string, { s1: string, s2: string }>>({});
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getPlayer = (id: string) => players.find(p => p.id === id);

  const getTeamPoints = (ids: string[]) => {
    const total = ids.reduce((acc, id) => {
      const p = getPlayer(id);
      return acc + (p ? (p.basePoints + p.matchPoints) : 0);
    }, 0);
    return Math.round(total);
  };

  const renderStatusBadge = (teamScore: number, opponentScore: number) => {
    if (teamScore > opponentScore) return <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">W</span>;
    if (teamScore < opponentScore) return <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">L</span>;
    return <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm border border-white">T</span>;
  };

  const exportToExcel = (session: TrainingSession) => {
    const dateStr = new Date(session.date).toLocaleDateString();
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table>
          <tr><th colspan="5" style="font-size:18px;">Roundnet Milano - Report Allenamento</th></tr>
          <tr><th colspan="5">Data: ${dateStr}</th></tr>
          <tr><th colspan="5">Atleti: ${session.participantIds.length}</th></tr>
          <tr></tr>
          <tr style="background-color:#eeeeee;">
            <th>Round</th>
            <th>Team 1</th>
            <th>Team 2</th>
            <th>Punteggio</th>
            <th>Modalità</th>
          </tr>
    `;

    session.rounds.forEach(round => {
      round.matches.forEach(match => {
        const p1 = getPlayer(match.team1.playerIds[0])?.name || '---', p2 = getPlayer(match.team1.playerIds[1])?.name || '---';
        const p3 = getPlayer(match.team2.playerIds[0])?.name || '---', p4 = getPlayer(match.team2.playerIds[1])?.name || '---';
        html += `
          <tr>
            <td>Round ${round.roundNumber}</td>
            <td>${p1} / ${p2}</td>
            <td>${p3} / ${p4}</td>
            <td style="text-align:center;">${match.status === 'COMPLETED' ? `${match.team1.score}-${match.team2.score}` : '---'}</td>
            <td>${round.mode}</td>
          </tr>
        `;
      });
    });

    html += `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report_RMI_${new Date(session.date).toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const handleDownloadPDF = (sessionId: string) => {
    const element = document.getElementById(`pdf-content-${sessionId}`);
    if (!element || !(window as any).html2pdf) return;

    const opt = {
      margin: 10,
      filename: `Report_RMI_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    (window as any).html2pdf().set(opt).from(element).save();
  };

  const handleOpenDatePicker = (sessionId: string) => {
    const input = dateInputRefs.current[sessionId];
    if (input) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try { input.showPicker(); } catch (e) { input.click(); }
      } else { input.click(); }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Archivio Allenamenti</h2>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      {sessions.map(session => (
        <React.Fragment key={session.id}>
          {/* Layout Visivo per la WebApp */}
          <details id={`session-details-${session.id}`} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group mb-6">
            <summary className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 list-none transition-all">
              <div className="flex items-center gap-6">
                <div className="bg-red-600 text-white font-black p-4 px-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-lg italic text-center min-w-[100px]">
                  {new Date(session.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </div>
                <div>
                  <div className="font-black text-slate-800 uppercase italic tracking-tight">{session.participantIds.length} Atleti presenti</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{session.rounds.length} Round disputati</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); exportToExcel(session); }} className="text-slate-400 hover:text-green-600 p-2 transition-all transform hover:scale-110" title="Scarica Excel (.xls)">📊</button>
                 <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadPDF(session.id); }} className="text-slate-400 hover:text-red-600 p-2 transition-all transform hover:scale-110" title="Download Diretto PDF">📄</button>
                 {isAdmin && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 p-2">🗑️</button>}
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </summary>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-10">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Allenamento del {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                {isAdmin && (
                  <div className="relative">
                    <button onClick={() => handleOpenDatePicker(session.id)} className="bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-50 transition-all uppercase tracking-widest">✏️ Modifica Data</button>
                    <input type="date" ref={el => { dateInputRefs.current[session.id] = el; }} className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none" onChange={(e) => e.target.value && onUpdateSessionDate(session.id, new Date(e.target.value).getTime())} />
                  </div>
                )}
              </div>

              {session.rounds.map(round => (
                <div key={round.id} className="space-y-6">
                  <div className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm">Round {round.roundNumber} ({round.mode})</div>
                  <div className="grid grid-cols-1 gap-4">
                    {round.matches.map(m => (
                      <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-sm hover:shadow-md transition-all">
                        <div className="flex-1 grid grid-cols-2 gap-10 w-full">
                          {[1, 2].map(t => {
                             const teamIds = t === 1 ? m.team1.playerIds : m.team2.playerIds;
                             const teamScore = t === 1 ? m.team1.score : m.team2.score;
                             const oppScore = t === 1 ? m.team2.score : m.team1.score;
                             return (
                              <div key={t} className={`space-y-3 ${t === 2 ? 'text-right' : ''}`}>
                                <div className={`flex justify-between items-center ${t === 2 ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">T{t} {m.status === 'COMPLETED' && renderStatusBadge(teamScore!, oppScore!)}</span>
                                  <span className="text-[9px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shadow-sm">{getTeamPoints(teamIds)} PT</span>
                                </div>
                                <div className="space-y-2">
                                  {teamIds.map((id, idx) => {
                                    const player = getPlayer(id);
                                    const delta = m.individualDeltas?.[id];
                                    return (
                                      <div key={idx} className={`flex items-center gap-2 w-full ${t === 2 ? 'justify-end' : ''}`}>
                                        <button onClick={() => onSelectPlayer(id)} className="text-[13px] font-black text-slate-800 hover:text-red-600 truncate transition-colors">
                                          {player?.name || '???'}
                                        </button>
                                        {delta !== undefined && <span className={`text-[9px] font-black italic px-1.5 py-0.5 rounded ${delta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                             );
                          })}
                        </div>
                        <div className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black text-2xl italic tracking-tighter shadow-xl border-2 border-white">{m.team1.score} - {m.team2.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Layout NASCOSTO dedicato per l'EXPORT PDF (Ultra Compatto) */}
          <div id={`pdf-content-${session.id}`} className="fixed top-[-9999px] left-[-9999px] w-[210mm] bg-white text-slate-900 p-8">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4">
              <div>
                <h1 className="text-xl font-black uppercase italic tracking-tight">Report Allenamento</h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Roundnet Milano - {new Date(session.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-red-600 italic leading-none">RMI TRAINING</div>
                <div className="text-[8px] uppercase font-bold text-slate-400">{session.participantIds.length} Atleti • {session.rounds.length} Round</div>
              </div>
            </div>

            <div className="space-y-4">
              {session.rounds.map(round => (
                <div key={round.id} className="border border-slate-100 rounded-lg p-2 bg-slate-50/30">
                  <div className="bg-slate-800 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase mb-2 inline-block">Round {round.roundNumber} - {round.mode}</div>
                  <table className="w-full text-[10px]">
                    <thead className="text-[7px] text-slate-400 uppercase font-black text-left">
                      <tr>
                        <th className="pb-1">Team 1</th>
                        <th className="pb-1 text-center">Score</th>
                        <th className="pb-1 text-right">Team 2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {round.matches.map(m => {
                        const p1 = getPlayer(m.team1.playerIds[0])?.name || '---';
                        const p2 = getPlayer(m.team1.playerIds[1])?.name || '---';
                        const p3 = getPlayer(m.team2.playerIds[0])?.name || '---';
                        const p4 = getPlayer(m.team2.playerIds[1])?.name || '---';
                        return (
                          <tr key={m.id} className="py-1">
                            <td className="py-1.5 font-bold text-slate-800">{p1} / {p2}</td>
                            <td className="py-1.5 text-center"><span className="bg-slate-900 text-white px-2 py-0.5 rounded font-black italic">{m.team1.score} - {m.team2.score}</span></td>
                            <td className="py-1.5 text-right font-bold text-slate-800">{p3} / {p4}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[7px] font-bold text-slate-300 uppercase tracking-widest">
              Generato da RMI Manager - Documento Ufficiale Roundnet Milano
            </div>
          </div>
        </React.Fragment>
      ))}
      
      {sessions.length === 0 && <div className="text-center py-24 bg-white rounded-3xl border-4 border-dotted border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest">Nessun allenamento archiviato.</div>}
    </div>
  );
};

export default TrainingHistory;
