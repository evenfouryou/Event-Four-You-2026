import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import {
  Calendar,
  Ticket,
  Store,
  Clock,
  ChevronRight,
  AlertCircle,
  MapPin,
  Eye,
} from "lucide-react";

interface CashierEventAllocation {
  allocationId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  sectorId: string | null;
  sectorName: string;
  quotaQuantity: number;
  quotaUsed: number;
  quotaRemaining: number;
  isActive: boolean;
}

export default function CashierDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedEvent, setSelectedEvent] = useState<CashierEventAllocation | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: myEvents, isLoading } = useQuery<CashierEventAllocation[]>({
    queryKey: ["/api/cashier/my-events"],
    enabled: !!user?.id,
  });

  const getQuotaPercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const stats = {
    totalEvents: myEvents?.length || 0,
    totalQuota: myEvents?.reduce((sum, e) => sum + e.quotaQuantity, 0) || 0,
    totalUsed: myEvents?.reduce((sum, e) => sum + e.quotaUsed, 0) || 0,
    totalRemaining: myEvents?.reduce((sum, e) => sum + e.quotaRemaining, 0) || 0,
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-cashier-dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">I Miei Eventi</h1>
            <p className="text-muted-foreground">Gestione quote biglietti assegnate</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-sm text-muted-foreground">Eventi Assegnati</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalQuota}</div>
              <p className="text-sm text-muted-foreground">Quota Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-500">{stats.totalUsed}</div>
              <p className="text-sm text-muted-foreground">Biglietti Emessi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">{stats.totalRemaining}</div>
              <p className="text-sm text-muted-foreground">Rimanenti</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Elenco Eventi</CardTitle>
            <CardDescription>Eventi con quote biglietti assegnate</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !myEvents || myEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessun evento assegnato</p>
                <p className="text-sm">Contatta il tuo gestore per ricevere le assegnazioni.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Orario</TableHead>
                    <TableHead>Luogo</TableHead>
                    <TableHead>Settore</TableHead>
                    <TableHead>Quota</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEvents.map((eventData) => {
                    const percentage = getQuotaPercentage(eventData.quotaUsed, eventData.quotaQuantity);
                    const remaining = eventData.quotaRemaining;
                    return (
                      <TableRow key={eventData.allocationId} data-testid={`row-event-${eventData.eventId}`}>
                        <TableCell className="font-medium">{eventData.eventName}</TableCell>
                        <TableCell>
                          {eventData.eventDate ? format(new Date(eventData.eventDate), "dd/MM/yyyy", { locale: it }) : "-"}
                        </TableCell>
                        <TableCell>{eventData.eventTime || "-"}</TableCell>
                        <TableCell>{eventData.venueName || "-"}</TableCell>
                        <TableCell>
                          {eventData.sectorName ? (
                            <Badge variant="outline">{eventData.sectorName}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${remaining <= 5 && remaining > 0 ? "text-yellow-500" : remaining <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                              {eventData.quotaUsed}/{eventData.quotaQuantity}
                            </span>
                            <Progress value={percentage} className={`w-16 h-2 ${percentage > 90 ? "[&>div]:bg-red-500" : percentage > 75 ? "[&>div]:bg-yellow-500" : ""}`} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {remaining <= 0 ? (
                            <Badge className="bg-red-500/20 text-red-400">Esaurita</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/20 text-emerald-400">Attivo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEvent(eventData);
                                setIsDetailDialogOpen(true);
                              }}
                              data-testid={`button-view-${eventData.eventId}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Link href={`/cassa-biglietti?eventId=${eventData.eventId}`}>
                              <Button
                                size="sm"
                                disabled={remaining <= 0}
                                data-testid={`button-emit-tickets-${eventData.eventId}`}
                              >
                                <Ticket className="w-4 h-4 mr-1" />
                                Emetti
                              </Button>
                            </Link>
                          </div>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvent?.eventName}</DialogTitle>
              <DialogDescription>Dettagli evento e quota assegnata</DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {selectedEvent.eventDate ? format(new Date(selectedEvent.eventDate), "EEEE d MMMM yyyy", { locale: it }) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Orario</p>
                    <p className="font-medium">{selectedEvent.eventTime || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Luogo</p>
                    <p className="font-medium">{selectedEvent.venueName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Settore</p>
                    <p className="font-medium">{selectedEvent.sectorName || "-"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Quota Biglietti</span>
                    <span className={`font-medium ${selectedEvent.quotaRemaining <= 5 && selectedEvent.quotaRemaining > 0 ? "text-yellow-500" : selectedEvent.quotaRemaining <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                      {selectedEvent.quotaUsed} / {selectedEvent.quotaQuantity}
                    </span>
                  </div>
                  <Progress
                    value={getQuotaPercentage(selectedEvent.quotaUsed, selectedEvent.quotaQuantity)}
                    className={`h-3 ${getQuotaPercentage(selectedEvent.quotaUsed, selectedEvent.quotaQuantity) > 90 ? "[&>div]:bg-red-500" : getQuotaPercentage(selectedEvent.quotaUsed, selectedEvent.quotaQuantity) > 75 ? "[&>div]:bg-yellow-500" : ""}`}
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    {selectedEvent.quotaRemaining} biglietti rimanenti
                  </p>
                </div>
                {selectedEvent.quotaRemaining <= 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-500 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Quota esaurita
                  </div>
                )}
                <Link href={`/cassa-biglietti?eventId=${selectedEvent.eventId}`}>
                  <Button
                    className="w-full"
                    disabled={selectedEvent.quotaRemaining <= 0}
                    onClick={() => setIsDetailDialogOpen(false)}
                  >
                    <Ticket className="w-4 h-4 mr-2" />
                    Emetti Biglietti
                  </Button>
                </Link>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title="I Miei Eventi" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-cashier-dashboard">
        {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !myEvents || myEvents.length === 0 ? (
        <Card className="glass-card" data-testid="card-no-events">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nessun Evento Assegnato</h3>
            <p className="text-muted-foreground mt-2">
              Non hai ancora quote biglietti assegnate per nessun evento.
              Contatta il tuo gestore per ricevere le assegnazioni.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {myEvents.map((eventData) => {
            const percentage = getQuotaPercentage(eventData.quotaUsed, eventData.quotaQuantity);
            const remaining = eventData.quotaRemaining;

            return (
              <Card 
                key={eventData.allocationId} 
                className="glass-card hover-elevate transition-all"
                data-testid={`card-event-${eventData.eventId}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {eventData.eventName}
                    </CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-400">Attivo</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {eventData.eventDate ? format(new Date(eventData.eventDate), "EEEE d MMMM yyyy", { locale: it }) : "Data non specificata"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {eventData.eventTime || "Orario non specificato"}
                  </div>
                  
                  {eventData.venueName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {eventData.venueName}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-muted-foreground" />
                        Quota Biglietti
                      </span>
                      <span className={`font-medium ${remaining <= 5 && remaining > 0 ? "text-yellow-500" : remaining <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                        {eventData.quotaUsed} / {eventData.quotaQuantity}
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${percentage > 90 ? "[&>div]:bg-red-500" : percentage > 75 ? "[&>div]:bg-yellow-500" : ""}`}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {remaining} biglietti rimanenti
                    </div>
                  </div>

                  {eventData.sectorName && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Settore assegnato:</p>
                      <Badge variant="outline" className="text-xs">
                        {eventData.sectorName}
                      </Badge>
                    </div>
                  )}

                  {remaining <= 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-500 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Quota esaurita
                    </div>
                  )}

                  <Link href={`/cassa-biglietti?eventId=${eventData.eventId}`}>
                    <Button 
                      className="w-full" 
                      disabled={remaining <= 0}
                      data-testid={`button-emit-tickets-${eventData.eventId}`}
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Emetti Biglietti
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </MobileAppLayout>
  );
}
