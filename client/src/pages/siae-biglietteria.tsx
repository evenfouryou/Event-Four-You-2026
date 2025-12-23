import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  type SiaeTicket,
  type SiaeTicketedEvent,
  type SiaeEventSector,
  type SiaeTransaction,
  type SiaeCancellationReason,
  type SiaeTicketType,
  type Event,
} from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Ticket,
  Euro,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Scan,
  Search,
  Users,
  Ban,
  Eye,
  ArrowLeft,
  CreditCard,
  Banknote,
  Globe,
  Download,
  Receipt,
  TrendingUp,
  FileText,
  Settings,
  Calendar as CalendarIcon,
  BarChart3,
  ChevronRight,
  RefreshCcw,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { smartCardService, useSmartCardStatus } from "@/lib/smart-card-service";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

const emissionFormSchema = z.object({
  ticketedEventId: z.string().min(1, "Seleziona un evento"),
  sectorId: z.string().min(1, "Seleziona un settore"),
  ticketTypeCode: z.string().min(1, "Seleziona il tipo"),
  customerId: z.string().optional(),
  participantFirstName: z.string().optional(),
  participantLastName: z.string().optional(),
  quantity: z.coerce.number().min(1).max(10).default(1),
});

type EmissionFormData = z.infer<typeof emissionFormSchema>;

export default function SiaeBiglietteriaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/siae/biglietteria/:eventId");
  const eventId = params?.eventId || "";
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState("biglietti");
  const [isEmissionDialogOpen, setIsEmissionDialogOpen] = useState(false);
  const [isEmissionSheetOpen, setIsEmissionSheetOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [isTicketDetailDialogOpen, setIsTicketDetailDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SiaeTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [cancelReasonCode, setCancelReasonCode] = useState("");
  const [refundOnCancel, setRefundOnCancel] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SiaeTransaction | null>(null);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);

  const companyId = user?.companyId;
  const smartCardStatus = useSmartCardStatus();
  const cardReadiness = smartCardService.isReadyForEmission();

  const { data: ticketedEvent, isLoading: eventLoading } = useQuery<SiaeTicketedEvent>({
    queryKey: ['/api/siae/ticketed-events', eventId],
    enabled: !!eventId,
  });

  const { data: baseEvent } = useQuery<Event>({
    queryKey: ['/api/events', ticketedEvent?.eventId],
    enabled: !!ticketedEvent?.eventId,
  });

  const { data: ticketedEvents, isLoading: eventsLoading } = useQuery<SiaeTicketedEvent[]>({
    queryKey: ['/api/siae/companies', companyId, 'ticketed-events'],
    enabled: !!companyId,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'tickets'],
    enabled: !!eventId,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<SiaeTransaction[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'transactions'],
    enabled: !!eventId,
  });

  const { data: sectors } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', eventId, 'sectors'],
    enabled: !!eventId,
  });

  const { data: ticketTypes } = useQuery<SiaeTicketType[]>({
    queryKey: ['/api/siae/ticket-types'],
  });

  const { data: cancellationReasons } = useQuery<SiaeCancellationReason[]>({
    queryKey: ['/api/siae/cancellation-reasons'],
  });

  const form = useForm<EmissionFormData>({
    resolver: zodResolver(emissionFormSchema),
    defaultValues: {
      ticketedEventId: eventId || "",
      sectorId: "",
      ticketTypeCode: "",
      customerId: "",
      participantFirstName: "",
      participantLastName: "",
      quantity: 1,
    },
  });

  const selectedEventForForm = form.watch("ticketedEventId");
  const selectedSectorId = form.watch("sectorId");
  const selectedTicketType = form.watch("ticketTypeCode");
  const selectedQuantity = form.watch("quantity");

  const { data: formSectors } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventForForm, 'sectors'],
    enabled: !!selectedEventForForm,
  });

  const selectedSector = formSectors?.find(s => s.id === selectedSectorId);
  const hasSingleSector = formSectors?.length === 1;
  const selectedEventDetails = ticketedEvents?.find(e => e.id === selectedEventForForm);
  const isNominativeRequired = selectedEventDetails?.requiresNominative || false;

  useEffect(() => {
    if (eventId && form.getValues("ticketedEventId") !== eventId) {
      form.setValue("ticketedEventId", eventId);
    }
  }, [eventId, form]);

  useEffect(() => {
    if (hasSingleSector && formSectors && formSectors[0]) {
      const currentSectorId = form.getValues("sectorId");
      if (currentSectorId !== formSectors[0].id) {
        form.setValue("sectorId", formSectors[0].id);
      }
    }
  }, [hasSingleSector, formSectors, form]);

  const getTicketPrice = () => {
    if (!selectedSector || !selectedTicketType) return 0;
    switch (selectedTicketType) {
      case 'INT': return Number(selectedSector.priceIntero) || 0;
      case 'RID': return Number(selectedSector.priceRidotto) || 0;
      case 'OMA': return 0;
      default: return 0;
    }
  };

  const ticketPrice = getTicketPrice();
  const prevenditaPrice = selectedSector ? Number(selectedSector.prevendita) || 0 : 0;
  const totalPerTicket = ticketPrice + prevenditaPrice;
  const totalPrice = totalPerTicket * (selectedQuantity || 1);

  const emitTicketMutation = useMutation({
    mutationFn: async (data: EmissionFormData) => {
      const sector = formSectors?.find(s => s.id === data.sectorId);
      if (!sector) throw new Error("Settore non trovato");

      const now = new Date();
      const emissionDateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const emissionTimeStr = now.toTimeString().slice(0, 5).replace(':', '');

      const ticketData = {
        ticketedEventId: data.ticketedEventId,
        sectorId: data.sectorId,
        ticketTypeCode: data.ticketTypeCode,
        sectorCode: sector.sectorCode,
        customerId: data.customerId || null,
        participantFirstName: data.participantFirstName || null,
        participantLastName: data.participantLastName || null,
        emissionDate: now.toISOString(),
        emissionDateStr,
        emissionTimeStr,
      };

      const response = await apiRequest("POST", `/api/siae/tickets`, ticketData);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsEmissionDialogOpen(false);
      setIsEmissionSheetOpen(false);
      form.reset();
      toast({
        title: "Biglietto Emesso",
        description: "Il biglietto è stato emesso con successo.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore Emissione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelTicketMutation = useMutation({
    mutationFn: async ({ ticketId, reasonCode, refund }: { ticketId: string; reasonCode: string; refund: boolean }) => {
      const response = await apiRequest("POST", `/api/siae/tickets/${ticketId}/cancel`, {
        reasonCode,
        refund,
        refundReason: refund ? `Annullamento biglietto - Causale: ${reasonCode}` : undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === '/api/siae/ticketed-events' });
      setIsCancelDialogOpen(false);
      setIsCancelSheetOpen(false);
      setSelectedTicket(null);
      setCancelReasonCode("");
      setRefundOnCancel(false);

      const wasRefunded = data.refund?.stripeRefundId || data.ticket?.refundedAt;
      const refundAmount = data.refund?.refundedAmount || data.ticket?.refundAmount;

      if (wasRefunded && refundAmount) {
        toast({
          title: "Biglietto Annullato e Rimborsato",
          description: `Rimborsato €${Number(refundAmount).toFixed(2)}`,
        });
      } else {
        toast({
          title: "Biglietto Annullato",
          description: "Il biglietto è stato annullato.",
        });
      }
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: Partial<SiaeTicketedEvent>) => {
      const response = await apiRequest("PATCH", `/api/siae/ticketed-events/${eventId}`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', eventId] });
      toast({ title: "Impostazioni aggiornate" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EmissionFormData) => {
    if (isNominativeRequired) {
      if (!data.participantFirstName?.trim() || !data.participantLastName?.trim()) {
        triggerHaptic('error');
        toast({
          title: "Dati mancanti",
          description: "Nome e cognome sono obbligatori",
          variant: "destructive",
        });
        return;
      }
    }
    emitTicketMutation.mutate(data);
  };

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" data-testid="badge-valid">Valido</Badge>;
      case "used":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30" data-testid="badge-used">Utilizzato</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid="badge-cancelled">Annullato</Badge>;
      case "refunded":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30" data-testid="badge-refunded">Rimborsato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completata</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Attesa</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Fallita</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Rimborsata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case "card":
        return <CreditCard className="w-4 h-4" />;
      case "cash":
        return <Banknote className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getPaymentLabel = (method: string | null) => {
    switch (method) {
      case "card": return "Carta";
      case "cash": return "Contanti";
      case "bank_transfer": return "Bonifico";
      case "paypal": return "PayPal";
      default: return method || "-";
    }
  };

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      searchQuery === "" ||
      ticket.fiscalSealCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.participantFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.participantLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.progressiveNumber?.toString().includes(searchQuery);

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredTransactions = transactions?.filter((transaction) => {
    const matchesSearch =
      searchQuery === "" ||
      transaction.transactionCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = transactionStatusFilter === "all" || transaction.status === transactionStatusFilter;

    let matchesDate = true;
    if (dateRange !== "all" && transaction.createdAt) {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      switch (dateRange) {
        case "today":
          matchesDate = transactionDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= monthAgo;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const ticketStats = {
    total: tickets?.length || 0,
    valid: tickets?.filter(t => t.status === "valid" || t.status === "active").length || 0,
    used: tickets?.filter(t => t.status === "used").length || 0,
    cancelled: tickets?.filter(t => t.status === "cancelled").length || 0,
    refunded: tickets?.filter(t => t.status === "refunded" || t.refundedAt).length || 0,
  };

  const transactionStats = {
    total: transactions?.length || 0,
    completed: transactions?.filter(t => t.status === "completed").length || 0,
    pending: transactions?.filter(t => t.status === "pending").length || 0,
    totalRevenue: transactions?.filter(t => t.status === "completed").reduce((sum, t) => sum + Number(t.totalAmount || 0), 0) || 0,
    refundedAmount: transactions?.filter(t => t.status === "refunded").reduce((sum, t) => sum + Number(t.totalAmount || 0), 0) || 0,
  };

  const chartData = [
    { name: 'Validi', value: ticketStats.valid, fill: '#10b981' },
    { name: 'Usati', value: ticketStats.used, fill: '#3b82f6' },
    { name: 'Annullati', value: ticketStats.cancelled, fill: '#ef4444' },
    { name: 'Rimborsati', value: ticketStats.refunded, fill: '#f97316' },
  ].filter(d => d.value > 0);

  const handleTicketClick = (ticket: SiaeTicket) => {
    triggerHaptic('light');
    setSelectedTicket(ticket);
    if (isMobile) {
      setIsTicketDetailOpen(true);
    } else {
      setIsTicketDetailDialogOpen(true);
    }
  };

  if (!eventId) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-event-selector">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestione Biglietteria</h1>
            <p className="text-muted-foreground">Seleziona un evento per gestire la biglietteria</p>
          </div>
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : ticketedEvents?.length === 0 ? (
          <Card data-testid="card-no-events">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Ticket className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nessun Evento</h3>
              <p className="text-muted-foreground">Non ci sono eventi con biglietteria attiva</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketedEvents?.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springConfig}
              >
                <Card
                  className="cursor-pointer hover-elevate"
                  onClick={() => navigate(`/siae/biglietteria/${event.id}`)}
                  data-testid={`card-event-${event.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{(event as any).eventName || `Evento #${event.id.slice(0, 8)}`}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.ticketsSold || 0} biglietti venduti
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant={event.ticketingStatus === 'active' ? 'default' : 'secondary'}>
                            {event.ticketingStatus === 'active' ? 'Attivo' : event.ticketingStatus}
                          </Badge>
                          {event.totalRevenue && Number(event.totalRevenue) > 0 && (
                            <span className="text-sm font-medium text-[#FFD700]">
                              €{Number(event.totalRevenue).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const BigliettiTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Cerca per codice, nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tickets"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="valid">Validi</SelectItem>
            <SelectItem value="used">Usati</SelectItem>
            <SelectItem value="cancelled">Annullati</SelectItem>
            <SelectItem value="refunded">Rimborsati</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setIsEmissionDialogOpen(true)} data-testid="button-new-ticket">
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Biglietto
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="stat-total">{ticketStats.total}</div>
            <p className="text-xs text-muted-foreground">Totale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-500" data-testid="stat-valid">{ticketStats.valid}</div>
            <p className="text-xs text-muted-foreground">Validi</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-500" data-testid="stat-used">{ticketStats.used}</div>
            <p className="text-xs text-muted-foreground">Usati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500" data-testid="stat-cancelled">{ticketStats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Annullati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500" data-testid="stat-refunded">{ticketStats.refunded}</div>
            <p className="text-xs text-muted-foreground">Rimborsati</p>
          </CardContent>
        </Card>
      </div>

      {ticketsLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      ) : filteredTickets?.length === 0 ? (
        <Card data-testid="card-no-tickets">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessun Biglietto</h3>
            <p className="text-muted-foreground">Non ci sono biglietti per questo evento</p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-tickets-table">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets?.map((ticket) => (
                  <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                    <TableCell className="font-mono text-sm" data-testid={`cell-code-${ticket.id}`}>
                      #{ticket.progressiveNumber}
                    </TableCell>
                    <TableCell data-testid={`cell-name-${ticket.id}`}>
                      {ticket.participantFirstName || ticket.participantLastName
                        ? `${ticket.participantFirstName || ''} ${ticket.participantLastName || ''}`.trim()
                        : '-'}
                    </TableCell>
                    <TableCell data-testid={`cell-sector-${ticket.id}`}>
                      {sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}
                    </TableCell>
                    <TableCell data-testid={`cell-status-${ticket.id}`}>
                      {getTicketStatusBadge(ticket.refundedAt ? 'refunded' : ticket.status)}
                    </TableCell>
                    <TableCell data-testid={`cell-price-${ticket.id}`}>
                      <span className="flex items-center gap-1 text-[#FFD700]">
                        <Euro className="w-3 h-3" />
                        {Number(ticket.grossAmount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTicketClick(ticket)}
                          data-testid={`button-view-${ticket.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {(ticket.status === "valid" || ticket.status === "active") && !ticket.refundedAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setIsCancelDialogOpen(true);
                            }}
                            data-testid={`button-cancel-${ticket.id}`}
                          >
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const TransazioniTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Cerca per codice, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-transactions"
          />
        </div>
        <Select value={transactionStatusFilter} onValueChange={setTransactionStatusFilter}>
          <SelectTrigger className="w-full md:w-40" data-testid="select-transaction-status">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="completed">Completate</SelectItem>
            <SelectItem value="pending">In Attesa</SelectItem>
            <SelectItem value="failed">Fallite</SelectItem>
            <SelectItem value="refunded">Rimborsate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full md:w-40" data-testid="select-date-range">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutto</SelectItem>
            <SelectItem value="today">Oggi</SelectItem>
            <SelectItem value="week">Ultima settimana</SelectItem>
            <SelectItem value="month">Ultimo mese</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold" data-testid="stat-transactions-total">{transactionStats.total}</div>
            <p className="text-xs text-muted-foreground">Transazioni</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-500" data-testid="stat-transactions-completed">{transactionStats.completed}</div>
            <p className="text-xs text-muted-foreground">Completate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#FFD700] flex items-center gap-1" data-testid="stat-revenue">
              <Euro className="w-5 h-5" />
              {transactionStats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Incasso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500 flex items-center gap-1" data-testid="stat-refunds">
              <Euro className="w-5 h-5" />
              {transactionStats.refundedAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Rimborsi</p>
          </CardContent>
        </Card>
      </div>

      {transactionsLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        </Card>
      ) : filteredTransactions?.length === 0 ? (
        <Card data-testid="card-no-transactions">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna Transazione</h3>
            <p className="text-muted-foreground">Non ci sono transazioni per questo evento</p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-transactions-table">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions?.map((transaction) => (
                  <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                    <TableCell className="font-mono text-xs" data-testid={`cell-tx-code-${transaction.id}`}>
                      {transaction.transactionCode}
                    </TableCell>
                    <TableCell data-testid={`cell-tx-date-${transaction.id}`}>
                      <div className="text-sm">
                        {transaction.createdAt && format(new Date(transaction.createdAt), "dd/MM/yyyy", { locale: it })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {transaction.createdAt && format(new Date(transaction.createdAt), "HH:mm", { locale: it })}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`cell-tx-amount-${transaction.id}`}>
                      <span className="flex items-center gap-1 font-medium text-[#FFD700]">
                        <Euro className="w-3 h-3" />
                        {Number(transaction.totalAmount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`cell-tx-method-${transaction.id}`}>
                      <span className="flex items-center gap-2">
                        {getPaymentIcon(transaction.paymentMethod)}
                        {getPaymentLabel(transaction.paymentMethod)}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`cell-tx-status-${transaction.id}`}>
                      {getTransactionStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setIsTransactionDetailOpen(true);
                        }}
                        data-testid={`button-view-tx-${transaction.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const ReportTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-[#FFD700]" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="report-total-sold">{ticketStats.total}</p>
                <p className="text-xs text-muted-foreground">Biglietti Venduti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Euro className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500" data-testid="report-total-revenue">
                  €{transactionStats.totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Incasso Totale</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <RefreshCcw className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500" data-testid="report-refunds">
                  €{transactionStats.refundedAmount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Rimborsi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500" data-testid="report-cancelled">{ticketStats.cancelled}</p>
                <p className="text-xs text-muted-foreground">Annullati</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#FFD700]" />
              Distribuzione Biglietti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nessun dato disponibile
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-[#FFD700]" />
              Esporta Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" data-testid="button-export-csv">
              <FileText className="w-4 h-4 mr-2" />
              Esporta CSV
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-export-pdf">
              <FileText className="w-4 h-4 mr-2" />
              Esporta PDF
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-export-excel">
              <FileText className="w-4 h-4 mr-2" />
              Esporta Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const OnlineTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#FFD700]" />
            Visibilità Online
          </CardTitle>
          <CardDescription>Gestisci la visibilità e le vendite online dell'evento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div>
              <Label className="font-medium">Stato Vendite</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {ticketedEvent?.ticketingStatus === 'active' ? 'Le vendite sono attive' : 'Le vendite sono sospese'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {ticketedEvent?.ticketingStatus === 'active' ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Attivo</Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Sospeso</Badge>
              )}
              <Switch
                checked={ticketedEvent?.ticketingStatus === 'active'}
                onCheckedChange={(checked) => {
                  updateEventMutation.mutate({
                    ticketingStatus: checked ? 'active' : 'suspended'
                  });
                }}
                disabled={updateEventMutation.isPending}
                data-testid="switch-sale-status"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inizio Vendite</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="button-sale-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {ticketedEvent?.saleStartDate
                      ? format(new Date(ticketedEvent.saleStartDate), "dd/MM/yyyy", { locale: it })
                      : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={ticketedEvent?.saleStartDate ? new Date(ticketedEvent.saleStartDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        updateEventMutation.mutate({ saleStartDate: date.toISOString() });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fine Vendite</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="button-sale-end">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {ticketedEvent?.saleEndDate
                      ? format(new Date(ticketedEvent.saleEndDate), "dd/MM/yyyy", { locale: it })
                      : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={ticketedEvent?.saleEndDate ? new Date(ticketedEvent.saleEndDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        updateEventMutation.mutate({ saleEndDate: date.toISOString() });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Limite Biglietti per Utente</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={100}
                value={ticketedEvent?.maxTicketsPerUser || 10}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    updateEventMutation.mutate({ maxTicketsPerUser: val });
                  }
                }}
                className="w-32"
                data-testid="input-max-tickets"
              />
              <span className="text-sm text-muted-foreground">biglietti massimi per utente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#FFD700]" />
            Impostazioni Avanzate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div>
              <Label className="font-medium">Biglietti Nominativi</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Richiedi nome e cognome per ogni biglietto
              </p>
            </div>
            <Switch
              checked={ticketedEvent?.requiresNominative || false}
              onCheckedChange={(checked) => {
                updateEventMutation.mutate({ requiresNominative: checked });
              }}
              disabled={updateEventMutation.isPending}
              data-testid="switch-nominative"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div>
              <Label className="font-medium">Consenti Cambio Nome</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Permetti ai clienti di cambiare il nome sul biglietto
              </p>
            </div>
            <Switch
              checked={ticketedEvent?.allowsChangeName || false}
              onCheckedChange={(checked) => {
                updateEventMutation.mutate({ allowsChangeName: checked });
              }}
              disabled={updateEventMutation.isPending}
              data-testid="switch-change-name"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
            <div>
              <Label className="font-medium">Consenti Rivendita</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Permetti ai clienti di rivendere i biglietti
              </p>
            </div>
            <Switch
              checked={ticketedEvent?.allowsResale || false}
              onCheckedChange={(checked) => {
                updateEventMutation.mutate({ allowsResale: checked });
              }}
              disabled={updateEventMutation.isPending}
              data-testid="switch-resale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const emissionFormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-emission">
        {!eventId && (
          <FormField
            control={form.control}
            name="ticketedEventId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Evento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12" data-testid="select-event">
                      <SelectValue placeholder="Seleziona evento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ticketedEvents
                      ?.filter(e => e.ticketingStatus === "active")
                      .map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {(event as any).eventName || `Evento #${event.id.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {formSectors && formSectors.length > 1 && (
          <FormField
            control={form.control}
            name="sectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipologia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12" data-testid="select-sector">
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {formSectors
                      .filter(sector => !(sector as any).salesSuspended)
                      .map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name} - {sector.availableSeats} disp.
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {hasSingleSector && selectedSector && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">Tipologia</p>
            <p className="font-medium">{selectedSector.name}</p>
            <p className="text-sm text-muted-foreground">{selectedSector.availableSeats} posti disponibili</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="ticketTypeCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Biglietto</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12" data-testid="select-ticket-type">
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INT">
                    Intero - €{selectedSector ? Number(selectedSector.priceIntero).toFixed(2) : "0.00"}
                  </SelectItem>
                  {selectedSector?.priceRidotto && Number(selectedSector.priceRidotto) > 0 && (
                    <SelectItem value="RID">
                      Ridotto - €{Number(selectedSector.priceRidotto).toFixed(2)}
                    </SelectItem>
                  )}
                  <SelectItem value="OMA">
                    Omaggio - €0.00
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="participantFirstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nome
                  {isNominativeRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome" className="h-12" data-testid="input-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="participantLastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Cognome
                  {isNominativeRequired && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Cognome" className="h-12" data-testid="input-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isNominativeRequired && (
          <p className="text-xs text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Biglietti nominativi obbligatori
          </p>
        )}

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantità</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={field.value || 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    field.onChange(isNaN(val) || val < 1 ? 1 : Math.min(val, 10));
                  }}
                  className="h-12"
                  data-testid="input-quantity"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedSector && selectedTicketType && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">Riepilogo</p>
            <div className="flex justify-between text-sm">
              <span>Biglietto:</span>
              <span>€{ticketPrice.toFixed(2)}</span>
            </div>
            {prevenditaPrice > 0 && (
              <div className="flex justify-between text-sm">
                <span>Prevendita:</span>
                <span>€{prevenditaPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#FFD700] border-t border-border pt-2 mt-2">
              <span>Totale:</span>
              <span>€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}
      </form>
    </Form>
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-biglietteria">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/siae/biglietteria")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gestione Biglietteria</h1>
              <p className="text-muted-foreground">{baseEvent?.name || "Caricamento..."}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            cardReadiness.ready
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            <CreditCard className="w-4 h-4" />
            <span>{cardReadiness.ready ? 'Smart Card OK' : 'Smart Card Non Disponibile'}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-container">
            <TabsTrigger value="biglietti" data-testid="tab-biglietti">
              <Ticket className="w-4 h-4 mr-2" />
              Biglietti
            </TabsTrigger>
            <TabsTrigger value="transazioni" data-testid="tab-transazioni">
              <Receipt className="w-4 h-4 mr-2" />
              Transazioni
            </TabsTrigger>
            <TabsTrigger value="report" data-testid="tab-report">
              <TrendingUp className="w-4 h-4 mr-2" />
              Report
            </TabsTrigger>
            <TabsTrigger value="online" data-testid="tab-online">
              <Globe className="w-4 h-4 mr-2" />
              Online
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biglietti" className="mt-6">
            <BigliettiTab />
          </TabsContent>
          <TabsContent value="transazioni" className="mt-6">
            <TransazioniTab />
          </TabsContent>
          <TabsContent value="report" className="mt-6">
            <ReportTab />
          </TabsContent>
          <TabsContent value="online" className="mt-6">
            <OnlineTab />
          </TabsContent>
        </Tabs>

        <Dialog open={isEmissionDialogOpen} onOpenChange={setIsEmissionDialogOpen}>
          <DialogContent className="max-w-md" data-testid="dialog-emission">
            <DialogHeader>
              <DialogTitle>Emetti Nuovo Biglietto</DialogTitle>
              <DialogDescription>Compila i dati per emettere un nuovo biglietto</DialogDescription>
            </DialogHeader>
            {emissionFormContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmissionDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={emitTicketMutation.isPending}
                data-testid="button-confirm-emission"
              >
                {emitTicketMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Emetti Biglietto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTicketDetailDialogOpen} onOpenChange={(open) => {
          setIsTicketDetailDialogOpen(open);
          if (!open) setSelectedTicket(null);
        }}>
          <DialogContent className="max-w-md" data-testid="dialog-ticket-detail">
            <DialogHeader>
              <DialogTitle>Dettaglio Biglietto #{selectedTicket?.progressiveNumber}</DialogTitle>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  {getTicketStatusBadge(selectedTicket.refundedAt ? 'refunded' : selectedTicket.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settore</span>
                    <span>{sectors?.find(s => s.id === selectedTicket.sectorId)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>{ticketTypes?.find(t => t.code === selectedTicket.ticketTypeCode)?.description}</span>
                  </div>
                  {(selectedTicket.participantFirstName || selectedTicket.participantLastName) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Intestatario</span>
                      <span>{`${selectedTicket.participantFirstName || ''} ${selectedTicket.participantLastName || ''}`.trim()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Importo</span>
                    <span className="font-bold text-[#FFD700]">€{Number(selectedTicket.grossAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emesso</span>
                    <span>{selectedTicket.emissionDate && format(new Date(selectedTicket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it })}</span>
                  </div>
                  {selectedTicket.fiscalSealCode && (
                    <div className="pt-2 border-t">
                      <span className="text-xs text-muted-foreground block mb-1">Sigillo Fiscale</span>
                      <span className="font-mono text-xs break-all">{selectedTicket.fiscalSealCode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
          setIsCancelDialogOpen(open);
          if (!open) {
            setSelectedTicket(null);
            setCancelReasonCode("");
            setRefundOnCancel(false);
          }
        }}>
          <DialogContent className="max-w-md" data-testid="dialog-cancel">
            <DialogHeader>
              <DialogTitle>Annulla Biglietto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Ban className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-muted-foreground">
                  Annullamento biglietto <strong>#{selectedTicket?.progressiveNumber}</strong>
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Causale *</Label>
                <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
                  <SelectTrigger data-testid="select-cancel-reason">
                    <SelectValue placeholder="Seleziona causale" />
                  </SelectTrigger>
                  <SelectContent>
                    {cancellationReasons?.map((reason) => (
                      <SelectItem key={reason.code} value={reason.code}>
                        {reason.code} - {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                selectedTicket?.transactionId
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-muted/50 border border-border opacity-60'
              }`}>
                <Checkbox
                  id="refund-checkbox"
                  checked={refundOnCancel}
                  onCheckedChange={(checked) => setRefundOnCancel(checked === true)}
                  disabled={!selectedTicket?.transactionId}
                  data-testid="checkbox-refund"
                />
                <div>
                  <Label htmlFor="refund-checkbox" className={`font-medium ${selectedTicket?.transactionId ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                    Rimborso automatico
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {selectedTicket?.transactionId
                      ? 'Il cliente riceverà il rimborso via Stripe'
                      : 'Non disponibile - biglietto senza pagamento online'}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCancelDialogOpen(false); setSelectedTicket(null); setCancelReasonCode(""); setRefundOnCancel(false); }}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReasonCode || cancelTicketMutation.isPending}
                onClick={() => selectedTicket && cancelTicketMutation.mutate({
                  ticketId: selectedTicket.id,
                  reasonCode: cancelReasonCode,
                  refund: refundOnCancel
                })}
                data-testid="button-confirm-cancel"
              >
                {cancelTicketMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Conferma Annullamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTransactionDetailOpen} onOpenChange={(open) => {
          setIsTransactionDetailOpen(open);
          if (!open) setSelectedTransaction(null);
        }}>
          <DialogContent className="max-w-lg" data-testid="dialog-transaction-detail">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#FFD700]" />
                Dettaglio Transazione
              </DialogTitle>
              <DialogDescription>
                Codice: {selectedTransaction?.transactionCode}
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Stato</div>
                    {getTransactionStatusBadge(selectedTransaction.status)}
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="text-xs text-muted-foreground mb-1">Importo Totale</div>
                    <div className="text-xl font-bold text-[#FFD700] flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      {Number(selectedTransaction.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {selectedTransaction.customerEmail && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Email</span>
                      <span>{selectedTransaction.customerEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Biglietti</span>
                    <span>{selectedTransaction.ticketsCount}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Metodo Pagamento</span>
                    <span className="flex items-center gap-2">
                      {getPaymentIcon(selectedTransaction.paymentMethod)}
                      {getPaymentLabel(selectedTransaction.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Data</span>
                    <span>
                      {selectedTransaction.createdAt && format(new Date(selectedTransaction.createdAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const mobileTabButtons = [
    { value: "biglietti", label: "Biglietti", icon: Ticket },
    { value: "transazioni", label: "Transazioni", icon: Receipt },
    { value: "report", label: "Report", icon: TrendingUp },
    { value: "online", label: "Online", icon: Globe },
  ];

  const header = (
    <MobileHeader
      title="Gestione Biglietteria"
      subtitle={baseEvent?.name}
      showBackButton
      showUserMenu
      onBack={() => navigate("/siae/biglietteria")}
      rightAction={
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          cardReadiness.ready
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          <CreditCard className="w-3 h-3" />
          <span>{cardReadiness.ready ? 'OK' : 'No'}</span>
        </div>
      }
    />
  );

  const footer = activeTab === "biglietti" ? (
    <div className="p-4 bg-card/95 backdrop-blur-xl border-t border-border">
      <HapticButton
        onClick={() => setIsEmissionSheetOpen(true)}
        disabled={!ticketedEvents?.some(e => e.ticketingStatus === "active") || !cardReadiness.ready}
        className="w-full h-14 text-base font-semibold"
        hapticType="medium"
        data-testid="button-emit-ticket-mobile"
      >
        <Plus className="w-5 h-5 mr-2" />
        Emetti Biglietto
      </HapticButton>
    </div>
  ) : null;

  return (
    <MobileAppLayout
      header={header}
      footer={footer}
      contentClassName="pb-24"
      data-testid="page-siae-biglietteria"
    >
      <div className="space-y-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {mobileTabButtons.map((tab) => (
            <HapticButton
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.value)}
              className="shrink-0 h-10 px-4 rounded-full"
              hapticType="light"
              data-testid={`tab-${tab.value}-mobile`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </HapticButton>
          ))}
        </div>

        {activeTab === "biglietti" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Cerca biglietto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base rounded-xl bg-card border-border"
                data-testid="input-search-mobile"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {[
                { value: "all", label: "Tutti", count: ticketStats.total },
                { value: "valid", label: "Validi", count: ticketStats.valid },
                { value: "used", label: "Usati", count: ticketStats.used },
                { value: "cancelled", label: "Annullati", count: ticketStats.cancelled },
              ].map((filter) => (
                <HapticButton
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  className="shrink-0 h-10 px-4 rounded-full"
                  hapticType="light"
                >
                  {filter.label} ({filter.count})
                </HapticButton>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-2xl font-bold text-[#FFD700]">{ticketStats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Totale</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-2xl font-bold text-emerald-400">{ticketStats.valid}</p>
                <p className="text-xs text-muted-foreground mt-1">Validi</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-2xl font-bold text-blue-400">{ticketStats.used}</p>
                <p className="text-xs text-muted-foreground mt-1">Usati</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center border border-border">
                <p className="text-2xl font-bold text-red-400">{ticketStats.cancelled}</p>
                <p className="text-xs text-muted-foreground mt-1">Annull.</p>
              </div>
            </div>

            {ticketsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
              </div>
            ) : filteredTickets?.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <Ticket className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Nessun Biglietto</h3>
                <p className="text-sm text-muted-foreground">Non ci sono biglietti per questo evento</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredTickets?.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ ...springConfig, delay: index * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTicketClick(ticket)}
                      className="bg-card rounded-2xl border border-border p-4 active:bg-muted/30"
                      data-testid={`card-ticket-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-mono font-bold text-lg">#{ticket.progressiveNumber}</span>
                            {getTicketStatusBadge(ticket.refundedAt ? 'refunded' : ticket.status)}
                          </div>

                          <p className="text-sm text-muted-foreground mb-1">
                            {sectors?.find(s => s.id === ticket.sectorId)?.name || ticket.sectorCode}
                            {' · '}
                            {ticketTypes?.find(t => t.code === ticket.ticketTypeCode)?.description || ticket.ticketTypeCode}
                          </p>

                          {(ticket.participantFirstName || ticket.participantLastName) && (
                            <p className="text-sm font-medium">
                              {`${ticket.participantFirstName || ""} ${ticket.participantLastName || ""}`.trim()}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1 text-sm font-semibold text-[#FFD700]">
                              <Euro className="w-4 h-4" />
                              €{Number(ticket.grossAmount).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {ticket.emissionDate && format(new Date(ticket.emissionDate), "dd/MM HH:mm", { locale: it })}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {activeTab === "transazioni" && <TransazioniTab />}
        {activeTab === "report" && <ReportTab />}
        {activeTab === "online" && <OnlineTab />}
      </div>

      <BottomSheet
        open={isEmissionSheetOpen}
        onClose={() => setIsEmissionSheetOpen(false)}
        title="Emetti Biglietto"
      >
        <div className="p-4">
          {emissionFormContent}
          <div className="mt-6">
            <HapticButton
              onClick={form.handleSubmit(onSubmit)}
              disabled={emitTicketMutation.isPending}
              className="w-full h-14 text-base font-semibold"
              hapticType="success"
              data-testid="button-confirm-emission-mobile"
            >
              {emitTicketMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Emetti Biglietto
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isTicketDetailOpen}
        onClose={() => { setIsTicketDetailOpen(false); setSelectedTicket(null); }}
        title={`Biglietto #${selectedTicket?.progressiveNumber}`}
      >
        {selectedTicket && (
          <div className="p-4 space-y-4">
            <div className="flex justify-center">
              {getTicketStatusBadge(selectedTicket.refundedAt ? 'refunded' : selectedTicket.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Settore</span>
                <span>{sectors?.find(s => s.id === selectedTicket.sectorId)?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Tipo</span>
                <span>{ticketTypes?.find(t => t.code === selectedTicket.ticketTypeCode)?.description}</span>
              </div>
              {(selectedTicket.participantFirstName || selectedTicket.participantLastName) && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Intestatario</span>
                  <span>{`${selectedTicket.participantFirstName || ''} ${selectedTicket.participantLastName || ''}`.trim()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Importo</span>
                <span className="font-bold text-[#FFD700]">€{Number(selectedTicket.grossAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Emesso</span>
                <span>{selectedTicket.emissionDate && format(new Date(selectedTicket.emissionDate), "dd/MM/yyyy HH:mm", { locale: it })}</span>
              </div>
            </div>

            {(selectedTicket.status === "valid" || selectedTicket.status === "active") && !selectedTicket.refundedAt && (
              <HapticButton
                variant="destructive"
                onClick={() => {
                  setIsTicketDetailOpen(false);
                  setIsCancelSheetOpen(true);
                }}
                className="w-full h-12"
                hapticType="medium"
                data-testid="button-cancel-ticket-mobile"
              >
                <Ban className="w-4 h-4 mr-2" />
                Annulla Biglietto
              </HapticButton>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={isCancelSheetOpen}
        onClose={() => { setIsCancelSheetOpen(false); setCancelReasonCode(""); setRefundOnCancel(false); }}
        title="Annulla Biglietto"
      >
        <div className="p-4 space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <Ban className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-muted-foreground">
              Annullamento biglietto <strong>#{selectedTicket?.progressiveNumber}</strong>
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Causale *</Label>
            <Select value={cancelReasonCode} onValueChange={setCancelReasonCode}>
              <SelectTrigger className="h-12" data-testid="select-cancel-reason-mobile">
                <SelectValue placeholder="Seleziona causale" />
              </SelectTrigger>
              <SelectContent>
                {cancellationReasons?.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.code} - {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-xl ${
            selectedTicket?.transactionId
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'bg-muted/50 border border-border opacity-60'
          }`}>
            <Checkbox
              id="refund-checkbox-mobile"
              checked={refundOnCancel}
              onCheckedChange={(checked) => setRefundOnCancel(checked === true)}
              disabled={!selectedTicket?.transactionId}
              data-testid="checkbox-refund-mobile"
            />
            <div>
              <Label htmlFor="refund-checkbox-mobile" className={`font-medium ${selectedTicket?.transactionId ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                Rimborso automatico
              </Label>
              <p className="text-xs text-muted-foreground">
                {selectedTicket?.transactionId
                  ? 'Il cliente riceverà il rimborso via Stripe'
                  : 'Non disponibile - biglietto senza pagamento online'}
              </p>
            </div>
          </div>

          <HapticButton
            variant="destructive"
            disabled={!cancelReasonCode || cancelTicketMutation.isPending}
            onClick={() => selectedTicket && cancelTicketMutation.mutate({
              ticketId: selectedTicket.id,
              reasonCode: cancelReasonCode,
              refund: refundOnCancel
            })}
            className="w-full h-14"
            hapticType="error"
            data-testid="button-confirm-cancel-mobile"
          >
            {cancelTicketMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Conferma Annullamento
          </HapticButton>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
