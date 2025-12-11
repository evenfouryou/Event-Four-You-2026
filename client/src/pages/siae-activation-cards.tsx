import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, CreditCard, Building2, Calendar, Shield, Loader2, Wifi, WifiOff, RefreshCw, Users, Hash, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useSmartCardStatus, smartCardService } from "@/lib/smart-card-service";

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

export default function SiaeActivationCardsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const smartCardStatus = useSmartCardStatus();

  const handleRefreshCard = async () => {
    setIsRefreshing(true);
    smartCardService.startPolling();
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const form = useForm({
    defaultValues: {
      companyId: "",
      cardNumber: "",
      fiscalCode: "",
      status: "pending",
    },
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery<SiaeActivationCard[]>({
    queryKey: ['/api/siae/activation-cards', { companyId: selectedCompany }],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', '/api/siae/activation-cards', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/siae/activation-cards' 
      });
      toast({ title: "Carta di attivazione creata" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest('PATCH', `/api/siae/activation-cards/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/siae/activation-cards' 
      });
      toast({ title: "Stato aggiornato" });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'destructive';
      case 'revoked': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'pending': return 'In attesa';
      case 'expired': return 'Scaduta';
      case 'revoked': return 'Revocata';
      default: return status;
    }
  };

  const filteredCards = selectedCompany 
    ? cards.filter(c => c.companyId === selectedCompany)
    : cards;

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full pb-24 md:pb-8" data-testid="page-siae-activation-cards">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="title-page">Carte di Attivazione SIAE</h1>
        <p className="text-muted-foreground text-sm md:text-base" data-testid="description-page">
          Gestione delle Carte di Attivazione per la biglietteria elettronica
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card" data-testid="card-stats-total">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carte Totali</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-cards">
              {cards.length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-stats-active">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carte Attive</CardTitle>
            <Shield className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-500" data-testid="text-active-cards">
              {cards.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-stats-companies">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aziende</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-companies-count">
              {companies.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={`glass-card border-2 ${smartCardStatus.cardInserted ? 'border-green-500/50' : 'border-orange-500/30'}`} data-testid="card-live-smartcard">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${smartCardStatus.cardInserted ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                <CreditCard className={`w-6 h-6 ${smartCardStatus.cardInserted ? 'text-green-500' : 'text-orange-500'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2" data-testid="title-live-card">
                  Smart Card SIAE
                  {smartCardStatus.connected ? (
                    <Badge variant="default" className="bg-green-500 text-xs">
                      <Wifi className="w-3 h-3 mr-1" /> LIVE
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <WifiOff className="w-3 h-3 mr-1" /> Offline
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription data-testid="description-live-card">
                  {smartCardStatus.cardInserted 
                    ? "Carta inserita - Dati letti in tempo reale"
                    : smartCardStatus.readerDetected
                      ? "Lettore connesso - Inserire la carta SIAE"
                      : "Connettere il lettore MiniLector EVO"}
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefreshCard}
              disabled={isRefreshing}
              data-testid="button-refresh-card"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {smartCardStatus.cardInserted ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="live-card-data">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Seriale Carta
                </div>
                <div className="font-mono font-semibold text-sm" data-testid="live-card-serial">
                  {smartCardStatus.cardSerial || '-'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Contatore Sigilli
                </div>
                <div className="font-mono font-semibold text-sm text-green-500" data-testid="live-card-counter">
                  {smartCardStatus.cardCounter?.toLocaleString('it-IT') || '-'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Saldo Carta
                </div>
                <div className="font-mono font-semibold text-sm" data-testid="live-card-balance">
                  {smartCardStatus.cardBalance?.toLocaleString('it-IT') || '-'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Codice Sistema
                </div>
                <div className="font-mono font-semibold text-sm" data-testid="live-card-keyid">
                  {smartCardStatus.cardKeyId || '-'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-muted-foreground" data-testid="no-card-message">
              <div className="text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Inserisci una Smart Card SIAE per visualizzare i dati</p>
                {smartCardStatus.readerName && (
                  <p className="text-xs mt-2">Lettore: {smartCardStatus.readerName}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card" data-testid="card-cards-list">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle data-testid="title-cards-list">Elenco Carte</CardTitle>
              <CardDescription data-testid="description-cards-list">
                Seleziona un'azienda per visualizzare le carte associate
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCompany || ""} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[200px]" data-testid="select-company">
                  <SelectValue placeholder="Seleziona azienda" data-testid="select-company-value" />
                </SelectTrigger>
                <SelectContent data-testid="select-company-content">
                  {companies.map((company) => (
                    <SelectItem 
                      key={company.id} 
                      value={company.id}
                      data-testid={`select-company-option-${company.id}`}
                    >
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-card">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Carta
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-card">
                  <DialogHeader>
                    <DialogTitle data-testid="dialog-title-add-card">Nuova Carta di Attivazione</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-add-card">
                      <FormField
                        control={form.control}
                        name="companyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Azienda</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="input-card-company">
                                  <SelectValue placeholder="Seleziona azienda" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent data-testid="input-card-company-content">
                                {companies.map((company) => (
                                  <SelectItem 
                                    key={company.id} 
                                    value={company.id}
                                    data-testid={`input-card-company-option-${company.id}`}
                                  >
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numero Carta</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="CA-2025-0001" 
                                data-testid="input-card-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fiscalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Codice Fiscale Emittente</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="12345678901" 
                                data-testid="input-fiscal-code"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stato</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="input-card-status">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent data-testid="input-card-status-content">
                                <SelectItem value="pending" data-testid="input-card-status-pending">In attesa</SelectItem>
                                <SelectItem value="active" data-testid="input-card-status-active">Attiva</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createMutation.isPending}
                        data-testid="button-save-card"
                      >
                        {createMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : "Crea Carta"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cardsLoading ? (
            <div className="flex justify-center p-8" data-testid="loader-cards">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-cards">
              {selectedCompany 
                ? "Nessuna carta trovata per questa azienda"
                : "Nessuna carta di attivazione presente nel sistema"}
            </div>
          ) : (
            <div className="rounded-md border" data-testid="table-cards-container">
              <Table data-testid="table-cards">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-card-number">Numero Carta</TableHead>
                    <TableHead data-testid="header-fiscal-code">Codice Fiscale</TableHead>
                    <TableHead data-testid="header-activation-date">Attivazione</TableHead>
                    <TableHead data-testid="header-expiration-date">Scadenza</TableHead>
                    <TableHead data-testid="header-status">Stato</TableHead>
                    <TableHead className="w-32" data-testid="header-actions">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id} data-testid={`row-card-${card.id}`}>
                      <TableCell className="font-mono font-medium" data-testid={`cell-card-number-${card.id}`}>
                        {card.cardNumber}
                      </TableCell>
                      <TableCell className="font-mono" data-testid={`cell-fiscal-code-${card.id}`}>
                        {card.fiscalCode}
                      </TableCell>
                      <TableCell data-testid={`cell-activation-date-${card.id}`}>
                        {card.activationDate 
                          ? format(new Date(card.activationDate), 'dd/MM/yyyy', { locale: it })
                          : '-'
                        }
                      </TableCell>
                      <TableCell data-testid={`cell-expiration-date-${card.id}`}>
                        {card.expirationDate 
                          ? format(new Date(card.expirationDate), 'dd/MM/yyyy', { locale: it })
                          : '-'
                        }
                      </TableCell>
                      <TableCell data-testid={`cell-status-${card.id}`}>
                        <Badge 
                          variant={getStatusColor(card.status) as any}
                          data-testid={`badge-status-${card.id}`}
                        >
                          {getStatusLabel(card.status)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-actions-${card.id}`}>
                        {card.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ 
                              id: card.id, 
                              status: 'active' 
                            })}
                            data-testid={`button-activate-${card.id}`}
                          >
                            Attiva
                          </Button>
                        )}
                        {card.status === 'active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ 
                              id: card.id, 
                              status: 'revoked' 
                            })}
                            data-testid={`button-revoke-${card.id}`}
                          >
                            Revoca
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
