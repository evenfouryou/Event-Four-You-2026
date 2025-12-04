import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Usb, CreditCard, CheckCircle } from "lucide-react";

export default function DownloadSmartCardApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Event4U Smart Card Reader</h1>
          <p className="text-muted-foreground">
            Applicazione desktop per il lettore MiniLector EVO V3
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download
            </CardTitle>
            <CardDescription>
              Scarica e installa l'applicazione per Windows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <a 
              href="/event4u-smart-card-reader.tar.gz" 
              download
              data-testid="link-download-app"
            >
              <Button size="lg" className="w-full">
                <Download className="mr-2 h-5 w-5" />
                Scarica Event4U Smart Card Reader
              </Button>
            </a>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Dopo il download:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Estrai il file .tar.gz (usa 7-Zip)</li>
                <li>Fai doppio click su <code className="bg-background px-1 rounded">build-windows.bat</code></li>
                <li>Attendi la compilazione automatica</li>
                <li>L'installer sarà nella cartella <code className="bg-background px-1 rounded">dist/</code></li>
              </ol>
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
                <Monitor className="h-8 w-8 text-primary mt-1" />
                <div>
                  <p className="font-medium">Windows 10/11</p>
                  <p className="text-sm text-muted-foreground">Sistema operativo</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Usb className="h-8 w-8 text-primary mt-1" />
                <div>
                  <p className="font-medium">MiniLector EVO V3</p>
                  <p className="text-sm text-muted-foreground">Lettore Bit4id</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-8 w-8 text-primary mt-1" />
                <div>
                  <p className="font-medium">Smart Card SIAE</p>
                  <p className="text-sm text-muted-foreground">Carta sigilli fiscali</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Come funziona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                <div>
                  <p className="font-medium">Installa l'applicazione</p>
                  <p className="text-sm text-muted-foreground">Esegui l'installer e segui le istruzioni</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                <div>
                  <p className="font-medium">Collega il lettore</p>
                  <p className="text-sm text-muted-foreground">Inserisci il MiniLector EVO nella porta USB</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                <div>
                  <p className="font-medium">Inserisci la Smart Card</p>
                  <p className="text-sm text-muted-foreground">La carta SIAE con i sigilli fiscali</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Pronto!</p>
                  <p className="text-sm text-muted-foreground">Event4U si collega automaticamente per emettere biglietti</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          L'applicazione deve rimanere aperta durante l'emissione di biglietti fiscali SIAE
        </p>
      </div>
    </div>
  );
}
