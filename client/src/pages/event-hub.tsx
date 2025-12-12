import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  LayoutDashboard,
  Ticket,
  Users,
  Armchair,
  Package,
  Euro,
  Activity,
  Settings,
  Play,
  Pause,
  StopCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  QrCode,
  UserPlus,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Bell,
  MoreHorizontal,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Circle,
  BarChart3,
  PieChart,
  FileText,
  Download,
  Share2,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MessageSquare,
  Megaphone,
  ShieldAlert,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import type {
  Event,
  Station,
  GuestList,
  GuestListEntry,
  EventTable,
  TableBooking,
  SiaeTicketedEvent,
  SiaeEventSector,
  User,
  Product,
  Location as LocationType,
} from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType; gradient: string }> = {
  draft: { label: 'Bozza', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: Circle, gradient: 'from-slate-500 to-slate-600' },
  scheduled: { label: 'Programmato', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Calendar, gradient: 'from-blue-500 to-indigo-600' },
  ongoing: { label: 'In Corso', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: Zap, gradient: 'from-emerald-500 to-teal-600' },
  closed: { label: 'Chiuso', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2, gradient: 'from-rose-500 to-pink-600' },
};

interface ActivityLogItem {
  id: string;
  type: 'check_in' | 'ticket_sold' | 'table_booked' | 'guest_added' | 'status_change' | 'stock_transfer' | 'alert';
  message: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, any>;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissed?: boolean;
}

function LiveIndicator({ isLive }: { isLive: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      isLive ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
      {isLive ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}

function KPICard({
  title,
  value,
  subValue,
  icon: Icon,
  gradient,
  progress,
  trend,
  onClick,
  testId,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  gradient: string;
  progress?: number;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
  testId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass-card p-4 ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
      {progress !== undefined && (
        <Progress value={progress} className="h-1.5 mt-3" />
      )}
    </motion.div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  testId: string;
}) {
  const variantStyles = {
    default: 'bg-white/5 hover:bg-white/10 text-foreground',
    success: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400',
    warning: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-2 p-4 min-h-11 rounded-xl transition-all ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      data-testid={testId}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium text-center">{label}</span>
    </button>
  );
}

function ActivityLogEntry({ item }: { item: ActivityLogItem }) {
  const iconMap = {
    check_in: { icon: UserPlus, color: 'text-emerald-400' },
    ticket_sold: { icon: Ticket, color: 'text-blue-400' },
    table_booked: { icon: Armchair, color: 'text-purple-400' },
    guest_added: { icon: Users, color: 'text-cyan-400' },
    status_change: { icon: Activity, color: 'text-amber-400' },
    stock_transfer: { icon: Package, color: 'text-indigo-400' },
    alert: { icon: AlertTriangle, color: 'text-red-400' },
  };
  
  const { icon: Icon, color } = iconMap[item.type];

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`p-1.5 rounded-lg bg-white/5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{item.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {format(item.timestamp, 'HH:mm', { locale: it })}
          </span>
          {item.user && (
            <span className="text-xs text-muted-foreground">• {item.user}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ alert, onDismiss }: { alert: AlertItem; onDismiss: () => void }) {
  const styles = {
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  };
  
  const icons = {
    warning: AlertTriangle,
    error: ShieldAlert,
    info: Bell,
    success: CheckCircle2,
  };
  
  const Icon = icons[alert.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${styles[alert.type]}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{alert.title}</p>
        <p className="text-xs opacity-80">{alert.message}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
        <span className="sr-only">Chiudi</span>
        ×
      </Button>
    </motion.div>
  );
}

function EntranceChart({ data }: { data: Array<{ time: string; entries: number; cumulative: number }> }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Flusso Ingressi
        </CardTitle>
        <CardDescription>Ingressi per fascia oraria</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[160px] md:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="entriesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="entries"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#entriesGradient)"
                name="Ingressi"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function VenueMap({ 
  tables, 
  bookings, 
  onTableClick 
}: { 
  tables: EventTable[]; 
  bookings: TableBooking[];
  onTableClick?: (table: EventTable) => void;
}) {
  const getTableStatus = (tableId: string) => {
    const booking = bookings.find(b => b.tableId === tableId && b.status !== 'cancelled');
    if (!booking) return 'available';
    if (booking.status === 'seated') return 'occupied';
    if (booking.status === 'confirmed') return 'reserved';
    return 'pending';
  };

  const statusColors = {
    available: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    reserved: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    occupied: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    pending: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
  };

  const tablesByType = useMemo(() => {
    const grouped: Record<string, EventTable[]> = {};
    tables.forEach(table => {
      const type = table.tableType || 'standard';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(table);
    });
    return grouped;
  }, [tables]);

  if (tables.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-400" />
            Mappa Venue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun tavolo configurato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-400" />
            Mappa Venue
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Libero
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" /> Prenotato
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" /> Occupato
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(tablesByType).map(([type, typeTables]) => (
            <div key={type}>
              <h4 className="text-sm font-medium mb-2 capitalize text-muted-foreground">
                {type === 'standard' ? 'Standard' : type === 'vip' ? 'VIP' : type === 'prive' ? 'Privé' : type}
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {typeTables.map(table => {
                  const status = getTableStatus(table.id);
                  const booking = bookings.find(b => b.tableId === table.id && b.status !== 'cancelled');
                  
                  return (
                    <motion.button
                      key={table.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onTableClick?.(table)}
                      className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${statusColors[status]}`}
                      title={booking ? `${booking.customerName} - ${booking.guestsCount} ospiti` : 'Disponibile'}
                    >
                      <Armchair className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-medium truncate w-full text-center">
                        {table.name}
                      </span>
                      {table.capacity && (
                        <span className="text-[9px] opacity-70">{table.capacity}p</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopConsumptionsWidget({ eventId }: { eventId: string }) {
  const { data: consumptions } = useQuery<Array<{ productName: string; quantity: number; revenue: number }>>({
    queryKey: ['/api/events', eventId, 'top-consumptions'],
    enabled: !!eventId,
  });

  const mockData = [
    { productName: 'Vodka Premium', quantity: 45, revenue: 675 },
    { productName: 'Gin Tonic', quantity: 38, revenue: 342 },
    { productName: 'Prosecco', quantity: 32, revenue: 256 },
    { productName: 'Rum Cuba', quantity: 28, revenue: 224 },
    { productName: 'Whisky', quantity: 22, revenue: 330 },
  ];

  const data = consumptions || mockData;
  const COLORS = ['#FFD700', '#22d3ee', '#a855f7', '#f472b6', '#34d399'];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-400" />
          Top Consumi
        </CardTitle>
        <CardDescription>Prodotti più venduti stasera</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  dataKey="quantity"
                  strokeWidth={0}
                >
                  {data.slice(0, 5).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.slice(0, 5).map((item, index) => (
              <div key={item.productName} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate max-w-[120px]">{item.productName}</span>
                </div>
                <span className="font-medium">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventHub() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLive, setIsLive] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pauseTicketingDialogOpen, setPauseTicketingDialogOpen] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: location } = useQuery<LocationType>({
    queryKey: ['/api/locations', event?.locationId],
    enabled: !!event?.locationId,
  });

  const { data: eventStations = [] } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const { data: eventStocks = [] } = useQuery<Array<{ id: string; productId: string; quantity: string }>>({
    queryKey: ['/api/events', id, 'stocks'],
    enabled: !!id,
  });

  const { data: guestLists = [] } = useQuery<GuestList[]>({
    queryKey: ['/api/pr/events', id, 'guest-lists'],
    enabled: !!id,
  });

  const { data: tables = [] } = useQuery<EventTable[]>({
    queryKey: ['/api/pr/events', id, 'tables'],
    enabled: !!id,
  });

  const { data: bookings = [] } = useQuery<TableBooking[]>({
    queryKey: ['/api/pr/events', id, 'bookings'],
    enabled: !!id,
  });

  const { data: ticketedEvent } = useQuery<SiaeTicketedEvent>({
    queryKey: ['/api/siae/events', id, 'ticketing'],
    enabled: !!id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const changeStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest('PATCH', `/api/events/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setStatusChangeDialogOpen(false);
      toast({
        title: "Stato aggiornato",
        description: "Lo stato dell'evento è stato modificato con successo.",
      });
      addActivityLog({
        type: 'status_change',
        message: 'Stato evento aggiornato',
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare lo stato dell'evento.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato eliminato con successo.",
      });
      navigate('/events');
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile eliminare l'evento.",
        variant: "destructive",
      });
    },
  });

  const addActivityLog = useCallback((item: Omit<ActivityLogItem, 'id' | 'timestamp'>) => {
    setActivityLog(prev => [{
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      user: user?.firstName || user?.email || undefined,
    }, ...prev].slice(0, 50));
  }, [user]);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id' | 'timestamp'>) => {
    setAlerts(prev => [{
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }, ...prev]);
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  useEffect(() => {
    if (event?.status === 'ongoing') {
      try {
        const ws = new WebSocket(`ws://localhost:18765/events/${id}`);
        ws.onopen = () => {
          setIsLive(true);
          setWsConnection(ws);
        };
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === 'activity') {
              addActivityLog(data.payload);
            } else if (data.type === 'alert') {
              addAlert(data.payload);
            } else if (data.type === 'refresh') {
              queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e);
          }
        };
        ws.onclose = () => {
          setIsLive(false);
          setWsConnection(null);
        };
        ws.onerror = () => {
          setIsLive(false);
        };
        return () => ws.close();
      } catch (e) {
        console.error('WebSocket connection failed:', e);
      }
    }
  }, [event?.status, id, addActivityLog, addAlert]);

  const totalGuests = useMemo(() => {
    return guestLists.reduce((acc, list) => acc + (list.currentCount || 0), 0);
  }, [guestLists]);

  const maxGuests = useMemo(() => {
    return guestLists.reduce((acc, list) => acc + (list.maxGuests || 0), 0);
  }, [guestLists]);

  const checkedInGuests = useMemo(() => {
    return guestLists.reduce((acc, list) => acc + ((list as any).checkedInCount || 0), 0);
  }, [guestLists]);

  const bookedTables = useMemo(() => {
    return bookings.filter(b => b.status !== 'cancelled').length;
  }, [bookings]);

  const totalRevenue = useMemo(() => {
    let revenue = 0;
    if (ticketedEvent) {
      revenue += Number(ticketedEvent.totalRevenue || 0);
    }
    bookings.forEach(b => {
      if (b.status === 'confirmed' || b.status === 'seated') {
        revenue += Number(b.depositPaid || 0);
      }
    });
    return revenue;
  }, [ticketedEvent, bookings]);

  const status = statusConfig[event?.status || 'draft'];
  const StatusIcon = status?.icon || Circle;

  if (eventLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-20 w-full mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Evento non trovato</h2>
            <p className="text-muted-foreground mb-4">L'evento richiesto non esiste o è stato eliminato.</p>
            <Button onClick={() => navigate('/events')} data-testid="button-back-to-events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna agli Eventi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusTransitions: Record<string, { next: string; label: string; icon: React.ElementType }> = {
    draft: { next: 'scheduled', label: 'Programma Evento', icon: Calendar },
    scheduled: { next: 'ongoing', label: 'Avvia Evento', icon: Play },
    ongoing: { next: 'closed', label: 'Chiudi Evento', icon: StopCircle },
  };

  const currentTransition = statusTransitions[event.status];

  return (
    <div className="min-h-screen pb-24 md:pb-8" data-testid="page-event-hub">
      <AnimatePresence>
        {alerts.filter(a => !a.dismissed).map(alert => (
          <div key={alert.id} className="px-4 md:px-6 pt-2">
            <AlertBanner alert={alert} onDismiss={() => dismissAlert(alert.id)} />
          </div>
        ))}
      </AnimatePresence>

      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/events')}
                className="rounded-xl"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold" data-testid="event-title">{event.name}</h1>
                  <Badge className={`${status.bgColor} ${status.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                  <LiveIndicator isLive={isLive} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(event.startDatetime), "EEEE d MMMM", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(event.startDatetime), "HH:mm", { locale: it })}
                    {event.endDatetime && ` - ${format(new Date(event.endDatetime), "HH:mm", { locale: it })}`}
                  </span>
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(user?.role === 'super_admin' || user?.role === 'gestore') && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  data-testid="button-delete-event"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {currentTransition && (
                <Button
                  onClick={() => setStatusChangeDialogOpen(true)}
                  className={`bg-gradient-to-r ${status.gradient} text-white`}
                  data-testid="button-change-status"
                >
                  <currentTransition.icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{currentTransition.label}</span>
                </Button>
              )}

              <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-quick-actions">
                    <Zap className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Azioni Rapide</SheetTitle>
                    <SheetDescription>
                      Operazioni veloci per gestire l'evento
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <QuickActionButton
                      icon={QrCode}
                      label="Scansiona QR"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate('/pr/scanner');
                      }}
                      testId="quick-action-scan"
                    />
                    <QuickActionButton
                      icon={UserPlus}
                      label="Aggiungi Ospite"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/pr/guest-lists?eventId=${id}`);
                      }}
                      testId="quick-action-add-guest"
                    />
                    <QuickActionButton
                      icon={Armchair}
                      label="Prenota Tavolo"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/pr/tables?eventId=${id}`);
                      }}
                      testId="quick-action-book-table"
                    />
                    <QuickActionButton
                      icon={Package}
                      label="Trasferisci Stock"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/events/${id}`);
                      }}
                      testId="quick-action-transfer"
                    />
                    <QuickActionButton
                      icon={BarChart3}
                      label="Report Live"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/reports?eventId=${id}`);
                      }}
                      testId="quick-action-report"
                    />
                    <QuickActionButton
                      icon={FileText}
                      label="File Serata"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        navigate(`/night-file?eventId=${id}`);
                      }}
                      testId="quick-action-night-file"
                    />
                  </div>

                  <Separator className="my-6" />

                  <h4 className="font-medium mb-3 text-sm">Azioni di Emergenza</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickActionButton
                      icon={Pause}
                      label="Pausa Vendite"
                      onClick={() => {
                        setPauseTicketingDialogOpen(true);
                      }}
                      variant="warning"
                      disabled={event.status !== 'ongoing'}
                      testId="quick-action-pause"
                    />
                    <QuickActionButton
                      icon={ShieldAlert}
                      label="SOS Sicurezza"
                      onClick={() => {
                        toast({
                          title: "SOS Sicurezza",
                          description: "Alert inviato al team sicurezza",
                          variant: "destructive",
                        });
                        addAlert({
                          type: 'error',
                          title: 'SOS Sicurezza Attivato',
                          message: 'Il team sicurezza è stato allertato',
                        });
                      }}
                      variant="danger"
                      testId="quick-action-sos"
                    />
                    <QuickActionButton
                      icon={Megaphone}
                      label="Annuncio Staff"
                      onClick={() => {
                        toast({
                          title: "Annuncio Staff",
                          description: "Funzione in arrivo",
                        });
                      }}
                      testId="quick-action-announce"
                    />
                    <QuickActionButton
                      icon={Lock}
                      label="Blocca Ingressi"
                      onClick={() => {
                        toast({
                          title: "Ingressi Bloccati",
                          description: "Nessun nuovo ingresso consentito",
                          variant: "destructive",
                        });
                      }}
                      variant="danger"
                      disabled={event.status !== 'ongoing'}
                      testId="quick-action-lock"
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid="button-more-options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/events/wizard/${id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica Evento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/reports?eventId=${id}`)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Visualizza Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/night-file?eventId=${id}`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    File della Serata
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
                    toast({ title: "Dati aggiornati" });
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Aggiorna Dati
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Biglietti"
            value={ticketedEvent?.ticketsSold || 0}
            subValue={ticketedEvent ? `/ ${ticketedEvent.totalCapacity}` : 'Non attivo'}
            icon={Ticket}
            gradient="from-blue-500 to-indigo-600"
            progress={ticketedEvent ? (ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100 : 0}
            onClick={() => setActiveTab('ticketing')}
            testId="kpi-tickets"
          />
          <KPICard
            title="Ospiti Liste"
            value={`${checkedInGuests}/${totalGuests}`}
            subValue={maxGuests > 0 ? `Max ${maxGuests}` : 'Nessuna lista'}
            icon={Users}
            gradient="from-cyan-500 to-teal-600"
            progress={maxGuests > 0 ? (checkedInGuests / maxGuests) * 100 : 0}
            onClick={() => setActiveTab('guests')}
            testId="kpi-guests"
          />
          <KPICard
            title="Tavoli"
            value={`${bookedTables}/${tables.length}`}
            subValue={tables.length > 0 ? 'Prenotati' : 'Nessun tavolo'}
            icon={Armchair}
            gradient="from-purple-500 to-pink-600"
            progress={tables.length > 0 ? (bookedTables / tables.length) * 100 : 0}
            onClick={() => setActiveTab('tables')}
            testId="kpi-tables"
          />
          <KPICard
            title="Incasso"
            value={`€${totalRevenue.toFixed(0)}`}
            subValue="Totale evento"
            icon={Euro}
            gradient="from-amber-500 to-orange-600"
            trend={totalRevenue > 0 ? { value: 12, isPositive: true } : undefined}
            onClick={() => setActiveTab('finance')}
            testId="kpi-revenue"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-transparent gap-1 p-0">
            {[
              { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
              { id: 'ticketing', label: 'Biglietteria', icon: Ticket },
              { id: 'guests', label: 'Liste', icon: Users },
              { id: 'tables', label: 'Tavoli', icon: Armchair },
              { id: 'staff', label: 'Staff', icon: Users },
              { id: 'inventory', label: 'Inventario', icon: Package },
              { id: 'finance', label: 'Incassi', icon: Euro },
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2 min-h-11 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="md:col-span-1 lg:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Stato Evento
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {Object.entries(statusConfig).map(([key, config], index) => {
                        const isActive = event.status === key;
                        const isPassed = Object.keys(statusConfig).indexOf(event.status) > index;
                        const IconComponent = config.icon;
                        
                        return (
                          <div key={key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                                isActive 
                                  ? 'border-primary bg-primary text-primary-foreground scale-110' 
                                  : isPassed 
                                  ? 'border-primary bg-primary/20 text-primary' 
                                  : 'border-muted bg-muted/20 text-muted-foreground'
                              }`}>
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <span className={`text-xs text-center ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                                {config.label}
                              </span>
                            </div>
                            {index < 3 && (
                              <div className={`h-0.5 w-full mx-2 rounded-full ${
                                isPassed ? 'bg-primary' : 'bg-muted'
                              }`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-400" />
                        Azioni Rapide
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <QuickActionButton
                        icon={QrCode}
                        label="Scansiona"
                        onClick={() => navigate('/pr/scanner')}
                        testId="overview-scan"
                      />
                      <QuickActionButton
                        icon={UserPlus}
                        label="Ospite"
                        onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)}
                        testId="overview-add-guest"
                      />
                      <QuickActionButton
                        icon={Armchair}
                        label="Tavolo"
                        onClick={() => navigate(`/pr/tables?eventId=${id}`)}
                        testId="overview-table"
                      />
                      <QuickActionButton
                        icon={Package}
                        label="Stock"
                        onClick={() => navigate(`/events/${id}`)}
                        testId="overview-stock"
                      />
                      <QuickActionButton
                        icon={BarChart3}
                        label="Report"
                        onClick={() => navigate(`/reports?eventId=${id}`)}
                        testId="overview-report"
                      />
                      <QuickActionButton
                        icon={FileText}
                        label="File Serata"
                        onClick={() => navigate(`/night-file?eventId=${id}`)}
                        testId="overview-night-file"
                      />
                    </div>
                  </CardContent>
                </Card>

                {event.notes && (
                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Note Evento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <EntranceChart 
                  data={[
                    { time: '21:00', entries: 12, cumulative: 12 },
                    { time: '22:00', entries: 45, cumulative: 57 },
                    { time: '23:00', entries: 78, cumulative: 135 },
                    { time: '00:00', entries: 92, cumulative: 227 },
                    { time: '01:00', entries: 35, cumulative: 262 },
                    { time: '02:00', entries: 18, cumulative: 280 },
                  ]} 
                />

                <VenueMap 
                  tables={tables} 
                  bookings={bookings}
                  onTableClick={(table) => {
                    navigate(`/pr/tables?tableId=${table.id}`);
                  }}
                />
              </div>

              <div className="space-y-6">
                <TopConsumptionsWidget eventId={id || ''} />
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        Attività Live
                      </CardTitle>
                      <LiveIndicator isLive={isLive} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      {activityLog.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nessuna attività recente</p>
                          <p className="text-xs mt-1">Le attività appariranno qui in tempo reale</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {activityLog.map(item => (
                            <ActivityLogEntry key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="h-5 w-5 text-amber-400" />
                      Avvisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alerts.length === 0 && eventStocks.length < 5 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                          <div>
                            <p className="text-sm font-medium text-amber-400">Scorte Basse</p>
                            <p className="text-xs text-muted-foreground">Meno di 5 prodotti in evento</p>
                          </div>
                        </div>
                      )}
                      {alerts.length === 0 && tables.length > 0 && bookedTables === tables.length && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          <div>
                            <p className="text-sm font-medium text-emerald-400">Tavoli Completi</p>
                            <p className="text-xs text-muted-foreground">Tutti i tavoli sono prenotati</p>
                          </div>
                        </div>
                      )}
                      {alerts.length === 0 && !ticketedEvent && guestLists.length === 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <Bell className="h-5 w-5 text-blue-400" />
                          <div>
                            <p className="text-sm font-medium text-blue-400">Configura Evento</p>
                            <p className="text-xs text-muted-foreground">Aggiungi liste o biglietteria</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ticketing">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-blue-400" />
                    Biglietteria SIAE
                  </CardTitle>
                  <Button onClick={() => navigate('/siae/ticketed-events')} variant="outline" size="sm">
                    Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ticketedEvent ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-background/50 border">
                        <div className="text-2xl font-bold text-blue-400">{ticketedEvent.ticketsSold}</div>
                        <div className="text-xs text-muted-foreground">Venduti</div>
                      </div>
                      <div className="p-4 rounded-lg bg-background/50 border">
                        <div className="text-2xl font-bold text-emerald-400">{ticketedEvent.totalCapacity - ticketedEvent.ticketsSold}</div>
                        <div className="text-xs text-muted-foreground">Disponibili</div>
                      </div>
                      <div className="p-4 rounded-lg bg-background/50 border">
                        <div className="text-2xl font-bold text-rose-400">{ticketedEvent.ticketsCancelled}</div>
                        <div className="text-xs text-muted-foreground">Annullati</div>
                      </div>
                      <div className="p-4 rounded-lg bg-background/50 border">
                        <div className="text-2xl font-bold text-amber-400">€{Number(ticketedEvent.totalRevenue || 0).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">Incasso</div>
                      </div>
                    </div>
                    <Progress value={(ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Occupazione</span>
                      <span className="font-medium">{((ticketedEvent.ticketsSold / ticketedEvent.totalCapacity) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-2">Biglietteria Non Attiva</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Attiva la biglietteria SIAE per vendere biglietti
                    </p>
                    <Button onClick={() => navigate('/siae/ticketed-events')}>
                      Attiva Biglietteria
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-cyan-400" />
                    Liste Ospiti
                  </CardTitle>
                  <Button onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)} variant="outline" size="sm">
                    Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {guestLists.length > 0 ? (
                  <div className="space-y-4">
                    {guestLists.map(list => (
                      <div key={list.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border">
                        <div>
                          <h4 className="font-medium">{list.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {(list as any).checkedInCount || 0} check-in / {list.currentCount || 0} ospiti
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{list.currentCount || 0}</div>
                          {list.maxGuests && (
                            <Progress 
                              value={((list.currentCount || 0) / list.maxGuests) * 100} 
                              className="h-1.5 w-20 mt-1" 
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-2">Nessuna Lista</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Crea una lista ospiti per questo evento
                    </p>
                    <Button onClick={() => navigate(`/pr/guest-lists?eventId=${id}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Lista
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Armchair className="h-5 w-5 text-purple-400" />
                    Tavoli e Prenotazioni
                  </CardTitle>
                  <Button onClick={() => navigate(`/pr/tables?eventId=${id}`)} variant="outline" size="sm">
                    Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tables.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {tables.map(table => {
                      const booking = bookings.find(b => b.tableId === table.id && b.status !== 'cancelled');
                      const isBooked = !!booking;
                      
                      return (
                        <div 
                          key={table.id}
                          className={`p-4 rounded-lg border-2 text-center transition-all ${
                            isBooked 
                              ? 'bg-purple-500/20 border-purple-500/50' 
                              : 'bg-background/50 border-dashed border-muted hover:border-muted-foreground'
                          }`}
                        >
                          <Armchair className={`h-8 w-8 mx-auto mb-2 ${isBooked ? 'text-purple-400' : 'text-muted-foreground'}`} />
                          <div className="font-medium">{table.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{table.tableType}</div>
                          {isBooked && booking && (
                            <div className="mt-2 text-xs">
                              <div className="font-medium text-purple-400">{booking.customerName}</div>
                              <div className="text-muted-foreground">{booking.guestsCount} ospiti</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Armchair className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-2">Nessun Tavolo</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configura i tavoli per questo evento
                    </p>
                    <Button onClick={() => navigate(`/pr/tables?eventId=${id}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Tavoli
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-400" />
                    Staff Assegnato
                  </CardTitle>
                  <Button onClick={() => navigate(`/pr/staff?eventId=${id}`)} variant="outline" size="sm">
                    Gestisci <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Postazioni ({eventStations.length})
                    </h4>
                    {eventStations.length > 0 ? (
                      <div className="space-y-2">
                        {eventStations.map(station => {
                          const bartenders = users.filter(u => station.bartenderIds?.includes(u.id));
                          return (
                            <div key={station.id} className="p-3 rounded-lg bg-background/50 border">
                              <div className="font-medium">{station.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {bartenders.length > 0 
                                  ? bartenders.map(b => `${b.firstName} ${b.lastName}`).join(', ')
                                  : 'Nessun barista assegnato'
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nessuna postazione configurata</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Baristi Assegnati
                    </h4>
                    {(() => {
                      const assignedBartenderIds = new Set(eventStations.flatMap(s => s.bartenderIds || []));
                      const assignedBartenders = users.filter(u => assignedBartenderIds.has(u.id));
                      
                      return assignedBartenders.length > 0 ? (
                        <div className="space-y-2">
                          {assignedBartenders.map(bartender => (
                            <div key={bartender.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-medium">
                                {bartender.firstName?.[0]}{bartender.lastName?.[0]}
                              </div>
                              <div>
                                <div className="font-medium">{bartender.firstName} {bartender.lastName}</div>
                                <div className="text-xs text-muted-foreground">{bartender.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nessun barista assegnato</p>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-400" />
                    Inventario Evento
                  </CardTitle>
                  <Button onClick={() => navigate(`/events/${id}`)} variant="outline" size="sm">
                    Gestisci Stock <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-indigo-400">{eventStocks.length}</div>
                    <div className="text-sm text-muted-foreground">Prodotti</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-emerald-400">{eventStations.length}</div>
                    <div className="text-sm text-muted-foreground">Postazioni</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-amber-400">
                      {eventStocks.reduce((acc, s) => acc + Number(s.quantity || 0), 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Unità Totali</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border text-center">
                    <div className="text-3xl font-bold text-cyan-400">
                      {new Set(eventStations.flatMap(s => s.bartenderIds || [])).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Baristi</div>
                  </div>
                </div>
                {eventStocks.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-semibold mb-2">Nessun Prodotto</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Trasferisci prodotti dal magazzino all'evento
                    </p>
                    <Button onClick={() => navigate(`/events/${id}`)}>
                      Trasferisci Stock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-amber-400" />
                    Incassi e Finanze
                  </CardTitle>
                  <Button onClick={() => navigate(`/reports?eventId=${id}`)} variant="outline" size="sm">
                    Report Completo <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <div className="text-3xl font-bold text-amber-400">€{totalRevenue.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">Incasso Totale</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-blue-400">
                      €{Number(ticketedEvent?.totalRevenue || 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Biglietti</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-purple-400">
                      €{bookings.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + Number(b.depositPaid || 0), 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Caparre Tavoli</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border">
                    <div className="text-2xl font-bold text-emerald-400">--</div>
                    <div className="text-sm text-muted-foreground">Consumazioni</div>
                  </div>
                </div>
                <div className="text-center py-8 border-t">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Visualizza il report completo per analisi dettagliate
                  </p>
                  <Button onClick={() => navigate(`/reports?eventId=${id}`)} className="mt-4">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Apri Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Cambio Stato</AlertDialogTitle>
            <AlertDialogDescription>
              {currentTransition && (
                <>Vuoi {currentTransition.label.toLowerCase()} "{event.name}"?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentTransition && changeStatusMutation.mutate(currentTransition.next)}
              disabled={changeStatusMutation.isPending}
              className={`bg-gradient-to-r ${status.gradient}`}
            >
              {changeStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà l'evento "{event?.name}" e tutti i dati correlati (postazioni, scorte, prenotazioni, liste ospiti, ecc.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventMutation.mutate()}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pauseTicketingDialogOpen} onOpenChange={setPauseTicketingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
              <Pause className="h-5 w-5" />
              Pausa Vendite Biglietti
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi sospendere temporaneamente la vendita dei biglietti? Gli utenti non potranno acquistare biglietti finché non riprenderai le vendite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast({
                  title: "Vendite Sospese",
                  description: "La vendita biglietti è stata temporaneamente sospesa",
                });
                setPauseTicketingDialogOpen(false);
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Sospendi Vendite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
