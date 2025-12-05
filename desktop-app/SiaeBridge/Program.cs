using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;

namespace EventFourYouSiaeLettore
{
    static class Program
    {
        private const int WS_PORT = 18766;
        private static HttpListener _httpListener;
        private static readonly List<WebSocket> _clients = new List<WebSocket>();
        private static NotifyIcon _trayIcon;
        private static bool _isInitialized = false;
        private static string _readerName = null;
        private static bool _cardPresent = false;
        private static string _cardSerial = null;
        private static string _lastError = null;
        private static bool _demoMode = false;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Crea icona nella system tray
            CreateTrayIcon();

            // Avvia server WebSocket
            Task.Run(() => StartWebSocketServer());

            // Inizializza libreria SIAE
            Task.Run(() => InitializeSiae());

            // Polling stato carta
            Task.Run(() => PollCardStatus());

            Application.Run();
        }

        static void CreateTrayIcon()
        {
            _trayIcon = new NotifyIcon();
            _trayIcon.Icon = System.Drawing.SystemIcons.Application;
            _trayIcon.Text = "Event Four You SIAE Lettore";
            _trayIcon.Visible = true;

            var menu = new ContextMenuStrip();
            menu.Items.Add("Stato: In attesa...", null, null);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Attiva Demo", null, (s, e) => EnableDemoMode());
            menu.Items.Add("Disattiva Demo", null, (s, e) => DisableDemoMode());
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Esci", null, (s, e) => ExitApplication());

            _trayIcon.ContextMenuStrip = menu;
            _trayIcon.DoubleClick += (s, e) => ShowStatus();
        }

        static void UpdateTrayStatus()
        {
            if (_trayIcon?.ContextMenuStrip == null) return;

            string status;
            if (_demoMode)
            {
                status = "Stato: DEMO MODE";
                _trayIcon.Icon = System.Drawing.SystemIcons.Warning;
            }
            else if (!_isInitialized)
            {
                status = "Stato: Inizializzazione...";
                _trayIcon.Icon = System.Drawing.SystemIcons.Information;
            }
            else if (!_cardPresent)
            {
                status = "Stato: Smart card non inserita";
                _trayIcon.Icon = System.Drawing.SystemIcons.Error;
            }
            else
            {
                status = $"Stato: Pronto ({_cardSerial})";
                _trayIcon.Icon = System.Drawing.SystemIcons.Shield;
            }

            _trayIcon.ContextMenuStrip.Items[0].Text = status;
            _trayIcon.Text = "Event Four You SIAE\n" + status;
        }

        static void ShowStatus()
        {
            var msg = $"Event Four You SIAE Lettore\n\n" +
                      $"Libreria: {(LibSiae.IsLibraryAvailable() ? "OK" : "Non trovata")}\n" +
                      $"Inizializzato: {(_isInitialized ? "Sì" : "No")}\n" +
                      $"Lettore: {_readerName ?? "N/A"}\n" +
                      $"Smart Card: {(_cardPresent ? "Inserita" : "Non inserita")}\n" +
                      $"Seriale: {_cardSerial ?? "N/A"}\n" +
                      $"Demo Mode: {(_demoMode ? "Attivo" : "Disattivo")}\n" +
                      $"Server: ws://127.0.0.1:{WS_PORT}\n" +
                      $"Ultimo errore: {_lastError ?? "Nessuno"}";
            
            MessageBox.Show(msg, "Event Four You SIAE Lettore", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        static void EnableDemoMode()
        {
            _demoMode = true;
            _cardPresent = true;
            _cardSerial = "DEMO-12345678";
            _readerName = "MiniLector EVO V3 (DEMO)";
            UpdateTrayStatus();
            BroadcastStatus();
            _trayIcon.ShowBalloonTip(3000, "Demo Mode", "Modalità demo attivata", ToolTipIcon.Warning);
        }

        static void DisableDemoMode()
        {
            _demoMode = false;
            _cardPresent = false;
            _cardSerial = null;
            UpdateTrayStatus();
            BroadcastStatus();
            _trayIcon.ShowBalloonTip(3000, "Demo Mode", "Modalità demo disattivata", ToolTipIcon.Info);
        }

        static void ExitApplication()
        {
            try
            {
                if (_isInitialized && !_demoMode)
                {
                    LibSiae.Finalize();
                }
            }
            catch { }

            _trayIcon.Visible = false;
            _httpListener?.Stop();
            Application.Exit();
        }

        static void InitializeSiae()
        {
            try
            {
                if (!LibSiae.IsLibraryAvailable())
                {
                    _lastError = "libSIAE.dll non trovata";
                    UpdateTrayStatus();
                    return;
                }

                int result = LibSiae.Initialize();
                if (result == LibSiae.SIAE_OK)
                {
                    _isInitialized = true;
                    _readerName = "MiniLector EVO V3";
                    _lastError = null;
                    _trayIcon.ShowBalloonTip(3000, "SIAE Lettore", "Lettore inizializzato correttamente", ToolTipIcon.Info);
                }
                else
                {
                    _lastError = LibSiae.GetErrorMessage(result);
                }
                UpdateTrayStatus();
            }
            catch (Exception ex)
            {
                _lastError = ex.Message;
                UpdateTrayStatus();
            }
        }

        static async Task PollCardStatus()
        {
            while (true)
            {
                try
                {
                    if (_demoMode)
                    {
                        await Task.Delay(2000);
                        continue;
                    }

                    if (_isInitialized)
                    {
                        int cardIn = LibSiae.isCardIn();
                        bool wasPresent = _cardPresent;
                        _cardPresent = cardIn == 1;

                        if (_cardPresent && !wasPresent)
                        {
                            // Carta appena inserita, leggi seriale
                            ReadCardSerial();
                            _trayIcon.ShowBalloonTip(2000, "Smart Card", "Carta SIAE inserita", ToolTipIcon.Info);
                        }
                        else if (!_cardPresent && wasPresent)
                        {
                            _cardSerial = null;
                            _trayIcon.ShowBalloonTip(2000, "Smart Card", "Carta SIAE rimossa", ToolTipIcon.Warning);
                        }

                        UpdateTrayStatus();
                        BroadcastStatus();
                    }
                }
                catch (Exception ex)
                {
                    _lastError = ex.Message;
                }

                await Task.Delay(1500);
            }
        }

        static void ReadCardSerial()
        {
            try
            {
                byte[] sn = new byte[64];
                int snLen = sn.Length;
                int result = LibSiae.GetSN(sn, ref snLen);
                if (result == LibSiae.SIAE_OK && snLen > 0)
                {
                    _cardSerial = Encoding.ASCII.GetString(sn, 0, snLen).TrimEnd('\0');
                }
            }
            catch { }
        }

        static async Task StartWebSocketServer()
        {
            _httpListener = new HttpListener();
            _httpListener.Prefixes.Add($"http://127.0.0.1:{WS_PORT}/");
            
            try
            {
                _httpListener.Start();
                Console.WriteLine($"Server WebSocket avviato su ws://127.0.0.1:{WS_PORT}");

                while (_httpListener.IsListening)
                {
                    var context = await _httpListener.GetContextAsync();
                    
                    if (context.Request.IsWebSocketRequest)
                    {
                        ProcessWebSocketRequest(context);
                    }
                    else if (context.Request.Url.AbsolutePath == "/health")
                    {
                        // Health check HTTP
                        var response = GetStatusJson();
                        var buffer = Encoding.UTF8.GetBytes(response);
                        context.Response.ContentType = "application/json";
                        context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                        await context.Response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                        context.Response.Close();
                    }
                    else
                    {
                        context.Response.StatusCode = 404;
                        context.Response.Close();
                    }
                }
            }
            catch (Exception ex)
            {
                _lastError = $"Server error: {ex.Message}";
            }
        }

        static async void ProcessWebSocketRequest(HttpListenerContext context)
        {
            WebSocket ws = null;
            try
            {
                var wsContext = await context.AcceptWebSocketAsync(null);
                ws = wsContext.WebSocket;
                
                lock (_clients)
                {
                    _clients.Add(ws);
                }

                // Invia stato iniziale
                await SendMessage(ws, GetStatusJson());

                var buffer = new byte[4096];
                while (ws.State == WebSocketState.Open)
                {
                    var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        var response = ProcessCommand(message);
                        await SendMessage(ws, response);
                    }
                }
            }
            catch { }
            finally
            {
                if (ws != null)
                {
                    lock (_clients)
                    {
                        _clients.Remove(ws);
                    }
                    try { ws.Dispose(); } catch { }
                }
            }
        }

        static string ProcessCommand(string messageJson)
        {
            try
            {
                var msg = JsonConvert.DeserializeObject<CommandMessage>(messageJson);
                
                switch (msg.type?.ToLower())
                {
                    case "getstatus":
                    case "get_status":
                    case "status":
                        return GetStatusJson();

                    case "ping":
                        return JsonConvert.SerializeObject(new { type = "pong", timestamp = DateTime.UtcNow });

                    case "enabledemo":
                        EnableDemoMode();
                        return GetStatusJson();

                    case "disabledemo":
                        DisableDemoMode();
                        return GetStatusJson();

                    case "verifypin":
                        return VerifyPin(msg.data);

                    case "computesigillo":
                    case "requestseal":
                        return ComputeSigillo(msg.data);

                    case "sign":
                        return SignData(msg.data);

                    case "getcertificate":
                        return GetCertificate();

                    case "getserial":
                        return GetSerial();

                    default:
                        return JsonConvert.SerializeObject(new { type = "error", message = $"Comando sconosciuto: {msg.type}" });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "error", message = ex.Message });
            }
        }

        static string GetStatusJson()
        {
            return JsonConvert.SerializeObject(new
            {
                type = "status",
                data = new
                {
                    connected = true,
                    initialized = _isInitialized || _demoMode,
                    readerDetected = _isInitialized || _demoMode,
                    readerConnected = _isInitialized || _demoMode,
                    readerName = _readerName,
                    cardInserted = _cardPresent,
                    cardSerial = _cardSerial,
                    canEmitTickets = _cardPresent || _demoMode,
                    demoMode = _demoMode,
                    simulationMode = _demoMode,
                    lastError = _lastError,
                    timestamp = DateTime.UtcNow.ToString("o"),
                    clientsConnected = _clients.Count
                }
            });
        }

        static string VerifyPin(dynamic data)
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "pinResponse", success = true, message = "PIN verificato (DEMO)" });
                }

                string pin = data?.pin?.ToString();
                if (string.IsNullOrEmpty(pin))
                {
                    return JsonConvert.SerializeObject(new { type = "pinResponse", success = false, message = "PIN non fornito" });
                }

                int result = LibSiae.VerifyPIN(1, pin, pin.Length);
                bool success = result == LibSiae.SIAE_OK;
                
                return JsonConvert.SerializeObject(new 
                { 
                    type = "pinResponse", 
                    success = success, 
                    message = success ? "PIN verificato" : LibSiae.GetErrorMessage(result)
                });
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "pinResponse", success = false, message = ex.Message });
            }
        }

        static string ComputeSigillo(dynamic data)
        {
            try
            {
                if (_demoMode)
                {
                    var demoSeal = $"DEMO{DateTime.Now:yyyyMMddHHmmss}{new Random().Next(1000, 9999)}";
                    return JsonConvert.SerializeObject(new 
                    { 
                        type = "sealResponse", 
                        success = true, 
                        seal = new 
                        { 
                            sealCode = demoSeal,
                            timestamp = DateTime.UtcNow.ToString("o"),
                            demoMode = true
                        }
                    });
                }

                if (!_cardPresent)
                {
                    return JsonConvert.SerializeObject(new { type = "sealResponse", success = false, message = "Smart card non inserita" });
                }

                string ticketData = data?.ticketData?.ToString() ?? DateTime.Now.ToString("yyyyMMddHHmmss");
                byte[] dataBytes = Encoding.UTF8.GetBytes(ticketData);
                byte[] sigillo = new byte[64];
                int sigilloLen = sigillo.Length;

                int result = LibSiae.ComputeSigillo(dataBytes, dataBytes.Length, sigillo, ref sigilloLen);
                
                if (result == LibSiae.SIAE_OK)
                {
                    string sealCode = BitConverter.ToString(sigillo, 0, sigilloLen).Replace("-", "");
                    return JsonConvert.SerializeObject(new 
                    { 
                        type = "sealResponse", 
                        success = true, 
                        seal = new 
                        { 
                            sealCode = sealCode,
                            timestamp = DateTime.UtcNow.ToString("o"),
                            cardSerial = _cardSerial
                        }
                    });
                }
                else
                {
                    return JsonConvert.SerializeObject(new { type = "sealResponse", success = false, message = LibSiae.GetErrorMessage(result) });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "sealResponse", success = false, message = ex.Message });
            }
        }

        static string SignData(dynamic data)
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = true, signature = "DEMO_SIGNATURE_" + Guid.NewGuid().ToString("N").Substring(0, 16) });
                }

                if (!_cardPresent)
                {
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = false, message = "Smart card non inserita" });
                }

                string dataToSign = data?.content?.ToString() ?? "";
                byte[] dataBytes = Encoding.UTF8.GetBytes(dataToSign);
                byte[] signature = new byte[512];
                int signatureLen = signature.Length;

                int result = LibSiae.Sign(dataBytes, dataBytes.Length, signature, ref signatureLen);
                
                if (result == LibSiae.SIAE_OK)
                {
                    string signatureHex = Convert.ToBase64String(signature, 0, signatureLen);
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = true, signature = signatureHex });
                }
                else
                {
                    return JsonConvert.SerializeObject(new { type = "signResponse", success = false, message = LibSiae.GetErrorMessage(result) });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "signResponse", success = false, message = ex.Message });
            }
        }

        static string GetCertificate()
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = true, certificate = "DEMO_CERTIFICATE" });
                }

                if (!_cardPresent)
                {
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = false, message = "Smart card non inserita" });
                }

                byte[] cert = new byte[4096];
                int certLen = cert.Length;

                int result = LibSiae.GetSIAECertificate(cert, ref certLen);
                
                if (result == LibSiae.SIAE_OK)
                {
                    string certBase64 = Convert.ToBase64String(cert, 0, certLen);
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = true, certificate = certBase64 });
                }
                else
                {
                    return JsonConvert.SerializeObject(new { type = "certificateResponse", success = false, message = LibSiae.GetErrorMessage(result) });
                }
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "certificateResponse", success = false, message = ex.Message });
            }
        }

        static string GetSerial()
        {
            try
            {
                if (_demoMode)
                {
                    return JsonConvert.SerializeObject(new { type = "serialResponse", success = true, serial = "DEMO-12345678" });
                }

                return JsonConvert.SerializeObject(new { type = "serialResponse", success = _cardSerial != null, serial = _cardSerial });
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { type = "serialResponse", success = false, message = ex.Message });
            }
        }

        static async void BroadcastStatus()
        {
            var statusJson = GetStatusJson();
            List<WebSocket> clientsCopy;
            
            lock (_clients)
            {
                clientsCopy = new List<WebSocket>(_clients);
            }

            foreach (var client in clientsCopy)
            {
                try
                {
                    if (client.State == WebSocketState.Open)
                    {
                        await SendMessage(client, statusJson);
                    }
                }
                catch { }
            }
        }

        static async Task SendMessage(WebSocket ws, string message)
        {
            try
            {
                if (ws.State == WebSocketState.Open)
                {
                    var buffer = Encoding.UTF8.GetBytes(message);
                    await ws.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, CancellationToken.None);
                }
            }
            catch { }
        }

        class CommandMessage
        {
            public string type { get; set; }
            public dynamic data { get; set; }
        }
    }
}
