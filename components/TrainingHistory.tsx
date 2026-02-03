
import React, { useState, useRef } from 'react';
import { TrainingSession, Player, MatchmakingMode, Round } from '../types';
import * as XLSX from 'xlsx';

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

const IconPDF = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconExcel = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

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

  const exportHistoryJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `RMI_SessionsBackup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportToExcel = (session: TrainingSession) => {
    const data: any[][] = [];
    data.push(['Roundnet Milano - Training Report']);
    data.push(['Data', new Date(session.date)]);
    data.push(['Atleti presenti', session.participantIds.length]);
    data.push(['Round totali', session.rounds.length]);
    data.push([]);
    data.push(['Round', 'Giocatore 1 T1', 'Giocatore 2 T1', 'Giocatore 1 T2', 'Giocatore 2 T2', 'Punteggio T1', 'Punteggio T2', 'Modalità']);
    
    session.rounds.forEach(round => {
      round.matches.forEach(match => {
        data.push([
          round.roundNumber,
          getPlayer(match.team1.playerIds[0])?.name || '---',
          getPlayer(match.team1.playerIds[1])?.name || '---',
          getPlayer(match.team2.playerIds[0])?.name || '---',
          getPlayer(match.team2.playerIds[1])?.name || '---',
          match.status === 'COMPLETED' ? match.team1.score : '',
          match.status === 'COMPLETED' ? match.team2.score : '',
          round.mode.replace('_', ' ')
        ]);
      });
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Training Report');
    XLSX.writeFile(wb, `RMI_Report_${new Date(session.date).toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadPDF = (session: TrainingSession) => {
    if (!(window as any).html2pdf) {
      alert("Libreria PDF non caricata. Controlla la connessione internet.");
      return;
    }

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: sans-serif; padding: 40px; color: #334155;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #ef4444; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px; text-transform: uppercase; font-style: italic; font-weight: 900;">Roundnet Milano <span style="color: #ef4444;">Report</span></h1>
          <div style="text-align: right;">
            <div style="font-weight: 900; font-size: 14px;">${new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8;">Training Session Summary</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
          <div style="background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;">Atleti Partecipanti</div>
            <div style="font-size: 24px; font-weight: 900;">${session.participantIds.length}</div>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 15px; border: 1px solid #e2e8f0;">
            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;">Round Disputati</div>
            <div style="font-size: 24px; font-weight: 900;">${session.rounds.length}</div>
          </div>
        </div>

        ${session.rounds.map(r => `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #1e293b; color: white; padding: 8px 20px; border-radius: 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">
              Round ${r.roundNumber} - ${r.mode}
            </div>
            ${r.matches.map(m => {
              const s1 = m.status === 'COMPLETED' ? m.team1.score : '';
              const s2 = m.status === 'COMPLETED' ? m.team2.score : '';
              const separator = (s1 !== '' && s2 !== '') ? ' - ' : '';
              return `
                <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #f1f5f9;">
                  <div style="flex: 1; font-weight: 700;">${getPlayer(m.team1.playerIds[0])?.name || ''} / ${getPlayer(m.team1.playerIds[1])?.name || ''}</div>
                  <div style="background: #f1f5f9; padding: 5px 15px; border-radius: 8px; font-weight: 900; margin: 0 20px; min-width: 40px; text-align: center;">${s1}${separator}${s2}</div>
                  <div style="flex: 1; text-align: right; font-weight: 700;">${getPlayer(m.team2.playerIds[0])?.name || ''} / ${getPlayer(m.team2.playerIds[1])?.name || ''}</div>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}

        <div style="margin-top: 50px; text-align: center; font-size: 9px; color: #cbd5e1; text-transform: uppercase; font-weight: 700; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          Generated by Roundnet Milano Manager &copy; ${new Date().getFullYear()}
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `RMI_Report_${new Date(session.date).toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    (window as any).html2pdf().set(opt).from(element).save();
  };

  const handleOpenDatePicker = (sessionId: string) => {
    const input = dateInputRefs.current[sessionId];
    if (input) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          input.showPicker();
        } catch (e) {
          input.click();
        }
      } else {
        input.click();
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Archivio Allenamenti</h2>
        {isAdmin && (
          <button onClick={exportHistoryJSON} className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">Esporta Storico JSON</button>
        )}
        <div className="h-px w-full bg-slate-200 mt-2"></div>
      </div>

      {sessions.map(session => {
        const participants = players.filter(p => session.participantIds.includes(p.id)).sort((a,b) => a.name.localeCompare(b.name));
        return (
          <details key={session.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group mb-6">
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
              <div className="flex items-center gap-2">
                 <button onClick={(e) => { e.preventDefault(); handleDownloadPDF(session); }} className="text-slate-400 hover:text-red-600 p-2 transform hover:scale-110 transition-all" title="Scarica PDF"><IconPDF /></button>
                 <button onClick={(e) => { e.preventDefault(); exportToExcel(session); }} className="text-slate-400 hover:text-green-600 p-2 transform hover:scale-110 transition-all" title="Scarica Excel"><IconExcel /></button>
                 {isAdmin && <button onClick={(e) => { e.preventDefault(); onDeleteSession(session.id); }} className="text-slate-300 hover:text-red-600 p-2 transition-colors" title="Elimina Sessione"><IconTrash /></button>}
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-open:rotate-180 transition-transform ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </summary>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-10">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Allenamento del {new Date(session.date).toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                {isAdmin && (
                  <div className="relative">
                    <button onClick={() => handleOpenDatePicker(session.id)} className="bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-50 uppercase tracking-widest flex items-center gap-2">
                      <IconEdit /> Modifica Data
                    </button>
                    <input type="date" ref={el => { dateInputRefs.current[session.id] = el; }} className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none" onChange={(e) => e.target.value && onUpdateSessionDate(session.id, new Date(e.target.value).getTime())} />
                  </div>
                )}
              </div>

              {session.rounds.map(round => (
                <div key={round.id} className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm">Round {round.roundNumber} ({round.mode})</div>
                    {isAdmin && <button onClick={() => onDeleteRound(session.id, round.id)} className="text-red-400 hover:text-red-600 text-[9px] font-black uppercase">Elimina Round</button>}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {round.matches.map(m => (
                      <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                        <div className="flex-1 grid grid-cols-2 gap-10 w-full">
                          {[1, 2].map(t => {
                             const teamIds = t === 1 ? m.team1.playerIds : m.team2.playerIds;
                             const teamScore = t === 1 ? m.team1.score : m.team2.score;
                             const oppScore = t === 1 ? m.team2.score : m.team1.score;
                             return (
                              <div key={t} className={`space-y-3 ${t === 2 ? 'text-right' : ''}`}>
                                <div className={`flex justify-between items-center ${t === 2 ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">T{t} {(m.status === 'COMPLETED' && teamScore !== undefined && oppScore !== undefined) && renderStatusBadge(teamScore, oppScore)}</span>
                                  <span className="text-[9px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 shadow-sm">{getTeamPoints(teamIds)} PT</span>
                                </div>
                                <div className="space-y-2">
                                  {teamIds.map((id, idx) => {
                                    const player = getPlayer(id);
                                    const delta = m.individualDeltas?.[id];
                                    return (
                                      <div key={idx} className={`flex items-center gap-2 w-full ${t === 2 ? 'justify-end' : ''}`}>
                                        {isAdmin && m.status === 'PENDING' ? (
                                          <select value={id} onChange={(e) => onUpdatePlayers(session.id, round.id, m.id, t as 1|2, idx as 0|1, e.target.value)} className="text-[11px] font-bold p-1 bg-white border rounded-lg outline-none w-full">
                                            <option value="">Scegli...</option>
                                            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                          </select>
                                        ) : (
                                          <>
                                            <button onClick={() => onSelectPlayer(id)} className="text-[13px] font-black text-slate-800 hover:text-red-600 truncate transition-colors">
                                              {player?.name || '???'}
                                            </button>
                                            {(m.status === 'COMPLETED' && delta !== undefined) && <span className={`text-[9px] font-black italic px-1.5 py-0.5 rounded ${delta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</span>}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                             );
                          })}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {m.status === 'COMPLETED' ? (
                            <div className="flex flex-col items-center">
                              <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-2xl italic tracking-tighter shadow-xl border-2 border-white">{m.team1.score} - {m.team2.score}</div>
                              {isAdmin && <button onClick={() => onReopenMatch(session.id, round.id, m.id)} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 mt-2 tracking-widest flex items-center gap-1"><IconEdit /> Edit</button>}
                            </div>
                          ) : (
                            <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <input 
                                type="number" 
                                placeholder="0" 
                                className="w-10 h-10 text-center font-black text-lg rounded-lg border-none bg-white shadow-inner disabled:opacity-50" 
                                disabled={!isAdmin}
                                onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s1: e.target.value } }))} 
                              />
                              <span className="flex items-center text-slate-300">-</span>
                              <input 
                                type="number" 
                                placeholder="0" 
                                className="w-10 h-10 text-center font-black text-lg rounded-lg border-none bg-white shadow-inner disabled:opacity-50" 
                                disabled={!isAdmin}
                                onChange={e => setMatchScores(p => ({ ...p, [m.id]: { ...(p[m.id] || { s1: '', s2: '' }), s2: e.target.value } }))} 
                              />
                              {isAdmin && (
                                <button onClick={() => { const sc = matchScores[m.id]; if(sc?.s1 && sc?.s2) onUpdateScore(session.id, round.id, m.id, parseInt(sc.s1), parseInt(sc.s2)); }} className="bg-red-600 text-white px-4 h-10 rounded-lg text-[10px] font-black uppercase">OK</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        );
      })}
      
      {sessions.length === 0 && <div className="text-center py-24 bg-white rounded-3xl border-4 border-dotted border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest">Nessun allenamento archiviato.</div>}
    </div>
  );
};

export default TrainingHistory;
