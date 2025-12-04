import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Usb, CreditCard, CheckCircle, FileText, Settings, Play } from "lucide-react";

export default function DownloadSmartCardApp() {
  const downloadFile = (filename: string) => {
    window.open(`/smart-card-reader/${filename}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Event4U Smart Card Reader</h1>
          <p className="text-muted-foreground">
            Server per il lettore MiniLector EVO V3
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Files
            </CardTitle>
            <CardDescription>
              Scarica tutti i file necessari
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => downloadFile('install-and-run.bat')}
              size="lg" 
              className="w-full justify-start"
              data-testid="button-download-bat"
            >
              <Play className="mr-2 h-5 w-5" />
              install-and-run.bat (Avvio Automatico)
            </Button>
            
            <Button 
              onClick={() => downloadFile('server.js')}
              variant="outline"
              className="w-full justify-start"
              data-testid="button-download-server"
            >
              <Settings className="mr-2 h-5 w-5" />
              server.js (Server)
            </Button>
            
            <Button 
              onClick={() => downloadFile('package.json')}
              variant="outline"
              className="w-full justify-start"
              data-testid="button-download-package"
            >
              <FileText className="mr-2 h-5 w-5" />
              package.json (Configurazione)
            </Button>
            
            <Button 
              onClick={() => downloadFile('README.txt')}
              variant="outline"
              className="w-full justify-start"
              data-testid="button-download-readme"
            >
              <FileText className="mr-2 h-5 w-5" />
              README.txt (Istruzioni)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-primary">Istruzioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">1</div>
                <div>
                  <p className="font-medium">Scarica tutti i file</p>
                  <p className="text-sm text-muted-foreground">Mettili nella stessa cartella sul tuo PC</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">2</div>
                <div>
                  <p className="font-medium">Fai doppio click su install-and-run.bat</p>
                  <p className="text-sm text-muted-foreground">Se manca Node.js, verrà installato automaticamente</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">3</div>
                <div>
                  <p className="font-medium">Lascia la finestra aperta</p>
                  <p className="text-sm text-muted-foreground">Il server deve restare attivo mentre usi Event4U</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Pronto!</p>
                  <p className="text-sm text-muted-foreground">Event4U si collega automaticamente</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requisiti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <Monitor className="h-8 w-8 text-primary mt-1 shrink-0" />
                <div>
                  <p className="font-medium">Windows 10/11</p>
                  <p className="text-sm text-muted-foreground">Sistema operativo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Usb className="h-8 w-8 text-primary mt-1 shrink-0" />
                <div>
                  <p className="font-medium">MiniLector EVO V3</p>
                  <p className="text-sm text-muted-foreground">Opzionale per test</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-8 w-8 text-primary mt-1 shrink-0" />
                <div>
                  <p className="font-medium">Smart Card SIAE</p>
                  <p className="text-sm text-muted-foreground">Per sigilli fiscali</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-center">
            <strong>Modalità Simulazione:</strong> Senza il lettore fisico, il sistema funziona in modalità test. 
            I sigilli generati NON sono validi fiscalmente.
          </p>
        </div>
      </div>
    </div>
  );
}
