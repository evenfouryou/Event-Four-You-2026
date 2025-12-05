using System;
using System.IO;
using System.Text;
using System.Threading;
using Newtonsoft.Json;

namespace SiaeBridge
{
    /// <summary>
    /// SiaeBridge - Bridge between Electron and libSIAE.dll
    /// Handles smart card reader communication with proper transaction management
    /// </summary>
    class Program
    {
        private static bool _initialized = false;
        private static bool _inTransaction = false;
        private static int _currentSlot = 0;
        private static StreamWriter _logWriter;
        private static readonly object _lockObj = new object();

        static void Main(string[] args)
        {
            // Setup logging
            string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "siae-bridge.log");
            _logWriter = new StreamWriter(logPath, true, Encoding.UTF8) { AutoFlush = true };
            
            Log("=".PadRight(50, '='));
            Log($"SiaeBridge starting at {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            Log($"Working directory: {AppDomain.CurrentDomain.BaseDirectory}");
            Log($"CLR Version: {Environment.Version}");
            Log($"OS: {Environment.OSVersion}");
            Log($"64-bit process: {Environment.Is64BitProcess}");
            
            // Check for libSIAE.dll
            string dllPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libSIAE.dll");
            if (File.Exists(dllPath))
            {
                var info = new FileInfo(dllPath);
                Log($"libSIAE.dll found: {info.Length} bytes");
            }
            else
            {
                Log("ERROR: libSIAE.dll NOT FOUND!");
            }
            
            Console.WriteLine("READY");
            Log("Bridge READY - waiting for commands");

            // Command loop
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;
                
                Log($">> Received: {line}");
                
                try
                {
                    string response = ProcessCommand(line);
                    Console.WriteLine(response);
                    Log($"<< Response: {response}");
                }
                catch (Exception ex)
                {
                    string error = JsonConvert.SerializeObject(new { 
                        success = false, 
                        error = ex.Message,
                        stackTrace = ex.StackTrace 
                    });
                    Console.WriteLine(error);
                    Log($"<< ERROR: {ex.Message}");
                }
            }
            
            Cleanup();
            Log("Bridge shutting down");
        }

        static void Log(string message)
        {
            try
            {
                _logWriter?.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] {message}");
            }
            catch { }
        }

        static string ProcessCommand(string command)
        {
            if (command == "EXIT")
            {
                Cleanup();
                Environment.Exit(0);
                return JsonConvert.SerializeObject(new { success = true });
            }

            if (command == "CHECK_READER")
            {
                return CheckReader();
            }

            if (command == "READ_CARD")
            {
                return ReadCard();
            }

            if (command.StartsWith("COMPUTE_SIGILLO:"))
            {
                string jsonData = command.Substring("COMPUTE_SIGILLO:".Length);
                return ComputeSigillo(jsonData);
            }

            if (command == "STATUS")
            {
                return GetStatus();
            }

            return JsonConvert.SerializeObject(new { 
                success = false, 
                error = $"Comando sconosciuto: {command}" 
            });
        }

        static string GetStatus()
        {
            return JsonConvert.SerializeObject(new {
                success = true,
                initialized = _initialized,
                inTransaction = _inTransaction,
                slot = _currentSlot
            });
        }

        static string CheckReader()
        {
            lock (_lockObj)
            {
                try
                {
                    Log("CheckReader: Starting...");
                    
                    // Check if card is present in any slot (0-15)
                    bool cardFound = false;
                    int foundSlot = -1;
                    
                    for (int slot = 0; slot < 16; slot++)
                    {
                        try
                        {
                            int result = LibSiae.isCardIn(slot);
                            Log($"  isCardIn({slot}) = {result}");
                            
                            if (result == 1)
                            {
                                cardFound = true;
                                foundSlot = slot;
                                _currentSlot = slot;
                                Log($"  Card found in slot {slot}");
                                break;
                            }
                        }
                        catch (Exception ex)
                        {
                            Log($"  isCardIn({slot}) exception: {ex.Message}");
                            break; // No more readers
                        }
                    }

                    if (!cardFound)
                    {
                        return JsonConvert.SerializeObject(new {
                            success = true,
                            readerConnected = true,
                            cardPresent = false,
                            message = "Lettore connesso, inserire la carta"
                        });
                    }

                    // Try to initialize if card is present
                    if (!_initialized)
                    {
                        Log($"Initializing slot {foundSlot}...");
                        int initResult = LibSiae.Initialize(foundSlot);
                        Log($"Initialize result: {initResult} ({LibSiae.GetErrorMessage(initResult)})");
                        
                        if (initResult == LibSiae.C_OK || initResult == LibSiae.C_ALREADY_INITIALIZED)
                        {
                            _initialized = true;
                        }
                        else
                        {
                            return JsonConvert.SerializeObject(new {
                                success = false,
                                readerConnected = true,
                                cardPresent = true,
                                error = $"Errore inizializzazione: {LibSiae.GetErrorMessage(initResult)}"
                            });
                        }
                    }

                    return JsonConvert.SerializeObject(new {
                        success = true,
                        readerConnected = true,
                        cardPresent = true,
                        slot = foundSlot,
                        initialized = _initialized,
                        message = "Carta SIAE rilevata"
                    });
                }
                catch (DllNotFoundException ex)
                {
                    Log($"DLL not found: {ex.Message}");
                    return JsonConvert.SerializeObject(new {
                        success = false,
                        readerConnected = false,
                        error = "libSIAE.dll non trovata"
                    });
                }
                catch (Exception ex)
                {
                    Log($"CheckReader error: {ex.Message}");
                    return JsonConvert.SerializeObject(new {
                        success = false,
                        error = ex.Message
                    });
                }
            }
        }

        static string ReadCard()
        {
            lock (_lockObj)
            {
                try
                {
                    Log("ReadCard: Starting...");
                    
                    // Verify card is still present
                    int cardCheck = LibSiae.isCardIn(_currentSlot);
                    if (cardCheck != 1)
                    {
                        _initialized = false;
                        return JsonConvert.SerializeObject(new {
                            success = false,
                            error = "Carta non presente"
                        });
                    }

                    // Initialize if needed
                    if (!_initialized)
                    {
                        int initResult = LibSiae.Initialize(_currentSlot);
                        if (initResult != LibSiae.C_OK && initResult != LibSiae.C_ALREADY_INITIALIZED)
                        {
                            return JsonConvert.SerializeObject(new {
                                success = false,
                                error = $"Inizializzazione fallita: {LibSiae.GetErrorMessage(initResult)}"
                            });
                        }
                        _initialized = true;
                    }

                    // Begin transaction to prevent card disconnect
                    Log("BeginTransaction...");
                    int txResult = LibSiae.BeginTransaction();
                    Log($"BeginTransaction result: {txResult}");
                    _inTransaction = (txResult == LibSiae.C_OK);

                    try
                    {
                        // Read serial number
                        byte[] serial = new byte[8];
                        int snResult = LibSiae.GetSN(serial);
                        Log($"GetSN result: {snResult}");
                        
                        if (snResult != LibSiae.C_OK)
                        {
                            return JsonConvert.SerializeObject(new {
                                success = false,
                                error = $"Errore lettura SN: {LibSiae.GetErrorMessage(snResult)}"
                            });
                        }

                        // Read counter
                        uint counter = 0;
                        int cntResult = LibSiae.ReadCounter(ref counter);
                        Log($"ReadCounter result: {cntResult}, value: {counter}");

                        // Read balance
                        uint balance = 0;
                        int balResult = LibSiae.ReadBalance(ref balance);
                        Log($"ReadBalance result: {balResult}, value: {balance}");

                        // Get Key ID
                        byte keyId = LibSiae.GetKeyID();
                        Log($"KeyID: {keyId}");

                        return JsonConvert.SerializeObject(new {
                            success = true,
                            serialNumber = LibSiae.BytesToHex(serial),
                            counter = counter,
                            balance = balance,
                            keyId = keyId,
                            slot = _currentSlot
                        });
                    }
                    finally
                    {
                        // Always end transaction
                        if (_inTransaction)
                        {
                            Log("EndTransaction...");
                            LibSiae.EndTransaction();
                            _inTransaction = false;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log($"ReadCard error: {ex.Message}");
                    _inTransaction = false;
                    return JsonConvert.SerializeObject(new {
                        success = false,
                        error = ex.Message
                    });
                }
            }
        }

        static string ComputeSigillo(string jsonData)
        {
            lock (_lockObj)
            {
                try
                {
                    Log($"ComputeSigillo: {jsonData}");
                    
                    var data = JsonConvert.DeserializeObject<SigilloRequest>(jsonData);
                    
                    // Verify card is present
                    int cardCheck = LibSiae.isCardIn(_currentSlot);
                    if (cardCheck != 1)
                    {
                        _initialized = false;
                        return JsonConvert.SerializeObject(new {
                            success = false,
                            error = "Carta non presente"
                        });
                    }

                    // Initialize if needed
                    if (!_initialized)
                    {
                        int initResult = LibSiae.Initialize(_currentSlot);
                        if (initResult != LibSiae.C_OK && initResult != LibSiae.C_ALREADY_INITIALIZED)
                        {
                            return JsonConvert.SerializeObject(new {
                                success = false,
                                error = $"Inizializzazione fallita: {LibSiae.GetErrorMessage(initResult)}"
                            });
                        }
                        _initialized = true;
                    }

                    // Begin transaction
                    Log("BeginTransaction for sigillo...");
                    int txResult = LibSiae.BeginTransaction();
                    _inTransaction = (txResult == LibSiae.C_OK);

                    try
                    {
                        // Prepare date/time in BCD format
                        DateTime dt = data.dateTime ?? DateTime.Now;
                        byte[] dataOra = LibSiae.DateTimeToBCD(dt);
                        Log($"DateTime: {dt:yyyy-MM-dd HH:mm}, BCD: {LibSiae.BytesToHex(dataOra)}");

                        // Price in cents
                        uint prezzo = (uint)(data.price * 100);
                        Log($"Price: {data.price} EUR = {prezzo} cents");

                        // Output buffers
                        byte[] serialNumber = new byte[8];
                        byte[] mac = new byte[8];
                        uint counter = 0;

                        // Compute sigillo
                        Log("Calling ComputeSigillo...");
                        int result = LibSiae.ComputeSigillo(dataOra, prezzo, serialNumber, mac, ref counter);
                        Log($"ComputeSigillo result: {result} ({LibSiae.GetErrorMessage(result)})");

                        if (result != LibSiae.C_OK)
                        {
                            return JsonConvert.SerializeObject(new {
                                success = false,
                                error = $"Errore sigillo: {LibSiae.GetErrorMessage(result)}"
                            });
                        }

                        return JsonConvert.SerializeObject(new {
                            success = true,
                            sigillo = new {
                                serialNumber = LibSiae.BytesToHex(serialNumber),
                                mac = LibSiae.BytesToHex(mac),
                                counter = counter,
                                dateTime = dt.ToString("yyyy-MM-dd HH:mm"),
                                price = data.price
                            }
                        });
                    }
                    finally
                    {
                        if (_inTransaction)
                        {
                            Log("EndTransaction...");
                            LibSiae.EndTransaction();
                            _inTransaction = false;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log($"ComputeSigillo error: {ex.Message}");
                    _inTransaction = false;
                    return JsonConvert.SerializeObject(new {
                        success = false,
                        error = ex.Message
                    });
                }
            }
        }

        static void Cleanup()
        {
            lock (_lockObj)
            {
                try
                {
                    if (_inTransaction)
                    {
                        LibSiae.EndTransaction();
                        _inTransaction = false;
                    }
                    if (_initialized)
                    {
                        LibSiae.Finalize();
                        _initialized = false;
                    }
                }
                catch { }
            }
        }

        class SigilloRequest
        {
            public decimal price { get; set; }
            public DateTime? dateTime { get; set; }
        }
    }
}
