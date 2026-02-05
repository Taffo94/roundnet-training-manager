
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Player, RankingSettings, RankingModeParams, AppSnapshot, TrainingSession } from '../types';
import { createSnapshot, getSnapshots, getSnapshotContent } from '../services/storage';
import { calculateNewRatings } from '../services/matchmaking';

interface AdminSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  players: Player[];
  sessions: TrainingSession[];
  onRestoreSnapshot: (players: Player[], sessions: TrainingSession[], settings: AppSettings) => void;
  onRecalculateGlobal?: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, players, sessions, onRestoreSnapshot, onRecalculateGlobal }) => {
  const [snapshots, setSnapshots] = useState<Partial<AppSnapshot>[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupReason, setBackupReason] = useState('Aggiornamento parametri');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [draftRanking, setDraftRanking] = useState<RankingSettings>(JSON.parse(JSON.stringify(settings.ranking)));
  const [activeDraftTab, setActiveDraftTab] = useState<'classic' | 'proportional'>('classic');

  const [sandboxRanks, setSandboxRanks] = useState({ p1: 1000, p2: 1000, p3: 1000, p4: 1000 });
  const [sandboxScoreT1, setSandboxScoreT1] = useState(21);
  const [sandboxScoreT2, setSandboxScoreT2] = useState(15);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const data = await getSnapshots();
      setSnapshots(data);
    } catch (e) { console.error(e); }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await createSnapshot(players, sessions, settings, backupReason);
      await fetchSnapshots();
      setBackupReason('Aggiornamento parametri');
    } finally { setIsBackingUp(false); }
  };

  const handleRestore = async (id: string) => {
    try {
      const snap = await getSnapshotContent(id);
      if (snap) onRestoreSnapshot(snap.data.players, snap.data.sessions, snap.data.settings);
    } catch (e) { alert("Errore nel ripristino."); }
  };

  const updateDraftParam = (mode: 'classic' | 'proportional', key: keyof RankingModeParams, value: any) => {
    setDraftRanking(prev => ({ ...prev, [mode]: { ...prev[mode], [key]: value } }));
  };

  const isSettingsDirty = useMemo(() => JSON.stringify(draftRanking) !== JSON.stringify(settings.ranking), [draftRanking, settings.ranking]);

  const handleApplySettings = (recalculate: boolean) => {
    onUpdateSettings({ ...settings, ranking: draftRanking, lastUpdated: Date.now() });
    setShowConfirmModal(false);
    if (recalculate && onRecalculateGlobal) setTimeout(() => onRecalculateGlobal(), 500);
  };

  const sandboxResults = useMemo(() => {
    const p1: Player = { id: 'p1', name: 'A1', basePoints: sandboxRanks.p1, matchPoints: 0, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p2: Player = { id: 'p2', name: 'A2', basePoints: sandboxRanks.p2, matchPoints: 0, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p3: Player = { id: 'p3', name: 'A3', basePoints: sandboxRanks.p3, matchPoints: 0, wins: 0, losses: 0, gender: 'F', lastActive: 0 };
    const p4: Player = { id: 'p4', name: 'A4', basePoints: sandboxRanks.p4, matchPoints: 0, wins: 0, losses: 0, gender: 'F', lastActive: 0 };
    const classicRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'CLASSIC' });
    const proportionalRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'PROPORTIONAL' });
    return { classic: classicRes, proportional: proportionalRes };
  }, [sandboxRanks, sandboxScoreT1, sandboxScoreT2, draftRanking]);

  const currentModeResults = draftRanking.mode === 'CLASSIC' ? sandboxResults.classic : sandboxResults.proportional;
  const lastUpdatedStr = settings.lastUpdated ? new Date(settings.lastUpdated).toLocaleString() : 'Mai';

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      
      {/* SNAPSHOTS */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Data Integrity</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Backup completi (Atleti, Match e Ranking)</p>
           </div>
           <div className="flex gap-4">
              <input type="text" placeholder="Motivo backup..." value={backupReason} onChange={e => setBackupReason(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold w-48" />
              <button onClick={handleBackup} disabled={isBackingUp} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">Snapshot</button>
           </div>
        </div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {snapshots.map(s => (
            <div key={s.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between group">
               <div>
                  <div className="text-[8px] font-black text-slate-400 uppercase mb-1">{new Date(s.created_at!).toLocaleString()}</div>
                  <div className="text-sm font-black text-slate-800 uppercase italic mb-4 leading-tight">{s.reason}</div>
               </div>
               <button onClick={() => handleRestore(s.id!)} className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-500 group-hover:bg-red-600 group-hover:text-white transition-all">Restore</button>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE DASHBOARD */}
      <section className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden ring-4 ring-slate-200">
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Motore Attivo</h3>
              </div>
              <div>
                <div className="text-4xl font-black italic uppercase tracking-tighter text-red-500">{settings.ranking.mode}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Ultimo salvataggio: <span className="text-white">{lastUpdatedStr}</span></div>
              </div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
              <div><div className="text-[8px] font-black text-slate-500 uppercase mb-1">K-Base</div><div className="text-xl font-black">{settings.ranking.mode === 'CLASSIC' ? settings.ranking.classic.kBase : settings.ranking.proportional.kBase}</div></div>
              <div><div className="text-[8px] font-black text-slate-500 uppercase mb-1">Bonus Factor</div><div className="text-xl font-black">{settings.ranking.mode === 'CLASSIC' ? settings.ranking.classic.bonusFactor : settings.ranking.proportional.bonusFactor}x</div></div>
              <div><div className="text-[8px] font-black text-slate-500 uppercase mb-1">Threshold / Margin</div><div className="text-xl font-black">{settings.ranking.mode === 'CLASSIC' ? settings.ranking.classic.classicBonusMargin : settings.ranking.proportional.maxPossibleMargin}</div></div>
           </div>
        </div>
      </section>

      {/* EDITOR & SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         <section className="lg:col-span-5 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-8 bg-slate-100 border-b border-slate-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-sm uppercase italic tracking-widest text-slate-800">Parametri Draft</h3>
                  <div className={`text-[8px] font-black px-2 py-1 rounded ${isSettingsDirty ? 'bg-red-600 text-white' : 'bg-slate-300'}`}>{isSettingsDirty ? 'UNSAVED' : 'SYNCED'}</div>
               </div>
               <div className="flex bg-slate-200 p-1 rounded-xl">
                  <button onClick={() => setActiveDraftTab('classic')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${activeDraftTab === 'classic' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>Classic</button>
                  <button onClick={() => setActiveDraftTab('proportional')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${activeDraftTab === 'proportional' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>Proportional</button>
               </div>
            </div>
            <div className="p-8 space-y-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">K-Base <span>{draftRanking[activeDraftTab].kBase}</span></label>
                     <input type="range" min="4" max="40" value={draftRanking[activeDraftTab].kBase} onChange={e => updateDraftParam(activeDraftTab, 'kBase', parseInt(e.target.value))} className="w-full accent-red-600" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Bonus Factor <span>{draftRanking[activeDraftTab].bonusFactor}x</span></label>
                     <input type="range" min="1" max="2.5" step="0.05" value={draftRanking[activeDraftTab].bonusFactor} onChange={e => updateDraftParam(activeDraftTab, 'bonusFactor', parseFloat(e.target.value))} className="w-full accent-red-600" />
                  </div>
                  {activeDraftTab === 'classic' ? (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Margin Threshold <span>{draftRanking.classic.classicBonusMargin}</span></label>
                        <input type="range" min="3" max="15" value={draftRanking.classic.classicBonusMargin} onChange={e => updateDraftParam('classic', 'classicBonusMargin', parseInt(e.target.value))} className="w-full accent-slate-800" />
                     </div>
                  ) : (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">Saturation Margin <span>{draftRanking.proportional.maxPossibleMargin}</span></label>
                        <input type="range" min="10" max="30" value={draftRanking.proportional.maxPossibleMargin} onChange={e => updateDraftParam('proportional', 'maxPossibleMargin', parseInt(e.target.value))} className="w-full accent-red-600" />
                     </div>
                  )}
               </div>
               <div className="pt-6 border-t border-slate-100">
                  <div className="flex gap-2">
                     <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'CLASSIC' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase ${draftRanking.mode === 'CLASSIC' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>CLASSIC</button>
                     <button onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'PROPORTIONAL' }))} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>PROPORTIONAL</button>
                  </div>
               </div>
               {isSettingsDirty && <button onClick={() => setShowConfirmModal(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] animate-pulse">Applica Modifiche</button>}
            </div>
         </section>

         <section className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-10">
            <div><h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.3em] border-l-4 border-red-600 pl-4 mb-2">Simulatore Ranking</h3></div>
            <div className="grid grid-cols-2 gap-10">
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-xl"><span className="text-[10px] font-black uppercase text-slate-500">Team 1</span><input type="number" value={sandboxScoreT1} onChange={e => setSandboxScoreT1(parseInt(e.target.value) || 0)} className="w-12 p-1 bg-white rounded font-black text-xs text-center" /></div>
                  <div className="space-y-3">
                     <input type="number" value={sandboxRanks.p1} onChange={e => setSandboxRanks(p => ({...p, p1: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border rounded-lg font-black text-xs" />
                     <input type="number" value={sandboxRanks.p2} onChange={e => setSandboxRanks(p => ({...p, p2: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border rounded-lg font-black text-xs" />
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-xl"><span className="text-[10px] font-black uppercase text-slate-500">Team 2</span><input type="number" value={sandboxScoreT2} onChange={e => setSandboxScoreT2(parseInt(e.target.value) || 0)} className="w-12 p-1 bg-white rounded font-black text-xs text-center" /></div>
                  <div className="space-y-3">
                     <input type="number" value={sandboxRanks.p3} onChange={e => setSandboxRanks(p => ({...p, p3: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border rounded-lg font-black text-xs text-right" />
                     <input type="number" value={sandboxRanks.p4} onChange={e => setSandboxRanks(p => ({...p, p4: parseInt(e.target.value) || 0}))} className="w-full p-2 bg-slate-50 border rounded-lg font-black text-xs text-right" />
                  </div>
               </div>
            </div>
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 space-y-6">
               <div className="flex justify-between items-center"><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BREAKDOWN {draftRanking.mode}</div><div className="text-[10px] font-black text-red-600">K-Effettivo: {currentModeResults.kUsed.toFixed(2)}</div></div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                     {['p1', 'p2'].map(pid => (
                        <div key={pid} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm">
                           <div><div className="text-[8px] font-black text-slate-400 uppercase">Atleta {pid === 'p1' ? '1' : '2'}</div><div className="text-sm font-black text-slate-800 italic">{(sandboxRanks as any)[pid]} PT</div></div>
                           <div className={`text-xl font-black italic ${currentModeResults.individualDeltas[pid] >= 0 ? 'text-green-500' : 'text-red-500'}`}>{(currentModeResults.individualDeltas[pid] >= 0 ? '+' : '') + currentModeResults.individualDeltas[pid].toFixed(3)}</div>
                        </div>
                     ))}
                  </div>
                  <div className="space-y-4">
                     {['p3', 'p4'].map(pid => (
                        <div key={pid} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm">
                           <div className={`text-xl font-black italic ${currentModeResults.individualDeltas[pid] >= 0 ? 'text-green-500' : 'text-red-500'}`}>{(currentModeResults.individualDeltas[pid] >= 0 ? '+' : '') + currentModeResults.individualDeltas[pid].toFixed(3)}</div>
                           <div className="text-right"><div className="text-[8px] font-black text-slate-400 uppercase">Atleta {pid === 'p3' ? '3' : '4'}</div><div className="text-sm font-black text-slate-800 italic">{(sandboxRanks as any)[pid]} PT</div></div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </section>
      </div>

      {/* DOCUMENTAZIONE TECNICA */}
      <section className="bg-white rounded-[3rem] shadow-xl border border-slate-200 p-12 space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Guida Tecnica ai Parametri</h2>
          <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">Capire come il sistema calcola la variazione di punti</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Formula Base ELO */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase border-b-2 border-slate-100 pb-4">1. La Formula ELO Individuale</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Il sistema non assegna punti uguali alla squadra, ma calcola il delta per <b>ogni singolo atleta</b> basandosi sulla probabilità di vittoria (Expected Score).
            </p>
            <div className="bg-slate-50 p-6 rounded-3xl font-mono text-[10px] space-y-4 border border-slate-100">
              <div>
                <span className="text-red-600 font-bold">E = 1 / (1 + 10^((AvgOpp - MyElo) / 400))</span>
                <p className="text-slate-400 mt-1 italic">// E: Probabilità di vittoria (da 0 a 1)</p>
              </div>
              <div>
                <span className="text-slate-800 font-black">Delta = K * (Risultato - E)</span>
                <p className="text-slate-400 mt-1 italic">// Risultato: 1 se vince, 0 se perde</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              *Nota: Se un giocatore forte vince contro uno debole, riceve pochi punti (E è alto). Se perde, ne perde molti.
            </p>
          </div>

          {/* Calcolo K-Effettivo */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase border-b-2 border-slate-100 pb-4">2. Calcolo del K-Effettivo</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Il valore <b>K</b> determina quanto è "aggressiva" la variazione. RMI usa due algoritmi per premiare la qualità della vittoria (scarto punti).
            </p>
            
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl">
                <div className="text-[10px] font-black text-red-500 mb-2 uppercase">CLASSIC MODE</div>
                <div className="text-[11px] font-mono leading-relaxed">
                  Se Scarto &ge; Margin: <br/>
                  <span className="text-green-400">K = kBase * bonusFactor</span> <br/>
                  Altrimenti: <span className="text-slate-400">K = kBase</span>
                </div>
                <p className="text-[8px] text-slate-500 mt-2">Funzione a gradino: il premio scatta solo oltre la soglia.</p>
              </div>

              <div className="bg-red-600 text-white p-5 rounded-2xl shadow-xl">
                <div className="text-[10px] font-black text-white/60 mb-2 uppercase">PROPORTIONAL MODE</div>
                <div className="text-[11px] font-mono leading-relaxed">
                  Ratio = Min(Scarto / Saturation, 1) <br/>
                  <span className="text-white font-bold">K = kBase * (1 + Ratio * (bonusFactor - 1))</span>
                </div>
                <p className="text-[8px] text-white/60 mt-2">Funzione lineare: ogni punto di scarto aumenta progressivamente il K.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-8 rounded-[2rem] border border-dashed border-slate-200">
           <div className="flex items-center gap-4 mb-4">
              <span className="text-2xl">💡</span>
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">Perché i punti non tornano?</h5>
           </div>
           <ul className="text-xs text-slate-500 space-y-2 list-disc pl-5">
              <li><b>Asimmetria:</b> Se un atleta da 2000 PT gioca con uno da 1000 PT contro due da 1500 PT, il giocatore da 2000 riceverà meno punti in caso di vittoria (perché era "atteso" che vincesse) rispetto al suo compagno da 1000.</li>
              <li><b>Somma non zero:</b> Poiché il calcolo è individuale basato sulla media degli avversari, la somma dei punti guadagnati da T1 non è necessariamente l'esatto opposto di quelli persi da T2, sebbene nel lungo periodo tendano a bilanciarsi.</li>
              <li><b>Arrotondamenti:</b> Nella visualizzazione dei match i punti sono arrotondati all'intero più vicino, ma nel database sono salvati con precisione decimale per evitare errori cumulativi.</li>
           </ul>
        </div>
      </section>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-500">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner italic font-black">!</div>
              <div>
                 <h4 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter text-red-600">Applica Parametri</h4>
                 <p className="text-slate-400 text-xs font-bold uppercase mt-2">I nuovi parametri verranno salvati nel database</p>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-left">
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">Modalità</span><div className="text-sm font-black text-slate-800 uppercase italic">{draftRanking.mode}</div></div>
                 <div className="space-y-1"><span className="text-[8px] font-black text-slate-400 uppercase">K-Base</span><div className="text-sm font-black text-slate-800">{draftRanking[draftRanking.mode === 'CLASSIC' ? 'classic' : 'proportional'].kBase}</div></div>
              </div>
              <div className="space-y-3">
                 <button onClick={() => handleApplySettings(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Salva e Ricalcola Tutto</button>
                 <button onClick={() => handleApplySettings(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Salva (Match futuri)</button>
                 <button onClick={() => setShowConfirmModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Indietro</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
