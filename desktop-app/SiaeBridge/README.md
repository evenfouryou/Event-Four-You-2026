# Event Four You SIAE Lettore

Bridge .NET per smart card SIAE con libSIAE.dll

## Requisiti

- Windows 7/8/10/11 (x86 o x64)
- .NET Framework 4.7.2
- libSIAE.dll nella stessa cartella dell'eseguibile
- Lettore smart card MiniLector EVO V3 (o compatibile)

## Compilazione

```bash
# Con .NET SDK
dotnet build -c Release

# Oppure con Visual Studio
# Aprire SiaeBridge.csproj e compilare in Release
```

## Utilizzo

1. Copiare `libSIAE.dll` nella cartella dell'eseguibile
2. Avviare `EventFourYouSiaeLettore.exe`
3. L'applicazione si avvia nella system tray
4. Il server WebSocket è disponibile su `ws://127.0.0.1:18766`

## API WebSocket

### Comandi

| Comando | Descrizione |
|---------|-------------|
| `getStatus` | Ottiene lo stato corrente |
| `ping` | Test connessione |
| `enableDemo` | Attiva modalità demo |
| `disableDemo` | Disattiva modalità demo |
| `verifyPin` | Verifica PIN smart card |
| `computeSigillo` | Genera sigillo fiscale |
| `sign` | Firma digitale |
| `getCertificate` | Ottiene certificato SIAE |
| `getSerial` | Ottiene seriale smart card |

### Esempio richiesta

```json
{
  "type": "computeSigillo",
  "data": {
    "ticketData": "BIGLIETTO-001-2024"
  }
}
```

### Esempio risposta

```json
{
  "type": "sealResponse",
  "success": true,
  "seal": {
    "sealCode": "A1B2C3D4E5F6...",
    "timestamp": "2024-01-01T12:00:00Z",
    "cardSerial": "12345678"
  }
}
```

## Health Check HTTP

GET `http://127.0.0.1:18766/health`

Restituisce lo stato in formato JSON.

## Integrazione con Event4U Web

L'applicazione web Event4U si connette automaticamente al bridge tramite WebSocket per:

- Verificare presenza smart card
- Generare sigilli fiscali per i biglietti
- Firmare documenti XML per trasmissione SIAE
- Leggere certificati dalla smart card

## Licenza

Copyright © 2024 Event Four You
