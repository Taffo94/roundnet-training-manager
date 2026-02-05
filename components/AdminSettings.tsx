
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Player, TrainingSession, AppSnapshot, MatchmakingMode, RankingSettings, RankingModeParams } from '../types';
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

  const [sandboxRankT1, setSandboxRankT1] = useState(2000);
  const [sandboxRankT2, setSandboxRankT2] = useState(2000);
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
      // Snapshot ora include players, sessions E settings correnti
      await createSnapshot(players, sessions, settings, backupReason);
      await fetchSnapshots();
      setBackupReason('Aggiornamento parametri');
    } finally { setIsBackingUp(false); }
  };

  const handleRestore = async (id: string) => {
    try {
      const snap = await getSnapshotContent(id);
      if (snap) {
        onRestoreSnapshot(snap.data.players, snap.data.sessions, snap.data.settings);
      }
    } catch (e) { alert("Errore nel ripristino."); }
  };

  const updateDraftParam = (mode: 'classic' | 'proportional', key: keyof RankingModeParams, value: any) => {
    setDraftRanking(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [key]: value }
    }));
  };

  const isSettingsDirty = useMemo(() => {
    return JSON.stringify(draftRanking) !== JSON.stringify(settings.ranking);
  }, [draftRanking, settings.ranking]);

  const handleApplySettings = (recalculate: boolean) => {
    onUpdateSettings({ 
      ...settings, 
      ranking: draftRanking,
      lastUpdated: Date.now()
    });
    setShowConfirmModal(false);
    if (recalculate && onRecalculateGlobal) {
      setTimeout(() => onRecalculateGlobal(), 500);
    }
  };

  const sandboxResults = useMemo(() => {
    const p1: Player = { id: 'p1', name: 'T1A', basePoints: sandboxRankT1/2, matchPoints: sandboxRankT1/2, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p2: Player = { id: 'p2', name: 'T1B', basePoints: sandboxRankT1/2, matchPoints: sandboxRankT1/2, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p3: Player = { id: 'p3', name: 'T2A', basePoints: sandboxRankT2/2, matchPoints: sandboxRankT2/2, wins: 0, losses: 0, gender: 'F', lastActive: 0 };
    const p4: Player = { id: 'p4', name: 'T2B', basePoints: sandboxRankT2/2, matchPoints: sandboxRankT2/2, wins: 0, losses: 0, gender: 'F', lastActive: 0 };

    const classicRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'CLASSIC' });
    const proportionalRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'PROPORTIONAL' });

    return { classic: classicRes, proportional: proportionalRes };
  }, [sandboxRankT1, sandboxRankT2, sandboxScoreT1, sandboxScoreT2, draftRanking]);

  const lastUpdatedStr = settings.lastUpdated 
    ? new Date(settings.lastUpdated).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Mai aggiornato';

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      
      {/* 1. SEZIONE PRIORITARIA: DATA INTEGRITY & SNAPSHOTS */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Data Integrity & Snapshots</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestione backup completi (Giocatori, Sessioni e Parametri)</p>
           </div>
           <div className="flex gap-4">
              <input 
                 type="text" 
                 placeholder="Motivo backup..." 
                 value={backupReason} 
                 onChange={e => setBackupReason(e.target.value)}
                 className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-red-500 w-48"
              />
              <button 
                onClick={handleBackup} 
                disabled={isBackingUp}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50"
              >
                {isBackingUp ? 'Creazione...' : 'Crea Snapshot Ora'}
              </button>
           </div>
        </div>

        <div className="p-10">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Storico Snapshot Disponibili</div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {snapshots.map(s => (
                <div key={s.id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-red-200 transition-colors group">
                   <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase mb-1">{new Date(s.created_at!).toLocaleString()}</div>
                      <div className="text-sm font-black text-slate-800 uppercase italic mb-4 leading-tight">{s.reason}</div>
                   </div>
                   <button 
                      onClick={() => handleRestore(s.id!)}
                      className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-500 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all shadow-sm"
                   >
                      Ripristina Dati e Parametri
                   </button>
                </div>
              ))}
              {snapshots.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-300 font-bold uppercase text-[10px] italic">Nessuno snapshot salvato.</div>
              )}
           </div>
        </div>
      </section>

      {/* 2. SEZIONE RANKING: DASHBOARD LIVE */}
      <section className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden ring-4 ring-slate-200">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <span className="text-8xl font-black italic">LIVE</span>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Motore Attivo</h3>
              </div>
              <div>
                <div className="text-4xl font-black italic uppercase tracking-tighter text-red-500">{settings.ranking.mode} MODE</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Ultimo salvataggio: <span className="text-white">{lastUpdatedStr}</span></div>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
              <div>
                 <div className="text-[8px] font-black text-slate-500 uppercase mb-1">K-Base</div>
                 <div className="text-xl font-black">{settings.ranking.mode === 'CLASSIC' ? settings.ranking.classic.kBase : settings.ranking.proportional.kBase}</div>
              </div>
              <div>
                 <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Bonus Factor</div>
                 <div className="text-xl font-black">{settings.ranking.mode === 'CLASSIC' ? settings.ranking.classic.bonusFactor : settings.ranking.proportional.bonusFactor}x</div>
              </div>
              <div>
                 <div className="text-[8px] font-black text-slate-500 uppercase mb-1">Threshold / Margin</div>
                 <div className="text-xl font-black">
                    {settings.ranking.mode === 'CLASSIC' ? settings.ranking.classic.classicBonusMargin : settings.ranking.proportional.maxPossibleMargin}
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* 3. SEZIONE RANKING: EDITOR DRAFT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         <section className="lg:col-span-5 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-8 bg-slate-100 border-b border-slate-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-sm uppercase italic tracking-widest text-slate-800">Parametri Draft</h3>
                  <div className={`text-[8px] font-black px-2 py-1 rounded transition-colors ${isSettingsDirty ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                    {isSettingsDirty ? 'MODIFICHE NON SALVATE' : 'SINCRO CON PROD'}
                  </div>
               </div>
               
               <div className="flex bg-slate-200 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveDraftTab('classic')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeDraftTab === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >Classic Params</button>
                  <button 
                    onClick={() => setActiveDraftTab('proportional')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeDraftTab === 'proportional' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                  >Proportional Params</button>
               </div>
            </div>

            <div className="p-8 flex-1 space-y-8">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        K-Base (Base ELO) <span>{draftRanking[activeDraftTab].kBase}</span>
                     </label>
                     <input 
                        type="range" min="4" max="40" step="1" 
                        value={draftRanking[activeDraftTab].kBase} 
                        onChange={e => updateDraftParam(activeDraftTab, 'kBase', parseInt(e.target.value))} 
                        className="w-full accent-red-600" 
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                        Bonus Factor <span>{draftRanking[activeDraftTab].bonusFactor}x</span>
                     </label>
                     <input 
                        type="range" min="1" max="2.5" step="0.05" 
                        value={draftRanking[activeDraftTab].bonusFactor} 
                        onChange={e => updateDraftParam(activeDraftTab, 'bonusFactor', parseFloat(e.target.value))} 
                        className="w-full accent-red-600" 
                     />
                  </div>
                  {activeDraftTab === 'classic' ? (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                           Bonus Threshold (Margin) <span>{draftRanking.classic.classicBonusMargin}</span>
                        </label>
                        <input 
                           type="range" min="3" max="15" step="1" 
                           value={draftRanking.classic.classicBonusMargin} 
                           onChange={e => updateDraftParam('classic', 'classicBonusMargin', parseInt(e.target.value))} 
                           className="w-full accent-slate-800" 
                        />
                     </div>
                  ) : (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex justify-between">
                           Max Saturation Margin <span>{draftRanking.proportional.maxPossibleMargin}</span>
                        </label>
                        <input 
                           type="range" min="10" max="30" step="1" 
                           value={draftRanking.proportional.maxPossibleMargin} 
                           onChange={e => updateDraftParam('proportional', 'maxPossibleMargin', parseInt(e.target.value))} 
                           className="w-full accent-red-600" 
                        />
                     </div>
                  )}
               </div>

               <div className="pt-6 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">Modalità da attivare in produzione:</label>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'CLASSIC' }))}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'CLASSIC' ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200' : 'border-slate-100 text-slate-400'}`}
                     >CLASSIC</button>
                     <button 
                        onClick={() => setDraftRanking(prev => ({ ...prev, mode: 'PROPORTIONAL' }))}
                        className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${draftRanking.mode === 'PROPORTIONAL' ? 'border-red-600 bg-red-600 text-white shadow-lg shadow-red-200' : 'border-slate-100 text-slate-400'}`}
                     >PROPORTIONAL</button>
                  </div>
               </div>

               {isSettingsDirty && (
                 <div className="pt-4">
                    <button 
                        onClick={() => setShowConfirmModal(true)}
                        className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl animate-pulse"
                    >
                        Applica Modifiche
                    </button>
                 </div>
               )}
            </div>
         </section>

         <section className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 space-y-10">
            <div>
               <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.3em] border-l-4 border-red-600 pl-4 mb-2">Sandbox Simulator</h3>
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Testa l'impatto dei parametri bozza su un match ipotetico</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Avg Rank T1</label>
                  <input type="number" value={sandboxRankT1} onChange={e => setSandboxRankT1(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-black text-xs" />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Avg Rank T2</label>
                  <input type="number" value={sandboxRankT2} onChange={e => setSandboxRankT2(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-black text-xs" />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Score T1</label>
                  <input type="number" value={sandboxScoreT1} onChange={e => setSandboxScoreT1(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-black text-xs" />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase">Score T2</label>
                  <input type="number" value={sandboxScoreT2} onChange={e => setSandboxScoreT2(parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-black text-xs" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className={`p-6 rounded-3xl border-2 transition-all relative ${draftRanking.mode === 'CLASSIC' ? 'border-slate-900 bg-white ring-4 ring-slate-100 shadow-xl shadow-slate-100' : 'border-slate-100 opacity-40'}`}>
                  {draftRanking.mode === 'CLASSIC' && <span className="absolute -top-3 left-6 bg-slate-900 text-white text-[7px] font-black px-2 py-1 rounded">PREVIEW ATTIVA</span>}
                  <div className="text-[9px] font-black uppercase text-slate-400 mb-2">Classic Result</div>
                  <div className="text-3xl font-black text-slate-800">+{sandboxResults.classic.decimalDelta.toFixed(3)}</div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase mt-2">K: {sandboxResults.classic.kUsed.toFixed(2)}</div>
               </div>
               <div className={`p-6 rounded-3xl border-2 transition-all relative ${draftRanking.mode === 'PROPORTIONAL' ? 'border-red-600 bg-white ring-4 ring-red-50 shadow-xl' : 'border-slate-100 opacity-40'}`}>
                  {draftRanking.mode === 'PROPORTIONAL' && <span className="absolute -top-3 left-6 bg-red-600 text-white text-[7px] font-black px-2 py-1 rounded">PREVIEW ATTIVA</span>}
                  <div className="text-[9px] font-black uppercase text-red-500 mb-2">Proportional Result</div>
                  <div className="text-3xl font-black text-red-600">+{sandboxResults.proportional.decimalDelta.toFixed(3)}</div>
                  <div className="text-[8px] font-bold text-red-400 uppercase mt-2">K: {sandboxResults.proportional.kUsed.toFixed(2)}</div>
               </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
               <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Sensitivity curve (K vs Margin)</h4>
               <div className="h-40 flex items-end gap-1 border-l border-b border-white/5 px-2 relative">
                  {Array.from({length: 22}).map((_, i) => {
                     const ratio = Math.min(i / (draftRanking.proportional.maxPossibleMargin || 21), 1);
                     const kProp = draftRanking.proportional.kBase * (1 + ratio * (draftRanking.proportional.bonusFactor - 1));
                     const kClassic = i >= (draftRanking.classic.classicBonusMargin || 7) ? draftRanking.classic.kBase * draftRanking.classic.bonusFactor : draftRanking.classic.kBase;
                     
                     const hProp = (kProp / (draftRanking.proportional.kBase * 2.5)) * 100;
                     const hClassic = (kClassic / (draftRanking.proportional.kBase * 2.5)) * 100;

                     return (
                        <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                           <div className={`w-full ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-red-500' : 'bg-slate-700'}`} style={{ height: `${hProp}%` }}></div>
                           <div className={`w-full absolute bottom-0 border-t border-white/40 border-dashed ${draftRanking.mode === 'CLASSIC' ? 'opacity-100' : 'opacity-20'}`} style={{ height: `${hClassic}%` }}></div>
                           {i % 5 === 0 && <span className="absolute -bottom-6 text-[7px] font-bold text-slate-600">{i}</span>}
                        </div>
                     )
                  })}
               </div>
            </div>
         </section>
      </div>

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
                 <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase">Modalità</span>
                    <div className="text-sm font-black text-slate-800 uppercase italic">{draftRanking.mode}</div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase">K-Base</span>
                    <div className="text-sm font-black text-slate-800">{draftRanking[draftRanking.mode === 'CLASSIC' ? 'classic' : 'proportional'].kBase}</div>
                 </div>
              </div>

              <div className="space-y-3">
                 <button onClick={() => handleApplySettings(true)} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Salva e Ricalcola Tutto</button>
                 <button onClick={() => handleApplySettings(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Salva (Match futuri)</button>
                 <button onClick={() => setShowConfirmModal(false)} className="w-full py-2 text-slate-400 font-black uppercase text-[10px] tracking-widest">Indietro</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
