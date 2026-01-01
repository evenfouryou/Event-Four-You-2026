# Event Four You SIAE Lettore

App desktop per la lettura di smart card SIAE e firma digitale CAdES-BES per il sistema Event4U.

**Versione:** 3.6

## Installazione

1. Scarica l'installer dalla sezione **Releases**
2. Esegui `Event Four You SIAE Lettore Setup.exe`
3. L'app si connetterà automaticamente al server

## Requisiti

- Windows 10/11
- Lettore smart card PC/SC compatibile
- Smart card SIAE con certificato digitale valido

## Funzionalità

- Lettura smart card SIAE (serial number, counter, balance)
- Generazione sigilli fiscali
- **Firma digitale CAdES-BES** con algoritmo SHA-256 (formato .p7m)
- Firma S/MIME per email PEC (Allegato C SIAE)
- Connessione WebSocket sicura al server relay
- Riconnessione automatica in caso di disconnessione
- Verifica PIN smart card
- Supporto multi-slot lettori

## Firma Digitale CAdES-BES

La firma CAdES-BES genera file .p7m binari conformi agli standard SIAE:
- Algoritmo: SHA-256 (sostituisce SHA-1 deprecato)
- Formato: PKCS#7 SignedData (CMS)
- Output: Base64 encoded per trasmissione sicura

## Changelog

### v3.6
- Aggiunto supporto firma S/MIME per email (Allegato C)
- Firma CAdES-BES con SHA-256
- Migliorata gestione certificati X.509
