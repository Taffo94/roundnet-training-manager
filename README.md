# 🏆 Roundnet Milano Manager (RMI Manager)

**RMI Manager** è una web application dedicata alla gestione professionale di squadre e allenamenti di **Roundnet** (Spikeball). Progettata per atleti e organizzatori, permette di gestire il ranking della community, organizzare sessioni di allenamento in tempo reale e generare match equilibrati basati sul livello dei partecipanti.

![Roundnet Milano Dashboard](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 🚀 Caratteristiche Principali

- 📊 **Ranking Dinamico**: Sistema di punteggio avanzato (Elorating-style) con modalità classica o proporzionale.
- 🤝 **Matchmaking Intelligente**: Generazione automatica di round di gioco con diverse modalità:
  - Full Random
  - Same Level (bilanciato per livello)
  - Balanced Pairs (coppie mixate)
  - Split Balanced
- ⏱️ **Live Training**: Gestione in tempo reale degli allenamenti, inserimento risultati e aggiornamento istantaneo del ranking.
- 📈 **Stats & Performance**: Storico dettagliato delle partite e statistiche individuali per ogni atleta.
- 🔐 **Admin Panel**: Controllo totale su atleti, backup dei dati e parametri dell'algoritmo di ranking.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Deployment**: [Vercel](https://vercel.com/)
- **Utility**: [ExcelJS/XLSX](https://github.com/SheetJS/sheetjs) per l'import/export dei dati.

## 💻 Installazione Locale

### Prerequisiti
- Node.js (v18 o superiore)
- Un account Supabase

### Passaggi
1. **Clona il repository**:
   ```bash
   git clone https://github.com/Taffo94/roundnet-training-manager.git
   cd roundnet-training-manager
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**:
   Crea un file `.env.local` nella root del progetto e aggiungi le tue chiavi:
   ```env
   VITE_SUPABASE_URL=la_tua_url_supabase
   VITE_SUPABASE_ANON_KEY=la_tua_chiave_anon_supabase
   ```

4. **Avvia il server di sviluppo**:
   ```bash
   npm run dev
   ```

## 🌐 Deployment (Vercel)

L'applicazione è configurata per essere distribuita facilmente su **Vercel**:

1. Collega il tuo repository GitHub a Vercel.
2. Configura le **Environment Variables** nel pannello di Vercel (stesse chiavi del file `.env.local`).
3. Il deploy avverrà automaticamente ad ogni push sul ramo `main`.

## 🛢️ Database (Supabase)

I dati sono persistiti su Supabase. Per il corretto funzionamento, assicurati di avere le tabelle `players`, `sessions` e `settings` configurate nel tuo progetto Supabase (o segui gli script di migrazione se disponibili).

---
*Sviluppato con ❤️ per la community di Roundnet Milano.*
