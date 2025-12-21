import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  Armchair,
  Ticket,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ScanLine,
  Camera,
  Search,
  BarChart3,
  History,
} from "lucide-react";

interface ScanResult {
  success: boolean;
  message?: string;
  error?: string;
  type?: 'list' | 'table' | 'ticket';
  person?: {
    firstName: string;
    lastName: string;
    phone?: string;
    type: 'lista' | 'tavolo' | 'biglietto';
    listName?: string;
    tableName?: string;
    status?: string;
    plusOnes?: number;
    ticketType?: string;
    ticketCode?: string;
    sector?: string;
    price?: string;
  };
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
  isCancelled?: boolean;
}

interface RecentScan extends ScanResult {
  scannedAt: Date;
  qrCode: string;
}

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  status: string;
}

export default function ScannerScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [activeTab, setActiveTab] = useState("scan");
  const [cameraActive, setCameraActive] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const scanMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/e4u/scan", { 
        qrCode, 
        eventId 
      });
      return response.json();
    },
    onSuccess: (data: ScanResult) => {
      setScanResult(data);
      const newScan: RecentScan = { 
        ...data, 
        scannedAt: new Date(),
        qrCode: qrInput
      };
      setRecentScans(prev => [newScan, ...prev.slice(0, 49)]);
      setQrInput("");
      
      if (data.success && data.person) {
        toast({ 
          title: "Check-in effettuato!", 
          description: `${data.person.firstName} ${data.person.lastName}` 
        });
      } else if (data.alreadyCheckedIn) {
        toast({ 
          title: "Già registrato", 
          description: data.message || "Questo QR è già stato utilizzato",
          variant: "destructive"
        });
      }
      
      inputRef.current?.focus();
    },
    onError: (error: any) => {
      const errorResult: ScanResult = { 
        success: false, 
        error: error.message || "Errore durante la scansione" 
      };
      setScanResult(errorResult);
      toast({ 
        title: "Errore scansione", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleScan = () => {
    if (!qrInput.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci o scansiona un codice QR",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(qrInput.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const resetScanner = () => {
    setQrInput("");
    setScanResult(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const successCount = recentScans.filter(s => s.success).length;
  const alreadyCount = recentScans.filter(s => s.alreadyCheckedIn).length;
  const errorCount = recentScans.filter(s => !s.success && !s.alreadyCheckedIn).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/scanner">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold truncate max-w-[200px]" data-testid="text-event-name">
                {event?.name || "Caricamento..."}
              </h1>
              {event && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.startDatetime), "d MMM yyyy, HH:mm", { locale: it })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/scanner/stats/${eventId}`}>
              <Button variant="outline" size="icon" data-testid="button-stats">
                <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {successCount}
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {alreadyCount}
            </Badge>
            <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30">
              <XCircle className="h-3 w-3 mr-1" />
              {errorCount}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-[116px] z-10 bg-background/80 backdrop-blur-lg px-4 pb-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="scan" data-testid="tab-scan">
              <QrCode className="h-4 w-4 mr-2" />
              Scansione
            </TabsTrigger>
            <TabsTrigger value="scanned" data-testid="tab-scanned">
              <History className="h-4 w-4 mr-2" />
              Scansionati ({recentScans.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scan" className="p-4 space-y-4 mt-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Inserisci o scansiona QR code..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="h-14 text-lg font-mono pl-12"
                  data-testid="input-qr-code"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleScan}
                  disabled={scanMutation.isPending || !qrInput.trim()}
                  className="h-14 bg-gradient-to-r from-emerald-500 to-green-600"
                  data-testid="button-scan"
                >
                  {scanMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ScanLine className="w-5 h-5 mr-2" />
                      Scansiona
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={resetScanner}
                  data-testid="button-reset"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {scanResult && scanResult.success && scanResult.person && (
            <Card className="border-emerald-500/50 bg-emerald-500/5" data-testid="card-success">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-emerald-400 text-xl">Check-in OK</CardTitle>
                    <p className="text-lg font-semibold" data-testid="text-person-name">
                      {scanResult.person.firstName} {scanResult.person.lastName}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize h-8" data-testid="badge-type">
                    {scanResult.person.type === 'lista' ? (
                      <><Users className="w-4 h-4 mr-1" /> Lista</>
                    ) : scanResult.person.type === 'biglietto' ? (
                      <><Ticket className="w-4 h-4 mr-1" /> Biglietto</>
                    ) : (
                      <><Armchair className="w-4 h-4 mr-1" /> Tavolo</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm bg-background rounded-lg p-3">
                  {scanResult.person.phone && (
                    <div>
                      <span className="text-muted-foreground">Tel:</span>
                      <span className="ml-1 font-medium">{scanResult.person.phone}</span>
                    </div>
                  )}
                  {scanResult.person.listName && (
                    <div>
                      <span className="text-muted-foreground">Lista:</span>
                      <span className="ml-1 font-medium">{scanResult.person.listName}</span>
                    </div>
                  )}
                  {scanResult.person.tableName && (
                    <div>
                      <span className="text-muted-foreground">Tavolo:</span>
                      <span className="ml-1 font-medium">{scanResult.person.tableName}</span>
                    </div>
                  )}
                  {scanResult.person.plusOnes !== undefined && scanResult.person.plusOnes > 0 && (
                    <div>
                      <span className="text-muted-foreground">Accomp.:</span>
                      <span className="ml-1 font-medium">+{scanResult.person.plusOnes}</span>
                    </div>
                  )}
                  {scanResult.person.ticketType && (
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="ml-1 font-medium">{scanResult.person.ticketType}</span>
                    </div>
                  )}
                  {scanResult.person.sector && (
                    <div>
                      <span className="text-muted-foreground">Settore:</span>
                      <span className="ml-1 font-medium">{scanResult.person.sector}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {scanResult && scanResult.alreadyCheckedIn && (
            <Card className="border-amber-500/50 bg-amber-500/5" data-testid="card-already-checked">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-amber-400 text-xl">Già Registrato</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {scanResult.checkedInAt 
                        ? `Ingresso alle ${format(new Date(scanResult.checkedInAt), "HH:mm", { locale: it })}`
                        : "QR già utilizzato"
                      }
                    </p>
                    {scanResult.person && (
                      <p className="font-semibold mt-1">
                        {scanResult.person.firstName} {scanResult.person.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {scanResult && !scanResult.success && scanResult.error && !scanResult.alreadyCheckedIn && (
            <Card className="border-rose-500/50 bg-rose-500/5" data-testid="card-error">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <XCircle className="w-7 h-7 text-rose-400" />
                  </div>
                  <div>
                    <CardTitle className="text-rose-400 text-xl">Errore</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {scanResult.error}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {!scanResult && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <QrCode className="w-20 h-20 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">
                    Pronto per la scansione
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scanned" className="p-4 mt-0">
          {recentScans.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-2">
                {recentScans.map((scan, index) => (
                  <Card 
                    key={index}
                    className={`${
                      scan.success 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : scan.alreadyCheckedIn 
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-rose-500/30 bg-rose-500/5'
                    }`}
                    data-testid={`recent-scan-${index}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          scan.success 
                            ? 'bg-emerald-500/20' 
                            : scan.alreadyCheckedIn 
                              ? 'bg-amber-500/20'
                              : 'bg-rose-500/20'
                        }`}>
                          {scan.success ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : scan.alreadyCheckedIn ? (
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {scan.person 
                              ? `${scan.person.firstName} ${scan.person.lastName}`
                              : scan.error || "Errore"
                            }
                          </p>
                          {scan.person && (
                            <p className="text-xs text-muted-foreground">
                              {scan.person.type === 'lista' && 'Lista'}
                              {scan.person.type === 'tavolo' && 'Tavolo'}
                              {scan.person.type === 'biglietto' && 'Biglietto'}
                              {scan.person.listName && ` - ${scan.person.listName}`}
                              {scan.person.tableName && ` - ${scan.person.tableName}`}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(scan.scannedAt, "HH:mm:ss", { locale: it })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">
                  Nessuna scansione ancora effettuata
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
