
import React, { useState, useEffect } from 'react';
import { AppSettings, Player, TrainingSession, AppSnapshot, MatchmakingMode } from '../types';
import { createSnapshot, getSnapshots, getSnapshotContent } from '../services/storage';

interface AdminSettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  players: Player[];
  sessions: TrainingSession[];
  onRestoreSnapshot: (players: Player[], sessions: TrainingSession[]) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdateSettings, players, sessions, onRestoreSnapshot }) => {
  const [snapshots, setSnapshots] = useState<Partial<AppSnapshot>[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupReason, setBackupReason] = useState('Manual Admin Backup');
  const [selectedSnapshotData, setSelectedSnapshotData] = useState<AppSnapshot | null>(null);
  const [isLoadingSnap, setIsLoadingSnap] = useState(false);

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
      alert("Backup salvato con successo su Supabase.");
    } catch (e) {
      alert("Errore durante il backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleViewSnapshot = async (id: string) => {
    setIsLoadingSnap(true);
    try {
      const content = await getSnapshotContent(id);
      setSelectedSnapshotData(content);
    } catch (e) {
      alert("Impossibile leggere lo snapshot.");
    } finally {
      setIsLoadingSnap(false);
    }
  };

  const toggleMode = (mode: MatchmakingMode) => {
    const active = settings.activeMatchmakingModes.includes(mode)
      ? settings.activeMatchmakingModes.filter(m => m !== mode)
      : [...settings.activeMatchmakingModes, mode];
    onUpdateSettings({ ...settings, activeMatchmakingModes: active });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Technical Center</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configurazioni strutturali e protezione dati</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Sezione Backup Interno */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest italic">Snapshot & Recovery</h3>
              <p className="text-[8px] text-slate-400 uppercase font-bold mt-0.5 tracking-tighter">Backup atomici salvati nel database</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">📦</div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nuovo Snapshot</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={backupReason} 
                  onChange={e => setBackupReason(e.target.value)} 
                  placeholder="Motivo backup..." 
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-slate-900 transition-all"
                />
                <button 
                  onClick={handleBackup} 
                  disabled={isBackingUp}
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 disabled:opacity-30 transition-all shadow-lg shadow-red-100"
                >
                  {isBackingUp ? 'Esecuzione...' : 'Backup Now'}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cronologia Backup</label>
              <div className="max-h-[300px] overflow-y-auto space-y-2 no-scrollbar">
                {snapshots.map(snap => (
                  <div key={snap.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center group hover:bg-white hover:border-slate-400 transition-all">
                    <div>
                      <div className="font-black text-xs text-slate-800">{snap.reason}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(snap.created_at!).toLocaleString()}</div>
                    </div>
                    <button 
                      onClick={() => handleViewSnapshot(snap.id!)} 
                      className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:border-red-500 hover:text-red-600 transition-all"
                    >
                      Dettagli
                    </button>
                  </div>
                ))}
                {snapshots.length === 0 && <div className="text-center py-10 text-slate-300 font-bold uppercase text-[9px]">Nessuno snapshot presente.</div>}
              </div>
            </div>
          </div>
        </section>

        {/* Sezione Configurazioni App */}
        <section className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-8">
            <div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.2em] border-l-4 border-red-600 pl-3">Comportamento App</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Impostazioni persistenti per l'intero sistema</p>
            </div>

            <div className="space-y-6">
              {/* Toggle Manual Session */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <div>
                  <div className="text-xs font-black text-slate-700 uppercase tracking-tighter">Creazione Manuale</div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase">Permetti ad admin di creare round custom</div>
                </div>
                <button 
                  onClick={() => onUpdateSettings({ ...settings, allowManualSessionCreation: !settings.allowManualSessionCreation })}
                  className={`w-12 h-6 rounded-full p-1 transition-all ${settings.allowManualSessionCreation ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.allowManualSessionCreation ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* Toggle Public Stats */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                <div>
                  <div className="text-xs font-black text-slate-700 uppercase tracking-tighter">Stats Pubbliche</div>
                  <div className="text-[8px] text-slate-400 font-bold uppercase">Mostra pagina stats anche agli atleti</div>
                </div>
                <button 
                  onClick={() => onUpdateSettings({ ...settings, showStatsToAthletes: !settings.showStatsToAthletes })}
                  className={`w-12 h-6 rounded-full p-1 transition-all ${settings.showStatsToAthletes ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.showStatsToAthletes ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* Matchmaking Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Algoritmi Attivi</label>
                <div className="flex flex-wrap gap-2">
                  {Object.values(MatchmakingMode).filter(m => m !== 'CUSTOM').map(mode => (
                    <button 
                      key={mode} 
                      onClick={() => toggleMode(mode)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${settings.activeMatchmakingModes.includes(mode) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4">
             <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div className="text-xs font-black text-red-900 uppercase tracking-tighter italic">Zona Pericolo</div>
             </div>
             <p className="text-[9px] text-red-700 font-bold uppercase leading-relaxed">Le modifiche in questa pagina hanno effetto immediato su tutti gli utenti collegati. Gestire con cura la cronologia snapshots.</p>
          </div>
        </section>
      </div>

      {/* Modal / Ispezione Snapshot */}
      {selectedSnapshotData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
              <div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                 <div>
                    <h4 className="font-black text-lg text-slate-800 uppercase italic tracking-tighter">Ispezione Snapshot</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(selectedSnapshotData.created_at).toLocaleString()}</p>
                 </div>
                 <button onClick={() => setSelectedSnapshotData(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 hover:text-red-600 transition-colors">✕</button>
              </div>
              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                       <div className="text-2xl font-black text-slate-800">{selectedSnapshotData.data.players.length}</div>
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atleti Salvati</div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                       <div className="text-2xl font-black text-slate-800">{selectedSnapshotData.data.sessions.length}</div>
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sessioni Salvate</div>
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-2xl p-6 overflow-hidden">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Anteprima Raw JSON</div>
                    <pre className="text-[10px] text-green-400 font-mono h-40 overflow-y-auto no-scrollbar whitespace-pre-wrap leading-tight">
                       {JSON.stringify(selectedSnapshotData.data, null, 2)}
                    </pre>
                 </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-200 flex gap-4">
                 <button 
                  onClick={() => setSelectedSnapshotData(null)} 
                  className="flex-1 px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs text-slate-600 uppercase tracking-widest hover:bg-white/50 transition-all"
                 >
                   Chiudi
                 </button>
                 <button 
                  onClick={() => {
                    onRestoreSnapshot(selectedSnapshotData.data.players, selectedSnapshotData.data.sessions);
                    setSelectedSnapshotData(null);
                  }}
                  className="flex-[2] px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all"
                 >
                   Ripristina questo Stato
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
