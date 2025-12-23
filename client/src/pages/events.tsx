import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Users, 
  Repeat, 
  Clock, 
  CalendarCheck, 
  FilePenLine, 
  CheckCircle2, 
  MapPin,
  ChevronRight,
  Sparkles,
  ListFilter,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MobileAppLayout,
  MobileHeader,
  HapticButton, 
  FloatingActionButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { Event, Station, EventFormat, Location } from "@shared/schema";

type FilterType = 'all' | 'active' | 'past';

const springConfig = { type: "spring", stiffness: 400, damping: 30 };

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Bozza', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: FilePenLine },
  scheduled: { label: 'Programmato', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: CalendarCheck },
  ongoing: { label: 'In Corso', color: 'text-teal', bgColor: 'bg-teal-500/20', icon: Clock },
  closed: { label: 'Chiuso', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2 },
};

function FilterChip({ 
  active, 
  label, 
  count, 
  onClick,
  testId,
}: { 
  active: boolean; 
  label: string; 
  count: number; 
  onClick: () => void;
  testId: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={springConfig}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      data-testid={testId}
      className={`
        flex items-center gap-2 px-5 py-3 rounded-full text-base font-medium transition-all min-h-[48px]
        ${active 
          ? 'bg-primary text-black shadow-lg shadow-primary/25' 
          : 'bg-white/5 text-muted-foreground active:bg-white/10'
        }
      `}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={`
          px-2.5 py-0.5 rounded-full text-sm font-bold
          ${active ? 'bg-black/20 text-black' : 'bg-white/10 text-foreground'}
        `}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

function EventCard({ 
  event, 
  format, 
  stationCount, 
  isDraft,
  onNavigate,
  delay = 0,
  locationName,
}: { 
  event: Event; 
  format?: EventFormat;
  stationCount: number;
  isDraft: boolean;
  onNavigate: (path: string) => void;
  delay?: number;
  locationName?: string;
}) {
  const status = statusConfig[event.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ ...springConfig, delay }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        triggerHaptic('medium');
        onNavigate(isDraft ? `/events/wizard/${event.id}` : `/events/${event.id}/hub`);
      }}
      className="relative overflow-hidden rounded-3xl bg-card border border-border active:bg-card/80 cursor-pointer"
      data-testid={`event-card-${event.id}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-2 ${
        event.status === 'ongoing' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 
        event.status === 'scheduled' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
        event.status === 'closed' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
        'bg-gradient-to-r from-gray-500 to-slate-500'
      }`} />
      
      <div className="p-6 pt-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold truncate mb-3">{event.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium min-h-[32px] ${status.bgColor} ${status.color}`}>
                <StatusIcon className="h-4 w-4" />
                {status.label}
              </span>
              {format && (
                <span 
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-white min-h-[32px] inline-flex items-center"
                  style={{ backgroundColor: format.color ?? '#3b82f6' }}
                >
                  {format.name}
                </span>
              )}
              {event.seriesId && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-violet-500/20 text-violet-400 min-h-[32px]">
                  <Repeat className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
          
          <motion.div 
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 min-w-[48px] min-h-[48px]"
            whileTap={{ scale: 0.9 }}
            transition={springConfig}
          >
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">
                {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-muted-foreground text-base">
                {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {locationName && (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-lg truncate">{locationName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 pt-4 border-t border-border/50">
            {event.capacity && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span className="text-base font-medium">{event.capacity} posti</span>
              </div>
            )}
            {stationCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ListFilter className="h-5 w-5" />
                <span className="text-base font-medium">{stationCount} postazioni</span>
              </div>
            )}
          </div>
        </div>

        {isDraft && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springConfig}
            className="mt-5 pt-4 border-t border-border/50"
          >
            <div className="flex items-center gap-2 text-primary">
              <FilePenLine className="h-5 w-5" />
              <span className="text-base font-medium">Tocca per continuare la configurazione</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ 
  filter, 
  searchQuery, 
  canCreate, 
  onCreateClick 
}: { 
  filter: FilterType;
  searchQuery: string;
  canCreate: boolean;
  onCreateClick: () => void;
}) {
  const messages: Record<FilterType, { title: string; subtitle: string }> = {
    all: { 
      title: "Nessun evento", 
      subtitle: "Crea il tuo primo evento per iniziare" 
    },
    active: { 
      title: "Nessun evento attivo", 
      subtitle: "Gli eventi in corso e programmati appariranno qui" 
    },
    past: { 
      title: "Nessun evento passato", 
      subtitle: "Gli eventi conclusi appariranno qui" 
    },
  };

  const { title, subtitle } = messages[filter];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={springConfig}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <motion.div 
        className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-8"
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <CalendarIcon className="h-12 w-12 text-primary" />
      </motion.div>
      
      <h3 className="text-2xl font-bold mb-3">
        {searchQuery ? `Nessun risultato per "${searchQuery}"` : title}
      </h3>
      <p className="text-lg text-muted-foreground mb-8 max-w-[300px]">
        {searchQuery ? "Prova con un termine di ricerca diverso" : subtitle}
      </p>
      
      {canCreate && !searchQuery && filter === 'all' && (
        <HapticButton 
          onClick={onCreateClick}
          className="gradient-golden text-black font-semibold min-h-[56px] px-8 text-lg"
          hapticType="success"
          data-testid="button-create-event-empty"
        >
          <Sparkles className="h-6 w-6 mr-2" />
          Crea Evento
        </HapticButton>
      )}
    </motion.div>
  );
}

function EventsHeader({ 
  totalCount 
}: { 
  totalCount: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      className="flex items-center gap-4 px-5 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50"
    >
      <motion.div 
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0"
        whileTap={{ scale: 0.95 }}
        transition={springConfig}
      >
        <CalendarIcon className="h-7 w-7 text-white" />
      </motion.div>
      <div>
        <h1 className="text-2xl font-bold">I Miei Eventi</h1>
        <p className="text-base text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'evento' : 'eventi'} totali
        </p>
      </div>
    </motion.div>
  );
}

export default function Events() {
  const [, navigate] = useLocation();
  const [searchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const canCreateEvents = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: formats } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  const { data: allStations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const fixedStations = useMemo(() => {
    if (!allStations) return [];
    return allStations.filter(s => !s.eventId && !s.deletedAt);
  }, [allStations]);

  const formatsMap = useMemo(() => {
    if (!formats) return new Map<string, EventFormat>();
    return new Map(formats.map(f => [f.id, f]));
  }, [formats]);

  const locationsMap = useMemo(() => {
    if (!locations) return new Map<string, Location>();
    return new Map(locations.map(l => [l.id, l]));
  }, [locations]);

  const getEventStationCount = (eventId: string) => {
    const eventSpecific = allStations?.filter(s => s.eventId === eventId).length || 0;
    return fixedStations.length + eventSpecific;
  };

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = events;
    
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(e => e.status === 'ongoing' || e.status === 'scheduled' || e.status === 'draft');
        break;
      case 'past':
        filtered = filtered.filter(e => e.status === 'closed');
        break;
    }
    
    return filtered.sort((a, b) => {
      const statusOrder = { ongoing: 0, scheduled: 1, draft: 2, closed: 3 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 4) - 
                        (statusOrder[b.status as keyof typeof statusOrder] || 4);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime();
    });
  }, [events, activeFilter, searchQuery]);

  const filterCounts = useMemo(() => ({
    all: events?.length || 0,
    active: events?.filter(e => e.status === 'ongoing' || e.status === 'scheduled' || e.status === 'draft').length || 0,
    past: events?.filter(e => e.status === 'closed').length || 0,
  }), [events]);

  const handleCreateEvent = () => {
    triggerHaptic('success');
    navigate('/events/wizard');
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.draft;
    const StatusIcon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0`}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-events">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Eventi</h1>
            <p className="text-muted-foreground">Gestione degli eventi</p>
          </div>
          {canCreateEvents && (
            <Button onClick={handleCreateEvent} data-testid="button-create-event">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Evento
            </Button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filterCounts.all}</div>
              <p className="text-sm text-muted-foreground">Totale Eventi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-teal-500">
                {events?.filter(e => e.status === 'ongoing').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">In Corso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">
                {events?.filter(e => e.status === 'scheduled').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Programmati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {events?.filter(e => e.status === 'draft').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Bozze</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista Eventi</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('all')}
                  data-testid="filter-all-desktop"
                >
                  Tutti ({filterCounts.all})
                </Button>
                <Button
                  variant={activeFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('active')}
                  data-testid="filter-active-desktop"
                >
                  Attivi ({filterCounts.active})
                </Button>
                <Button
                  variant={activeFilter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter('past')}
                  data-testid="filter-past-desktop"
                >
                  Passati ({filterCounts.past})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun evento trovato</h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilter === 'all' 
                    ? "Crea il tuo primo evento per iniziare" 
                    : activeFilter === 'active' 
                    ? "Nessun evento attivo al momento"
                    : "Nessun evento passato"}
                </p>
                {canCreateEvents && activeFilter === 'all' && (
                  <Button onClick={handleCreateEvent} data-testid="button-create-event-empty-desktop">
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Evento
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Capacità</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const format = event.formatId ? formatsMap.get(event.formatId) : undefined;
                    const location = event.locationId ? locationsMap.get(event.locationId) : undefined;
                    return (
                      <TableRow 
                        key={event.id} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => navigate(event.status === 'draft' ? `/events/wizard/${event.id}` : `/events/${event.id}/hub`)}
                        data-testid={`row-event-${event.id}`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {event.name}
                            {event.seriesId && (
                              <Repeat className="w-4 h-4 text-violet-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          {location ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{location.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(event.status)}</TableCell>
                        <TableCell>
                          {format ? (
                            <Badge 
                              style={{ backgroundColor: format.color ?? '#3b82f6' }}
                              className="text-white border-0"
                            >
                              {format.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {event.capacity ? (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {event.capacity}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setIsDetailDialogOpen(true);
                            }}
                            data-testid={`button-view-event-${event.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.name}</DialogTitle>
              <DialogDescription>
                Dettagli dell'evento
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedEvent.status)}
                  {selectedEvent.seriesId && (
                    <Badge className="bg-violet-500/20 text-violet-400 border-0">
                      <Repeat className="w-3 h-3 mr-1" />
                      Ricorrente
                    </Badge>
                  )}
                </div>
                
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {new Date(selectedEvent.startDatetime).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedEvent.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(selectedEvent.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.locationId && locationsMap.get(selectedEvent.locationId) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-teal-500" />
                      <span>{locationsMap.get(selectedEvent.locationId)?.name}</span>
                    </div>
                  )}

                  {selectedEvent.capacity && (
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span>{selectedEvent.capacity} posti</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <ListFilter className="w-5 h-5 text-muted-foreground" />
                    <span>{getEventStationCount(selectedEvent.id)} postazioni</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      navigate(selectedEvent.status === 'draft' ? `/events/wizard/${selectedEvent.id}` : `/events/${selectedEvent.id}/hub`);
                    }}
                    data-testid="button-go-to-event"
                  >
                    {selectedEvent.status === 'draft' ? 'Continua Configurazione' : 'Vai all\'Evento'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsDetailDialogOpen(false)}
                    data-testid="button-close-dialog"
                  >
                    Chiudi
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title="Eventi" showBackButton showMenuButton />}
      noPadding
      contentClassName="pb-24"
    >
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig, delay: 0.1 }}
        className="flex gap-3 overflow-x-auto px-5 py-4 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <FilterChip
          active={activeFilter === 'all'}
          label="Tutti"
          count={filterCounts.all}
          onClick={() => setActiveFilter('all')}
          testId="filter-all"
        />
        <FilterChip
          active={activeFilter === 'active'}
          label="Attivi"
          count={filterCounts.active}
          onClick={() => setActiveFilter('active')}
          testId="filter-active"
        />
        <FilterChip
          active={activeFilter === 'past'}
          label="Passati"
          count={filterCounts.past}
          onClick={() => setActiveFilter('past')}
          testId="filter-past"
        />
      </motion.div>

      <div className="px-5 space-y-5">
        <AnimatePresence mode="wait">
          {eventsLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springConfig}
              className="space-y-5"
            >
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-3xl" />
              ))}
            </motion.div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState 
              key="empty"
              filter={activeFilter}
              searchQuery={searchQuery}
              canCreate={canCreateEvents}
              onCreateClick={handleCreateEvent}
            />
          ) : (
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springConfig}
              className="space-y-5"
            >
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  format={event.formatId ? formatsMap.get(event.formatId) : undefined}
                  stationCount={getEventStationCount(event.id)}
                  isDraft={event.status === 'draft'}
                  onNavigate={navigate}
                  delay={index * 0.05}
                  locationName={event.locationId ? locationsMap.get(event.locationId)?.name : undefined}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {canCreateEvents && (
        <FloatingActionButton
          onClick={handleCreateEvent}
          position="bottom-right"
          data-testid="fab-create-event"
          className="gradient-golden shadow-xl shadow-primary/30"
        >
          <Plus className="h-7 w-7 text-black" />
        </FloatingActionButton>
      )}
    </MobileAppLayout>
  );
}
