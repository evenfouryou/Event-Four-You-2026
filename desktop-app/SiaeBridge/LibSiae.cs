using System;
using System.Runtime.InteropServices;
using System.Text;

namespace EventFourYouSiaeLettore
{
    /// <summary>
    /// P/Invoke wrapper per libSIAE.dll
    /// Libreria SIAE per smart card fiscali
    /// </summary>
    public static class LibSiae
    {
        private const string DLL_NAME = "libSIAE.dll";

        // Codici di ritorno
        public const int SIAE_OK = 0;
        public const int SIAE_ERROR = -1;
        public const int SIAE_NO_CARD = -2;
        public const int SIAE_PIN_BLOCKED = -3;
        public const int SIAE_PIN_WRONG = -4;

        #region Inizializzazione

        /// <summary>
        /// Inizializza la libreria e connette al lettore
        /// </summary>
        /// <returns>0 se OK, codice errore altrimenti</returns>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int Initialize();

        /// <summary>
        /// Inizializza con slot specifico (multi-lettore)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int InitializeML(int nSlot);

        /// <summary>
        /// Chiude la connessione e rilascia risorse
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int Finalize();

        /// <summary>
        /// Chiude connessione per slot specifico
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int FinalizeML(int nSlot);

        #endregion

        #region Transazioni

        /// <summary>
        /// Inizia una transazione con la smart card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int BeginTransaction();

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int BeginTransactionML(int nSlot);

        /// <summary>
        /// Termina la transazione corrente
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int EndTransaction();

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int EndTransactionML(int nSlot);

        #endregion

        #region PIN

        /// <summary>
        /// Verifica il PIN della smart card
        /// </summary>
        /// <param name="pinId">ID del PIN (solitamente 1)</param>
        /// <param name="pin">PIN in formato stringa</param>
        /// <param name="pinLen">Lunghezza del PIN</param>
        /// <returns>0 se OK, codice errore altrimenti</returns>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        public static extern int VerifyPIN(int pinId, string pin, int pinLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        public static extern int VerifyPINML(int nSlot, int pinId, string pin, int pinLen);

        /// <summary>
        /// Sblocca il PIN bloccato
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        public static extern int UnblockPIN(int pinId, string puk, string newPin, int newPinLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        public static extern int UnblockPINML(int nSlot, int pinId, string puk, string newPin, int newPinLen);

        /// <summary>
        /// Cambia il PIN
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        public static extern int ChangePIN(int pinId, string oldPin, string newPin, int newPinLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
        public static extern int ChangePINML(int nSlot, int pinId, string oldPin, string newPin, int newPinLen);

        #endregion

        #region Certificati

        /// <summary>
        /// Ottiene il certificato SIAE dalla smart card
        /// </summary>
        /// <param name="cert">Buffer per il certificato (allocare almeno 4096 byte)</param>
        /// <param name="certLen">Puntatore alla dimensione del buffer/certificato</param>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetSIAECertificate(byte[] cert, ref int certLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetSIAECertificateML(int nSlot, byte[] cert, ref int certLen);

        /// <summary>
        /// Ottiene il certificato CA
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetCACertificate(byte[] cert, ref int certLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetCACertificateML(int nSlot, byte[] cert, ref int certLen);

        /// <summary>
        /// Ottiene un certificato generico
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetCertificate(byte[] cert, ref int certLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetCertificateML(int nSlot, byte[] cert, ref int certLen);

        #endregion

        #region Identificazione

        /// <summary>
        /// Ottiene il numero seriale della smart card
        /// </summary>
        /// <param name="sn">Buffer per il seriale (almeno 32 byte)</param>
        /// <param name="snLen">Puntatore alla dimensione</param>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetSN(byte[] sn, ref int snLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetSNML(int nSlot, byte[] sn, ref int snLen);

        /// <summary>
        /// Ottiene l'ID della chiave
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetKeyID(byte[] keyId, ref int keyIdLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int GetKeyIDML(int nSlot, byte[] keyId, ref int keyIdLen);

        #endregion

        #region Sigillo Fiscale

        /// <summary>
        /// Calcola il sigillo fiscale per un biglietto
        /// </summary>
        /// <param name="data">Dati del biglietto</param>
        /// <param name="dataLen">Lunghezza dati</param>
        /// <param name="sigillo">Buffer per il sigillo (almeno 32 byte)</param>
        /// <param name="sigilloLen">Puntatore alla dimensione</param>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ComputeSigillo(byte[] data, int dataLen, byte[] sigillo, ref int sigilloLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ComputeSigilloML(int nSlot, byte[] data, int dataLen, byte[] sigillo, ref int sigilloLen);

        /// <summary>
        /// Calcola sigillo fiscale esteso
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ComputeSigilloEx(byte[] data, int dataLen, byte[] sigillo, ref int sigilloLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ComputeSigilloExML(int nSlot, byte[] data, int dataLen, byte[] sigillo, ref int sigilloLen);

        /// <summary>
        /// Calcola sigillo fiscale veloce (ottimizzato)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ComputeSigilloFast(byte[] data, int dataLen, byte[] sigillo, ref int sigilloLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ComputeSigilloFastML(int nSlot, byte[] data, int dataLen, byte[] sigillo, ref int sigilloLen);

        #endregion

        #region Firma Digitale

        /// <summary>
        /// Firma digitalmente i dati
        /// </summary>
        /// <param name="data">Dati da firmare</param>
        /// <param name="dataLen">Lunghezza dati</param>
        /// <param name="signature">Buffer per la firma (almeno 512 byte)</param>
        /// <param name="signatureLen">Puntatore alla dimensione</param>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int Sign(byte[] data, int dataLen, byte[] signature, ref int signatureLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int SignML(int nSlot, byte[] data, int dataLen, byte[] signature, ref int signatureLen);

        #endregion

        #region Lettura Dati

        /// <summary>
        /// Legge dati binari dalla smart card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadBinary(int offset, byte[] data, ref int dataLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadBinaryML(int nSlot, int offset, byte[] data, ref int dataLen);

        /// <summary>
        /// Legge un record dalla smart card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadRecord(int recordNum, byte[] data, ref int dataLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadRecordML(int nSlot, int recordNum, byte[] data, ref int dataLen);

        /// <summary>
        /// Legge il saldo/contatore dalla smart card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadBalance(ref int balance);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadBalanceML(int nSlot, ref int balance);

        /// <summary>
        /// Legge il contatore progressivo
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadCounter(ref int counter);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int ReadCounterML(int nSlot, ref int counter);

        #endregion

        #region APDU

        /// <summary>
        /// Invia un comando APDU diretto alla smart card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int SendAPDU(byte[] apduIn, int apduInLen, byte[] apduOut, ref int apduOutLen);

        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int SendAPDUML(int nSlot, byte[] apduIn, int apduInLen, byte[] apduOut, ref int apduOutLen);

        #endregion

        #region Stato

        /// <summary>
        /// Verifica se una smart card è inserita nel lettore
        /// </summary>
        /// <returns>1 se carta presente, 0 altrimenti</returns>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.Cdecl)]
        public static extern int isCardIn();

        #endregion

        #region Helper Methods

        /// <summary>
        /// Converte il codice di errore in messaggio leggibile
        /// </summary>
        public static string GetErrorMessage(int errorCode)
        {
            switch (errorCode)
            {
                case SIAE_OK: return "Operazione completata con successo";
                case SIAE_ERROR: return "Errore generico";
                case SIAE_NO_CARD: return "Smart card non inserita";
                case SIAE_PIN_BLOCKED: return "PIN bloccato";
                case SIAE_PIN_WRONG: return "PIN errato";
                default: return $"Errore sconosciuto: 0x{errorCode:X8}";
            }
        }

        /// <summary>
        /// Verifica se la libreria è caricabile
        /// </summary>
        public static bool IsLibraryAvailable()
        {
            try
            {
                var handle = LoadLibrary(DLL_NAME);
                if (handle != IntPtr.Zero)
                {
                    FreeLibrary(handle);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr LoadLibrary(string lpFileName);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool FreeLibrary(IntPtr hModule);

        #endregion
    }
}
