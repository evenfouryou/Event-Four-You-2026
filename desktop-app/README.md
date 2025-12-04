# Event4U Smart Card Reader

Applicazione desktop per Windows che permette all'app web Event4U di comunicare con il lettore Smart Card MiniLector EVO V3 per l'emissione di biglietti fiscali SIAE.

## Requisiti

- Windows 10/11
- Node.js 18+ (solo per sviluppo/build)
- Lettore Smart Card MiniLector EVO V3 (Bit4id)
- Driver Smart Card PC/SC installati

## Installazione per sviluppo

```bash
cd desktop-app
npm install
npm start
```

## Build per distribuzione

```bash
npm run build
```

L'installer verrà generato nella cartella `dist/`.

## Come funziona

1. L'applicazione avvia un server WebSocket sulla porta 18765
2. Monitora il lettore Smart Card via PC/SC
3. Invia aggiornamenti in tempo reale all'app web Event4U
4. L'app web può verificare lo stato della Smart Card prima di emettere biglietti

## Configurazione app web

L'app web Event4U si connette automaticamente a `ws://localhost:18765` per comunicare con il lettore.

## Supporto

Per assistenza contattare il supporto Event4U.
