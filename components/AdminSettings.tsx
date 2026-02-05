
import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings, Player, TrainingSession, AppSnapshot, MatchmakingMode, RankingMode, RankingSettings } from '../types';
import { createSnapshot, getSnapshots, getSnapshotContent } from '../services/storage';
import { calculateNewRatings } from '../services/matchmaking';

interface AdminSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  players: Player[];
  sessions: TrainingSession[];
  onRestoreSnapshot: (players: Player[], sessions: TrainingSession[]) => void;
  onRecalculateGlobal?: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, players, sessions, onRestoreSnapshot, onRecalculateGlobal }) => {
  const [snapshots, setSnapshots] = useState<Partial<AppSnapshot>[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupReason, setBackupReason] = useState('Manual Admin Backup');
  const [selectedSnapshotData, setSelectedSnapshotData] = useState<AppSnapshot | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Stato locale per le modifiche "DRAFT" al ranking
  const [draftRanking, setDraftRanking] = useState<RankingSettings>(settings.ranking);

  // Stati per la simulazione Sandbox
  const [sandboxRankT1, setSandboxRankT1] = useState(2000);
  const [sandboxRankT2, setSandboxRankT2] = useState(2000);
  const [sandboxScoreT1, setSandboxScoreT1] = useState(21);
  const [sandboxScoreT2, setSandboxScoreT2] = useState(15);

  // Reset draft se cambiano le settings dall'esterno (raro)
  useEffect(() => {
    setDraftRanking(settings.ranking);
  }, [settings.ranking]);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const data = await getSnapshots();
      setSnapshots(data);
    } catch (e) {
      console.error("Errore caricamento snapshots:", e);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await createSnapshot(players, sessions, backupReason);
      await fetchSnapshots();
      alert("Backup salvato con successo.");
    } catch (e) {
      alert("Errore durante il backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleViewSnapshot = async (id: string) => {
    try {
      const content = await getSnapshotContent(id);
      setSelectedSnapshotData(content);
    } catch (e) {
      alert("Impossibile leggere lo snapshot.");
    }
  };

  const toggleMatchmakingMode = (mode: MatchmakingMode) => {
    const active = settings.activeMatchmakingModes.includes(mode)
      ? settings.activeMatchmakingModes.filter(m => m !== mode)
      : [...settings.activeMatchmakingModes, mode];
    onUpdateSettings({ ...settings, activeMatchmakingModes: active });
  };

  const updateDraftRanking = (key: keyof RankingSettings, value: any) => {
    setDraftRanking(prev => ({ ...prev, [key]: value }));
  };

  const isSettingsDirty = useMemo(() => {
    return JSON.stringify(draftRanking) !== JSON.stringify(settings.ranking);
  }, [draftRanking, settings.ranking]);

  const handleApplySettings = (recalculate: boolean) => {
    onUpdateSettings({ ...settings, ranking: draftRanking });
    setShowConfirmModal(false);
    if (recalculate && onRecalculateGlobal) {
      // Usiamo setTimeout per assicurarci che lo stato delle settings sia propagato prima del ricalcolo
      setTimeout(() => onRecalculateGlobal(), 500);
    }
  };

  // Calcoli Sandbox basati sul DRAFT
  const sandboxResults = useMemo(() => {
    const p1: Player = { id: 'p1', name: 'T1A', basePoints: sandboxRankT1/2, matchPoints: sandboxRankT1/2, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p2: Player = { id: 'p2', name: 'T1B', basePoints: sandboxRankT1/2, matchPoints: sandboxRankT1/2, wins: 0, losses: 0, gender: 'M', lastActive: 0 };
    const p3: Player = { id: 'p3', name: 'T2A', basePoints: sandboxRankT2/2, matchPoints: sandboxRankT2/2, wins: 0, losses: 0, gender: 'F', lastActive: 0 };
    const p4: Player = { id: 'p4', name: 'T2B', basePoints: sandboxRankT2/2, matchPoints: sandboxRankT2/2, wins: 0, losses: 0, gender: 'F', lastActive: 0 };

    const classicRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'CLASSIC' });
    const proportionalRes = calculateNewRatings(p1, p2, p3, p4, sandboxScoreT1, sandboxScoreT2, { ...draftRanking, mode: 'PROPORTIONAL' });

    return { classic: classicRes, proportional: proportionalRes };
  }, [sandboxRankT1, sandboxRankT2, sandboxScoreT1, sandboxScoreT2, draftRanking]);

  // Dati per il grafico basati sul DRAFT
  const sensitivityData = useMemo(() => {
    const margins = Array.from({ length: 22 }, (_, i) => i);
    return margins.map(m => {
      const kClassic = m >= draftRanking.classicBonusMargin ? draftRanking.kBase * draftRanking.bonusFactor : draftRanking.kBase;
      const ratio = Math.min(m / draftRanking.maxPossibleMargin, 1);
      const kProp = draftRanking.kBase * (1 + ratio * (draftRanking.bonusFactor - 1));
      return { margin: m, kClassic, kProp };
    });
  }, [draftRanking]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="border-b border-slate-200 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Technical Center</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configurazione Motore di Ranking</p>
        </div>
        {isSettingsDirty && (
          <button 
            onClick={() => setShowConfirmModal(true)}
            className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl animate-bounce"
          >
            Applica Modifiche
          </button>
        )}
      </div>

      <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-xl uppercase italic tracking-widest">Ranking Configuration (Draft)</h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 tracking-widest">Sperimenta i parametri prima di applicarli</p>
            </div>
            <div className="flex bg-white/10 p-1 rounded-xl">
               <button 
                onClick={() => updateDraftRanking('mode', 'CLASSIC')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${draftRanking.mode === 'CLASSIC' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
               >
                 Classic
               </button>
               <button 
                onClick={() => updateDraftRanking('mode', 'PROPORTIONAL')}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
               >
                 Proportional
               </button>
            </div>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-8">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Parametri di Prova</h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-700 uppercase">K-Base ({draftRanking.kBase})</label>
                </div>
                <input type="range" min="4" max="40" step="1" value={draftRanking.kBase} onChange={(e) => updateDraftRanking('kBase', parseInt(e.target.value))} className="w-full accent-red-600" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-700 uppercase">Bonus Factor ({draftRanking.bonusFactor}x)</label>
                </div>
                <input type="range" min="1" max="2.5" step="0.05" value={draftRanking.bonusFactor} onChange={(e) => updateDraftRanking('bonusFactor', parseFloat(e.target.value))} className="w-full accent-red-600" />
              </div>
              {draftRanking.mode === 'PROPORTIONAL' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-700 uppercase">Max Margin ({draftRanking.maxPossibleMargin})</label>
                  </div>
                  <input type="range" min="10" max="30" step="1" value={draftRanking.maxPossibleMargin} onChange={(e) => updateDraftRanking('maxPossibleMargin', parseInt(e.target.value))} className="w-full accent-red-600" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-700 uppercase">Threshold ({draftRanking.classicBonusMargin})</label>
                  </div>
                  <input type="range" min="3" max="15" step="1" value={draftRanking.classicBonusMargin} onChange={(e) => updateDraftRanking('classicBonusMargin', parseInt(e.target.value))} className="w-full accent-red-600" />
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[9px] text-slate-400">
              Questi parametri influenzano le simulazioni a destra e nel sandbox.
            </div>
          </div>

          <div className="lg:col-span-8 space-y-10">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Analisi Sensibilità K</h4>
              <div className="h-48 flex items-end gap-1 px-4 border-l border-b border-slate-100 relative">
                {sensitivityData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                    <div className={`w-full transition-all duration-300 z-10 ${draftRanking.mode === 'PROPORTIONAL' ? 'bg-red-500' : 'bg-slate-200'}`} style={{ height: `${(d.kProp/(draftRanking.kBase*draftRanking.bonusFactor))*100}%` }}></div>
                    <div className={`w-full absolute bottom-0 border-t-2 border-slate-400 border-dashed transition-all duration-300 ${draftRanking.mode === 'CLASSIC' ? 'opacity-100' : 'opacity-20'}`} style={{ height: `${(d.kClassic/(draftRanking.kBase*draftRanking.bonusFactor))*100}%` }}></div>
                    {i % 5 === 0 && <div className="absolute -bottom-6 text-[8px] font-bold text-slate-300">{i}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Sandbox: Verifica Delta (Precisione Decimale)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                <input type="number" value={sandboxRankT1} onChange={e => setSandboxRankT1(parseInt(e.target.value) || 0)} className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" placeholder="Rank T1" />
                <input type="number" value={sandboxRankT2} onChange={e => setSandboxRankT2(parseInt(e.target.value) || 0)} className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" placeholder="Rank T2" />
                <input type="number" value={sandboxScoreT1} onChange={e => setSandboxScoreT1(parseInt(e.target.value) || 0)} className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" placeholder="Punti T1" />
                <input type="number" value={sandboxScoreT2} onChange={e => setSandboxScoreT2(parseInt(e.target.value) || 0)} className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-xs" placeholder="Punti T2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border-2 ${draftRanking.mode === 'CLASSIC' ? 'border-slate-800 bg-white' : 'border-slate-100 opacity-40'}`}>
                  <div className="text-[8px] font-black uppercase text-slate-400">Classic Result</div>
                  <div className="text-xl font-black text-slate-800">+{sandboxResults.classic.decimalDelta.toFixed(3)}</div>
                  <div className="text-[8px] text-slate-400 uppercase mt-1">K: {sandboxResults.classic.kUsed.toFixed(2)}</div>
                </div>
                <div className={`p-4 rounded-2xl border-2 ${draftRanking.mode === 'PROPORTIONAL' ? 'border-red-600 bg-white' : 'border-slate-100 opacity-40'}`}>
                  <div className="text-[8px] font-black uppercase text-red-500">Proportional Result</div>
                  <div className="text-xl font-black text-red-600">+{sandboxResults.proportional.decimalDelta.toFixed(3)}</div>
                  <div className="text-[8px] text-red-400 uppercase mt-1">K: {sandboxResults.proportional.kUsed.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Altre impostazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-8">
           <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.2em] border-l-4 border-red-600 pl-3">Matchmaking & Stats</h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-black text-slate-700 uppercase">Creazione Manuale</div>
                <button onClick={() => onUpdateSettings({ ...settings, allowManualSessionCreation: !settings.allowManualSessionCreation })} className={`w-10 h-5 rounded-full p-1 transition-all ${settings.allowManualSessionCreation ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.allowManualSessionCreation ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-black text-slate-700 uppercase">Stats Pubbliche</div>
                <button onClick={() => onUpdateSettings({ ...settings, showStatsToAthletes: !settings.showStatsToAthletes })} className={`w-10 h-5 rounded-full p-1 transition-all ${settings.showStatsToAthletes ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.showStatsToAthletes ? 'translate-x-5' : 'translate-x-0'}`}></div></button>
              </div>
           </div>
        </section>

        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
          <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.2em] border-l-4 border-slate-900 pl-3">Snapshot Manuale</h3>
          <div className="flex gap-2">
            <input type="text" value={backupReason} onChange={e => setBackupReason(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none" placeholder="Motivo backup..." />
            <button onClick={handleBackup} disabled={isBackingUp} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">{isBackingUp ? '...' : 'Backup'}</button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
            {snapshots.map(snap => (
              <div key={snap.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-600">{snap.reason}</span>
                <button onClick={() => handleViewSnapshot(snap.id!)} className="text-red-600 font-black uppercase">Vedi</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL CONFERMA CAMBIO RANKING */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-10 space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
              <h4 className="font-black text-2xl text-slate-800 uppercase italic tracking-tighter">Conferma Nuovi Parametri</h4>
              <p className="text-slate-400 text-sm font-bold uppercase mt-2">Riepilogo delle modifiche al motore</p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
               <div className="flex justify-between text-xs">
                 <span className="text-slate-400 uppercase font-black">Modalità</span>
                 <span className="font-black text-slate-800">{settings.ranking.mode} ➔ {draftRanking.mode}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-slate-400 uppercase font-black">K-Base</span>
                 <span className="font-black text-slate-800">{settings.ranking.kBase} ➔ {draftRanking.kBase}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-slate-400 uppercase font-black">Bonus Factor</span>
                 <span className="font-black text-slate-800">{settings.ranking.bonusFactor}x ➔ {draftRanking.bonusFactor}x</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-slate-400 uppercase font-black">Margine Max / Threshold</span>
                 <span className="font-black text-slate-800">
                   {draftRanking.mode === 'PROPORTIONAL' ? draftRanking.maxPossibleMargin : draftRanking.classicBonusMargin}
                 </span>
               </div>
            </div>

            <div className="space-y-3">
               <p className="text-[10px] text-slate-400 font-bold uppercase text-center leading-relaxed">
                 Queste impostazioni influenzeranno tutti i futuri match. Vuoi ricalcolare anche l'intero storico per aggiornare l'attuale classifica?
               </p>
               <div className="flex flex-col gap-2">
                 <button 
                  onClick={() => handleApplySettings(true)}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
                 >
                   Applica e Ricalcola Storico
                 </button>
                 <button 
                  onClick={() => handleApplySettings(false)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                 >
                   Applica solo ai match futuri
                 </button>
                 <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest py-2"
                 >
                   Annulla
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ISPEZIONE SNAPSHOT (Pre-esistente) */}
      {selectedSnapshotData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[201] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <h4 className="font-black text-slate-800 uppercase italic">Ispezione Snapshot</h4>
                 <button onClick={() => setSelectedSnapshotData(null)} className="text-slate-400 font-bold">✕</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                 <pre className="text-[10px] text-slate-400 font-mono bg-slate-900 p-4 rounded-xl">{JSON.stringify(selectedSnapshotData.data, null, 2)}</pre>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-2">
                 <button onClick={() => setSelectedSnapshotData(null)} className="flex-1 px-8 py-3 bg-white border border-slate-200 rounded-xl font-black text-[10px] text-slate-600 uppercase">Chiudi</button>
                 <button onClick={() => { onRestoreSnapshot(selectedSnapshotData.data.players, selectedSnapshotData.data.sessions); setSelectedSnapshotData(null); }} className="flex-[2] px-8 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-red-700">Ripristina Stato</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
