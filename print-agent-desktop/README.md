# Event4U Print Agent

App desktop per la stampa termica di biglietti.

## URL Server Integrato
`https://manage.eventfouryou.com`

## Installazione Sviluppo

```bash
cd print-agent-desktop
npm install
npm start
```

## Compilazione Eseguibile

### Windows
```bash
npm run build:win
```
L'eseguibile sarà in `dist/Event4U Print Agent Setup.exe`

### Mac
```bash
npm run build:mac
```
Il file .dmg sarà in `dist/`

## Configurazione

1. **Nel sito web Event4U** (come admin):
   - Vai a "Impostazioni Stampanti"
   - Clicca "Registra Nuovo Agente"
   - Inserisci il nome del dispositivo
   - Copia il **TOKEN** e il **Company ID**

2. **Nel Print Agent**:
   - Incolla il Token
   - Incolla il Company ID
   - Seleziona la stampante termica
   - Clicca "Salva e Connetti"

## Requisiti
- Node.js 18+
- Una stampante termica (es. XP-420B, XP-208P)
