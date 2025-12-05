using System;
using System.Runtime.InteropServices;
using System.Text;

namespace SiaeBridge
{
    /// <summary>
    /// P/Invoke wrapper for libSIAE.dll - SIAE smart card library
    /// Based on official SIAE documentation and header files
    /// </summary>
    public static class LibSiae
    {
        private const string DLL_NAME = "libSIAE.dll";

        #region Error Codes
        public const int C_OK = 0x0000;
        public const int C_CONTEXT_ERROR = 0x0001;
        public const int C_NOT_INITIALIZED = 0x0002;
        public const int C_ALREADY_INITIALIZED = 0x0003;
        public const int C_NO_CARD = 0x0004;
        public const int C_UNKNOWN_CARD = 0x0005;
        public const int C_WRONG_LENGTH = 0x6282;
        public const int C_WRONG_TYPE = 0x6981;
        public const int C_NOT_AUTHORIZED = 0x6982;
        public const int C_PIN_BLOCKED = 0x6983;
        public const int C_WRONG_DATA = 0x6A80;
        public const int C_FILE_NOT_FOUND = 0x6A82;
        public const int C_RECORD_NOT_FOUND = 0x6A83;
        public const int C_WRONG_LEN = 0x6A85;
        public const int C_UNKNOWN_OBJECT = 0x6A88;
        public const int C_ALREADY_EXISTS = 0x6A89;
        public const int C_GENERIC_ERROR = 0xFFFF;
        #endregion

        #region Initialization & Status Functions
        /// <summary>
        /// Check if card is present in slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int isCardIn(int nSlot);

        /// <summary>
        /// Check if library is initialized
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int IsInitialized();

        /// <summary>
        /// Initialize connection to card in specified slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Initialize(int nSlot);

        /// <summary>
        /// Finalize (close) connection to card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Finalize();

        /// <summary>
        /// Finalize connection for specific slot (multi-reader)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int FinalizeML(int nSlot);
        #endregion

        #region Transaction Functions
        /// <summary>
        /// Begin exclusive transaction with card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int BeginTransaction();

        /// <summary>
        /// End transaction with card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int EndTransaction();

        /// <summary>
        /// Begin transaction for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int BeginTransactionML(int nSlot);

        /// <summary>
        /// End transaction for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int EndTransactionML(int nSlot);
        #endregion

        #region Card Information Functions
        /// <summary>
        /// Get card serial number (8 bytes)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSN(byte[] serial);

        /// <summary>
        /// Get serial number for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSNML(byte[] serial, int nSlot);

        /// <summary>
        /// Get current counter value
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadCounter(ref uint value);

        /// <summary>
        /// Get counter for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadCounterML(ref uint value, int nSlot);

        /// <summary>
        /// Get balance value
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadBalance(ref uint value);
        #endregion

        #region Certificate Functions
        /// <summary>
        /// Get card certificate
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetCertificate(byte[] cert, ref int dim);

        /// <summary>
        /// Get CA certificate
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetCACertificate(byte[] cert, ref int dim);

        /// <summary>
        /// Get SIAE certificate
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int GetSIAECertificate(byte[] cert, ref int dim);

        /// <summary>
        /// Get key ID
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern byte GetKeyID();
        #endregion

        #region PIN Functions
        /// <summary>
        /// Verify PIN
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int VerifyPIN(int nPIN, string pin);

        /// <summary>
        /// Verify PIN for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int VerifyPINML(int nPIN, string pin, int nSlot);

        /// <summary>
        /// Change PIN
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int ChangePIN(int nPIN, string oldPin, string newPin);

        /// <summary>
        /// Unblock PIN with PUK
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall, CharSet = CharSet.Ansi)]
        public static extern int UnblockPIN(int nPIN, string puk, string newPin);
        #endregion

        #region Sigillo (Fiscal Seal) Functions
        /// <summary>
        /// Compute fiscal seal (sigillo) - main function for ticket validation
        /// </summary>
        /// <param name="dataOra">Date/time bytes (format: YYMMDDHHmm - 5 bytes BCD)</param>
        /// <param name="prezzo">Price in cents</param>
        /// <param name="serialNumber">Output: card serial number (8 bytes)</param>
        /// <param name="mac">Output: MAC signature (8 bytes)</param>
        /// <param name="counter">Output: transaction counter</param>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigillo(byte[] dataOra, uint prezzo, byte[] serialNumber, byte[] mac, ref uint counter);

        /// <summary>
        /// Compute sigillo for specific slot
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigilloML(byte[] dataOra, uint prezzo, byte[] serialNumber, byte[] mac, ref uint counter, int nSlot);

        /// <summary>
        /// Compute sigillo extended (without SN output)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigilloEx(byte[] dataOra, uint prezzo, byte[] mac, ref uint counter);

        /// <summary>
        /// Fast sigillo computation
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ComputeSigilloFast(byte[] dataOra, uint prezzo, byte[] serialNumber, byte[] mac, ref uint counter);
        #endregion

        #region Cryptographic Functions
        /// <summary>
        /// Sign data with card key
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Sign(int keyIndex, byte[] toSign, byte[] signed);

        /// <summary>
        /// Hash data (SHA1 or MD5)
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Hash(int mechanism, byte[] toHash, int len, byte[] hashed);

        /// <summary>
        /// Pad data for cryptographic operations
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Padding(byte[] toPad, int len, byte[] padded);
        #endregion

        #region File Operations
        /// <summary>
        /// Select file on card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int Select(ushort fid);

        /// <summary>
        /// Read binary data from card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadBinary(ushort offset, byte[] buffer, ref int len);

        /// <summary>
        /// Read record from card
        /// </summary>
        [DllImport(DLL_NAME, CallingConvention = CallingConvention.StdCall)]
        public static extern int ReadRecord(int nRec, byte[] buffer, ref int len);
        #endregion

        #region Helper Methods
        /// <summary>
        /// Convert error code to human-readable message
        /// </summary>
        public static string GetErrorMessage(int errorCode)
        {
            switch (errorCode)
            {
                case C_OK: return "OK";
                case C_CONTEXT_ERROR: return "Errore contesto smart card";
                case C_NOT_INITIALIZED: return "Libreria non inizializzata";
                case C_ALREADY_INITIALIZED: return "Libreria già inizializzata";
                case C_NO_CARD: return "Nessuna carta presente";
                case C_UNKNOWN_CARD: return "Carta non riconosciuta";
                case C_WRONG_LENGTH: return "Lunghezza dati errata";
                case C_WRONG_TYPE: return "Tipo file errato";
                case C_NOT_AUTHORIZED: return "Non autorizzato (PIN errato?)";
                case C_PIN_BLOCKED: return "PIN bloccato";
                case C_WRONG_DATA: return "Dati errati";
                case C_FILE_NOT_FOUND: return "File non trovato";
                case C_RECORD_NOT_FOUND: return "Record non trovato";
                case C_WRONG_LEN: return "Lunghezza errata";
                case C_UNKNOWN_OBJECT: return "Oggetto sconosciuto";
                case C_ALREADY_EXISTS: return "Già esistente";
                case C_GENERIC_ERROR: return "Errore generico";
                default: return $"Errore sconosciuto (0x{errorCode:X4})";
            }
        }

        /// <summary>
        /// Convert DateTime to SIAE BCD format (YYMMDDHHmm)
        /// </summary>
        public static byte[] DateTimeToBCD(DateTime dt)
        {
            byte[] bcd = new byte[5];
            bcd[0] = (byte)(((dt.Year % 100) / 10 << 4) | (dt.Year % 10));
            bcd[1] = (byte)((dt.Month / 10 << 4) | (dt.Month % 10));
            bcd[2] = (byte)((dt.Day / 10 << 4) | (dt.Day % 10));
            bcd[3] = (byte)((dt.Hour / 10 << 4) | (dt.Hour % 10));
            bcd[4] = (byte)((dt.Minute / 10 << 4) | (dt.Minute % 10));
            return bcd;
        }

        /// <summary>
        /// Convert bytes to hex string
        /// </summary>
        public static string BytesToHex(byte[] bytes)
        {
            if (bytes == null) return "";
            StringBuilder sb = new StringBuilder(bytes.Length * 2);
            foreach (byte b in bytes)
                sb.AppendFormat("{0:X2}", b);
            return sb.ToString();
        }
        #endregion
    }
}
