import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Building2, Shield, Loader2, Wifi, WifiOff, RefreshCw, Users, Hash, Wallet, Monitor, CheckCircle2, XCircle, Download, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useSmartCardStatus, smartCardService } from "@/lib/smart-card-service";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

type SiaeActivationCard = {
  id: string;
  companyId: string;
  cardNumber: string;
  fiscalCode: string;
  activationDate?: string;
  expirationDate?: string;
  status: string;
  createdAt: string;
};

type Company = {
  id: string;
  name: string;
};

type CardUsageStats = {
  card: SiaeActivationCard | null;
  totalSeals: number;
  totalTickets: number;
  organizers: {
    userId: string;
    username: string;
    fullName: string;
    ticketCount: number;
    lastEmission: string | null;
  }[];
};

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function SiaeActivationCardsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  
  const smartCardStatus = useSmartCardStatus();

  const handleRefreshCard = async () => {
    triggerHaptic('medium');
    setIsRefreshing(true);
    smartCardService.startPolling();
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: cards = [] } = useQuery<SiaeActivationCard[]>({
    queryKey: ['/api/siae/activation-cards'],
  });

  const { data: cardUsageStats, isLoading: usageStatsLoading } = useQuery<CardUsageStats>({
    queryKey: ['/api/siae/activation-cards/by-serial', smartCardStatus.cardSerial],
    enabled: !!smartCardStatus.cardSerial && smartCardStatus.cardInserted,
    refetchInterval: smartCardStatus.cardInserted ? 5000 : false,
    retry: false,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Attiva</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Inattiva</Badge>;
      case 'expired':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Scaduta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'N/A';
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-activation-cards">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lettore Carte SIAE</h1>
            <p className="text-muted-foreground">Gestione carte di attivazione SIAE</p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefreshCard}
            disabled={isRefreshing}
            data-testid="button-refresh-main"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card data-testid="card-stats-total">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-cards">{cards.length}</div>
                  <p className="text-sm text-muted-foreground">Carte Totali</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stats-active">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Shield className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500" data-testid="text-active-cards">
                    {cards.filter(c => c.status === 'active').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Carte Attive</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="card-stats-companies">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="text-companies-count">{companies.length}</div>
                  <p className="text-sm text-muted-foreground">Aziende</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card data-testid="card-connection-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Stato Connessione Lettore
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className={`w-3 h-3 rounded-full ${smartCardStatus.relayConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Server Relay</p>
                  <p className="text-xs text-muted-foreground">
                    {smartCardStatus.relayConnected ? 'Connesso' : 'Non connesso'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className={`w-3 h-3 rounded-full ${smartCardStatus.bridgeConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Bridge .NET</p>
                  <p className="text-xs text-muted-foreground">
                    {smartCardStatus.bridgeConnected ? 'Attivo' : 'Non attivo'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                {smartCardStatus.readerDetected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Lettore</p>
                  <p className="text-xs text-muted-foreground">
                    {smartCardStatus.readerDetected ? (smartCardStatus.readerName || 'Rilevato') : 'Non rilevato'}
                  </p>
                </div>
              </div>
              {!smartCardStatus.connected && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span>Scarica l'app desktop Event4U per connettere il lettore</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`border-2 ${smartCardStatus.cardInserted ? 'border-green-500/50' : 'border-orange-500/30'}`}
            data-testid="card-live-smartcard"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${smartCardStatus.cardInserted ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                    <CreditCard className={`w-6 h-6 ${smartCardStatus.cardInserted ? 'text-green-500' : 'text-orange-500'}`} />
                  </div>
                  <div>
                    <CardTitle data-testid="title-live-card">Smart Card SIAE</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {smartCardStatus.connected ? (
                        <Badge className="bg-green-500 text-xs">
                          <Wifi className="w-3 h-3 mr-1" /> LIVE
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <WifiOff className="w-3 h-3 mr-1" /> Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleRefreshCard}
                  disabled={isRefreshing}
                  data-testid="button-refresh-card"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CardDescription data-testid="description-live-card">
                {smartCardStatus.cardInserted 
                  ? "Carta inserita - Dati letti in tempo reale"
                  : smartCardStatus.readerDetected
                    ? "Lettore connesso - Inserire la carta SIAE"
                    : "Connettere il lettore MiniLector EVO"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {smartCardStatus.cardInserted ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3" data-testid="live-card-data">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Hash className="w-3 h-3" /> Seriale Carta
                      </div>
                      <div className="font-mono font-bold" data-testid="live-card-serial">
                        {smartCardStatus.cardSerial || '-'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Shield className="w-3 h-3" /> Contatore Sigilli
                      </div>
                      <div className="font-mono font-bold text-green-500" data-testid="live-card-counter">
                        {smartCardStatus.cardCounter?.toLocaleString('it-IT') || '-'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Wallet className="w-3 h-3" /> Saldo Carta
                      </div>
                      <div className="font-mono font-bold" data-testid="live-card-balance">
                        {smartCardStatus.cardBalance?.toLocaleString('it-IT') || '-'}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <CreditCard className="w-3 h-3" /> Codice Sistema
                      </div>
                      <div className="font-mono font-bold" data-testid="live-card-keyid">
                        {smartCardStatus.cardKeyId || '-'}
                      </div>
                    </div>
                  </div>

                  {usageStatsLoading ? (
                    <div className="flex items-center justify-center py-6" data-testid="loading-usage-stats">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Caricamento statistiche...</span>
                    </div>
                  ) : cardUsageStats?.organizers && cardUsageStats.organizers.length > 0 ? (
                    <div className="border-t pt-4" data-testid="organizers-section">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">Organizzatori</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {cardUsageStats.totalTickets} biglietti
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Organizzatore</TableHead>
                            <TableHead className="text-right">Biglietti</TableHead>
                            <TableHead className="text-right">Ultima Emissione</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cardUsageStats.organizers.map((org) => (
                            <TableRow key={org.userId} data-testid={`organizer-${org.userId}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                                    {org.fullName?.charAt(0) || org.username?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <div className="font-medium">{org.fullName || org.username}</div>
                                    <div className="text-xs text-muted-foreground">@{org.username}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge>{org.ticketCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {org.lastEmission 
                                  ? format(new Date(org.lastEmission), 'dd/MM/yyyy HH:mm', { locale: it })
                                  : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : cardUsageStats?.card ? (
                    <div className="border-t pt-4 text-center py-6" data-testid="no-organizers">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-muted-foreground">Nessun biglietto emesso con questa carta</p>
                    </div>
                  ) : smartCardStatus.cardSerial ? (
                    <div className="border-t pt-4 text-center py-6" data-testid="card-not-in-db">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-muted-foreground">Carta non registrata nel database</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground" data-testid="no-card-message">
                  <CreditCard className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-center font-medium">Inserisci una Smart Card SIAE</p>
                  <p className="text-center text-sm mt-1">per visualizzare i dati</p>
                  {smartCardStatus.readerName && (
                    <p className="text-xs mt-3 px-3 py-1.5 rounded-full bg-muted/50">
                      Lettore: {smartCardStatus.readerName}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {cards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Carte Registrate
              </CardTitle>
              <CardDescription>Elenco delle carte SIAE registrate nel sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero Carta</TableHead>
                    <TableHead>Codice Fiscale</TableHead>
                    <TableHead>Azienda</TableHead>
                    <TableHead>Data Attivazione</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id} data-testid={`card-row-${card.id}`}>
                      <TableCell className="font-mono">{card.cardNumber}</TableCell>
                      <TableCell className="font-mono">{card.fiscalCode}</TableCell>
                      <TableCell>{getCompanyName(card.companyId)}</TableCell>
                      <TableCell>
                        {card.activationDate 
                          ? format(new Date(card.activationDate), 'dd/MM/yyyy', { locale: it })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {card.expirationDate 
                          ? format(new Date(card.expirationDate), 'dd/MM/yyyy', { locale: it })
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(card.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const header = (
    <MobileHeader
      title="Lettore Carte SIAE"
      showBackButton
      showUserMenu
      rightAction={
        <HapticButton 
          variant="ghost" 
          size="icon"
          onClick={handleRefreshCard}
          disabled={isRefreshing}
          className="h-11 w-11"
          hapticType="medium"
          data-testid="button-refresh-main"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </HapticButton>
      }
    />
  );

  return (
    <MobileAppLayout header={header} data-testid="page-siae-activation-cards">
      <div className="space-y-4 pb-24 pt-4">
        
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig, delay: 0 }}
          >
            <Card className="glass-card" data-testid="card-stats-total">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Carte Totali</p>
                    <p className="text-2xl font-bold" data-testid="text-total-cards">{cards.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig, delay: 0.05 }}
          >
            <Card className="glass-card" data-testid="card-stats-active">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-green-500/10">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Carte Attive</p>
                    <p className="text-2xl font-bold text-green-500" data-testid="text-active-cards">
                      {cards.filter(c => c.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfig, delay: 0.1 }}
          >
            <Card className="glass-card" data-testid="card-stats-companies">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10">
                    <Building2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aziende</p>
                    <p className="text-2xl font-bold" data-testid="text-companies-count">{companies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.15 }}
        >
          <Card className="glass-card" data-testid="card-connection-status">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <Monitor className="w-5 h-5" />
                </div>
                Stato Connessione Lettore
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <motion.div 
                className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 min-h-[56px]"
                whileTap={{ scale: 0.98 }}
                transition={springConfig}
              >
                <div className={`w-3 h-3 rounded-full ${smartCardStatus.relayConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Server Relay</p>
                  <p className="text-xs text-muted-foreground">
                    {smartCardStatus.relayConnected ? 'Connesso' : 'Non connesso'}
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 min-h-[56px]"
                whileTap={{ scale: 0.98 }}
                transition={springConfig}
              >
                <div className={`w-3 h-3 rounded-full ${smartCardStatus.bridgeConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">Bridge .NET</p>
                  <p className="text-xs text-muted-foreground">
                    {smartCardStatus.bridgeConnected ? 'Attivo' : 'Non attivo'}
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 min-h-[56px]"
                whileTap={{ scale: 0.98 }}
                transition={springConfig}
              >
                {smartCardStatus.readerDetected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">Lettore</p>
                  <p className="text-xs text-muted-foreground">
                    {smartCardStatus.readerDetected ? (smartCardStatus.readerName || 'Rilevato') : 'Non rilevato'}
                  </p>
                </div>
              </motion.div>
              
              {!smartCardStatus.connected && (
                <motion.div 
                  className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springConfig}
                >
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-3">
                    <Download className="w-5 h-5 flex-shrink-0" />
                    <span>Scarica l'app desktop Event4U per connettere il lettore</span>
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.2 }}
        >
          <Card 
            className={`glass-card border-2 ${smartCardStatus.cardInserted ? 'border-green-500/50' : 'border-orange-500/30'}`} 
            data-testid="card-live-smartcard"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className={`p-4 rounded-2xl ${smartCardStatus.cardInserted ? 'bg-green-500/20' : 'bg-orange-500/20'}`}
                  animate={{ scale: smartCardStatus.cardInserted ? [1, 1.05, 1] : 1 }}
                  transition={{ duration: 0.5, repeat: smartCardStatus.cardInserted ? Infinity : 0, repeatDelay: 2 }}
                >
                  <CreditCard className={`w-8 h-8 ${smartCardStatus.cardInserted ? 'text-green-500' : 'text-orange-500'}`} />
                </motion.div>
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg" data-testid="title-live-card">
                    Smart Card SIAE
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {smartCardStatus.connected ? (
                      <Badge variant="default" className="bg-green-500 text-xs px-2 py-1">
                        <Wifi className="w-3 h-3 mr-1" /> LIVE
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        <WifiOff className="w-3 h-3 mr-1" /> Offline
                      </Badge>
                    )}
                  </div>
                </div>
                <HapticButton 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRefreshCard}
                  disabled={isRefreshing}
                  className="h-12 w-12"
                  hapticType="medium"
                  data-testid="button-refresh-card"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </HapticButton>
              </div>
              <CardDescription className="mt-2" data-testid="description-live-card">
                {smartCardStatus.cardInserted 
                  ? "Carta inserita - Dati letti in tempo reale"
                  : smartCardStatus.readerDetected
                    ? "Lettore connesso - Inserire la carta SIAE"
                    : "Connettere il lettore MiniLector EVO"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {smartCardStatus.cardInserted ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3" data-testid="live-card-data">
                    <motion.div 
                      className="p-4 rounded-2xl bg-muted/30 min-h-[80px]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springConfig, delay: 0 }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Hash className="w-4 h-4" /> Seriale Carta
                      </div>
                      <div className="font-mono font-bold text-base" data-testid="live-card-serial">
                        {smartCardStatus.cardSerial || '-'}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="p-4 rounded-2xl bg-muted/30 min-h-[80px]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springConfig, delay: 0.05 }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Shield className="w-4 h-4" /> Contatore Sigilli
                      </div>
                      <div className="font-mono font-bold text-base text-green-500" data-testid="live-card-counter">
                        {smartCardStatus.cardCounter?.toLocaleString('it-IT') || '-'}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="p-4 rounded-2xl bg-muted/30 min-h-[80px]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springConfig, delay: 0.1 }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Wallet className="w-4 h-4" /> Saldo Carta
                      </div>
                      <div className="font-mono font-bold text-base" data-testid="live-card-balance">
                        {smartCardStatus.cardBalance?.toLocaleString('it-IT') || '-'}
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="p-4 rounded-2xl bg-muted/30 min-h-[80px]"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springConfig, delay: 0.15 }}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <CreditCard className="w-4 h-4" /> Codice Sistema
                      </div>
                      <div className="font-mono font-bold text-base" data-testid="live-card-keyid">
                        {smartCardStatus.cardKeyId || '-'}
                      </div>
                    </motion.div>
                  </div>

                  {usageStatsLoading ? (
                    <motion.div 
                      className="flex items-center justify-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      data-testid="loading-usage-stats"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mr-3" />
                      <span className="text-sm text-muted-foreground">Caricamento statistiche...</span>
                    </motion.div>
                  ) : cardUsageStats?.organizers && cardUsageStats.organizers.length > 0 ? (
                    <motion.div 
                      className="border-t pt-4 space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springConfig}
                      data-testid="organizers-section"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          <span className="font-semibold text-sm">Organizzatori</span>
                        </div>
                        <Badge variant="secondary" className="text-xs px-3 py-1">
                          {cardUsageStats.totalTickets} biglietti
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {cardUsageStats.organizers.map((org, index) => (
                          <motion.div 
                            key={org.userId} 
                            className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 min-h-[64px]"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...springConfig, delay: index * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            data-testid={`organizer-${org.userId}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                                {org.fullName?.charAt(0) || org.username?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="font-medium">{org.fullName || org.username}</div>
                                <div className="text-xs text-muted-foreground">@{org.username}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="default" className="text-xs px-2 py-1">
                                {org.ticketCount}
                              </Badge>
                              {org.lastEmission && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(org.lastEmission), 'dd/MM HH:mm', { locale: it })}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : cardUsageStats?.card ? (
                    <motion.div 
                      className="border-t pt-6 text-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      data-testid="no-organizers"
                    >
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm text-muted-foreground">Nessun biglietto emesso con questa carta</p>
                    </motion.div>
                  ) : smartCardStatus.cardSerial ? (
                    <motion.div 
                      className="border-t pt-6 text-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      data-testid="card-not-in-db"
                    >
                      <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm text-muted-foreground">Carta non registrata nel database</p>
                    </motion.div>
                  ) : null}
                </div>
              ) : (
                <motion.div 
                  className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springConfig}
                  data-testid="no-card-message"
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <CreditCard className="w-16 h-16 mb-4 opacity-30" />
                  </motion.div>
                  <p className="text-center font-medium">Inserisci una Smart Card SIAE</p>
                  <p className="text-center text-sm mt-1">per visualizzare i dati</p>
                  {smartCardStatus.readerName && (
                    <p className="text-xs mt-4 px-4 py-2 rounded-full bg-muted/50">
                      Lettore: {smartCardStatus.readerName}
                    </p>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </MobileAppLayout>
  );
}
