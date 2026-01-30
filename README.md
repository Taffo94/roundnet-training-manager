# Roundnet Milano Manager

Applicazione web per gestire gli allenamenti di Roundnet di **Roundnet Milano**: ranking atleti, generazione automatica delle partite, storico allenamenti e statistiche avanzate su compagni/avversari.

Pensata per l'uso **live sul campo** da parte di un amministratore (coach/organizzatore) e in **consultazione** da parte degli atleti.

---

## Funzionalità principali

### 🏆 Gestione Atleti
- Anagrafica giocatori con nome, sesso e punteggio di base
- Calcolo del punteggio totale (`basePoints + matchPoints`) e ordinamento automatico per ranking
- Visualizzazione vittorie/sconfitte e variazioni di ranking dopo l'ultimo allenamento

### 🎯 Sessioni di Allenamento
- Creazione di una **sessione attiva** con:
  - Data dell'allenamento
  - Selezione dei partecipanti (ordinati anche per frequenza storica di presenza)
- Possibilità di **modificare i partecipanti** anche a sessione avviata

### ⚔️ Generazione dei Round e delle Partite
- **Modalità di matchmaking**:
  - `FULL_RANDOM`: abbinamenti totalmente casuali
  - `SAME_LEVEL`: giocatori di livello simile si affrontano tra loro
  - `BALANCED_PAIRS`: squadre equilibrate High/Low, con logica per:
    - evitare coppie ripetute troppe volte
    - bilanciare il livello medio delle due squadre
  - `GENDER_BALANCED`: tentativo di bilanciamento uomo/donna dove possibile
  - `CUSTOM`: round vuoti da compilare manualmente (assegni tu gli atleti alle squadre)
- Gestione dei giocatori "a riposo" ad ogni round, con logica per distribuire equamente le pause
- Evidenziazione di **conflitti** (giocatore assegnato a più ruoli nello stesso round)

### 📊 Registrazione Risultati e Ranking
- Inserimento punteggi delle partite in tempo reale
- Calcolo automatico dei nuovi rating tramite un sistema tipo **Elo a coppie**:
  - Tiene conto della forza media degli avversari
  - Applica un bonus per vittorie con scarto ampio
- Aggiornamento di:
  - `matchPoints` dei singoli giocatori
  - vittorie/sconfitte
  - storico delle partite e sessioni

### 📚 Archivio Allenamenti
- Lista degli allenamenti archiviati con:
  - Data, numero di atleti, numero di round
- Dettaglio per allenamento:
  - Round, squadre, risultati, punti individuali guadagnati/persi
  - Link rapidi ai profili degli atleti (tab statistiche)

### 📈 Statistiche Giocatore
Per ogni atleta:
- Win rate complessivo e numero totale di partite
- **Miglior compagno**: "compagno vincente", "affinità tecnica", "partner fedele"
- **Avversario più ostico**: "bestia nera", "incubo", "rivale storico"
- Cronologia delle ultime partite con partner, avversari e punteggio

### 📥 Esportazione Dati
- Export **Excel (.xls)** riassuntivo dell'allenamento
- Export **PDF schematico** del training (round, accoppiamenti, risultati)

---

## Ruoli e Modalità di Accesso

### 👤 Accesso Atleta
- Non richiede password
- Permette di:
  - Visualizzare la **classifica**
  - Consultare l'**archivio** allenamenti
  - Vedere il dettaglio **statistiche** personali e degli altri atleti

### 🔐 Area Admin
- Accesso protetto da password
- Permette di:
  - Aggiungere/modificare/eliminare atleti
  - Creare sessioni, generare round e partite
  - Inserire/aggiornare i risultati
  - Archiviare/eliminare sessioni e round
  - Ricalcolare completamente il ranking a partire dallo storico

---

## Stack Tecnico

- **Frontend**: React (TypeScript) + Vite
- **Persistenza dati**: [Supabase](https://supabase.com) (PostgreSQL + API)
  - Lo stato completo dell'app (`AppState`) viene salvato in un'unica tabella come JSON
- **Styling**: Tailwind-like utility classes (generate da AI Studio / Vite template)

---

## Requisiti

- **Node.js** (versione recente LTS)
- Account **Supabase** con un progetto configurato

---

## Configurazione Supabase

Nel progetto viene creato un client Supabase in `services/storage.ts` utilizzando variabili d'ambiente di Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

L'app si aspetta una tabella, ad esempio chiamata `app_data`, con almeno:

- `id` (integer, PK)
- `state` (jsonb) – contiene l'oggetto `AppState` serializzato
- `updated_at` (timestamp, opzionale ma consigliato)

L'app legge e scrive sempre sulla riga con `id = 1`:

- **Lettura**: `SELECT state FROM app_data WHERE id = 1`
- **Scrittura**: `UPSERT` su `id = 1` con il nuovo `state`

> Se la riga non esiste al primo avvio, il codice crea uno **stato di default** vuoto.

---

## Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto con:

```bash
VITE_SUPABASE_URL=...      # URL del tuo progetto Supabase
VITE_SUPABASE_ANON_KEY=... # ANON KEY pubblica
```


---

## Avvio in Locale

1. **Installazione dipendenze**
   ```bash
   npm install
   ```

2. **Configura `.env.local`**
   
   Assicurati che `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` siano impostate correttamente.

3. **Avvia il server di sviluppo**
   ```bash
   npm run dev
   ```

4. Apri il browser all'indirizzo suggerito da Vite (tipicamente `http://localhost:5173`)

---

## Flusso d'Uso Tipico

### Per l'Admin
1. Accede con "Area Admin" usando la password
2. Verifica/aggiorna l'elenco degli atleti e i punteggi di base
3. Crea una **nuova sessione**:
   - sceglie la data
   - seleziona gli atleti presenti
4. Genera uno o più **round** con la modalità desiderata (`FULL_RANDOM`, `SAME_LEVEL`, `BALANCED_PAIRS`, ecc.)
5. Durante l'allenamento:
   - controlla i possibili conflitti nei round
   - inserisce i risultati delle partite man mano che terminano
6. A fine serata:
   - archivia la sessione
   - opzionalmente esporta Excel o PDF
7. Se necessario, usa la funzione **"Ricalcola Ranking"** per rigenerare il punteggio a partire dallo storico

### Per gli Atleti
- Entrano come "Accesso Atleta"
- Consultano:
  - **Classifica**
  - **Archivio Allenamenti** con round e risultati
  - **Statistiche personali** (miglior compagno, avversario più tosto, ecc.)

---

## Struttura Principale del Progetto

- **`App.tsx`**  
  Entry point logico: gestisce stato globale (`AppState`), login admin/atleta, tab principali (`ranking`, `training`, `history`, `stats`) e orchestrazione dei componenti

- **`components/PlayerList.tsx`**  
  Classifica atleti con ranking, variazioni punti/posizione e azioni admin

- **`components/ActiveTraining.tsx`**  
  Gestione sessione attiva: selezione partecipanti, round, partite, inserimento punteggi

- **`components/TrainingHistory.tsx`**  
  Archivio allenamenti: espansione per sessione, liste dei round, export Excel/PDF

- **`components/PlayerStats.tsx`**  
  Dashboard statistiche per singolo atleta: win rate, migliori compagni, avversari storici, cronologia incontri

- **`services/matchmaking.ts`**  
  Logica di generazione dei round e delle partite + calcolo Elo e deltas individuali

- **`services/storage.ts`**  
  Integrazione con Supabase (caricamento/salvataggio di `AppState`)

- **`types.ts`**  
  Tipi TypeScript condivisi (`Player`, `TrainingSession`, `Round`, `Match`, `MatchmakingMode`, ecc.)

---

## Deploy

L'app è pensata per essere deployata facilmente su servizi come **Vercel**, Netlify o simili:

- **Build**:
  ```bash
  npm run build
  ```

- **Verifica locale della build**:
  ```bash
  npm run preview
  ```

Ricorda di impostare sul provider di hosting le **stesse variabili d'ambiente** usate in locale:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Miglioramenti Futuri (idee)

- Autenticazione basata su Supabase (al posto di una password hard-coded)
- Gestione di più club o gruppi distinti
- Parametrizzazione fine dell'algoritmo di rating (K, bonus scarto, ecc.)
- Esportazioni statistiche aggregate sull'intera stagione
