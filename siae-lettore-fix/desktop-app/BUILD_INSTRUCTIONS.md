# 🔧 Event Four You SIAE Lettore v3.10

## Versione Corrente: 3.10 (Gennaio 2025)

Applicazione desktop per la lettura e firma digitale con smart card SIAE.

---

## 📁 Struttura File

```
SiaeBridge/
├── Program.cs              (Bridge .NET)
├── SiaeBridge.csproj       (Configurazione build)
├── LibSiae.cs              (Wrapper libSIAE.dll)
├── SIAEReader.cs           (Helper lettura carta)
├── libSIAEp7.dll           (Firma P7M/CAdES-BES)
└── prebuilt/
    ├── libSIAE.dll         (Lettura smart card)
    └── Newtonsoft.Json.dll (JSON)
```

---

## 🚀 Build Rapida

```powershell
# 1. Scarica/Aggiorna
git pull origin main

# 2. Compila il bridge .NET (32-bit)
dotnet build SiaeBridge\SiaeBridge.csproj -c Release

# 3. Verifica le DLL
dir SiaeBridge\bin\Release\net8.0-windows\win-x86\*.dll
# Devono esserci: libSIAE.dll, libSIAEp7.dll, Newtonsoft.Json.dll

# 4. Avvia l'app Electron
npm install
npm start
```

---

## 📋 Funzionalità

- **Lettura Smart Card SIAE** - Seriale, counter, balance, keyId
- **Verifica PIN** - Autenticazione sulla carta
- **Cambio PIN** - Modifica PIN utente
- **Sigilli Fiscali** - Generazione automatica per biglietti
- **Firma Digitale P7M** - CAdES-BES con libSIAEp7.dll per report C1
- **Connessione Server** - WebSocket a manage.eventfouryou.com

---

## 🔍 Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Bridge non trovato | Esegui `dotnet build -c Release` |
| DLL non trovata | Verifica che prebuilt/ contenga libSIAE.dll |
| PIN bloccato | Usa PUK per sbloccare |
| Firma fallisce | Verifica che libSIAEp7.dll sia nella cartella output |

---

## 📝 Log

Il log del bridge si trova in:
- `%APPDATA%\event-four-you-siae-lettore\event4u-siae.log`
- `SiaeBridge\bridge.log` (nella cartella dell'exe)
