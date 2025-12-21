import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { format, isAfter, isBefore, isToday, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  QrCode,
  History,
  BarChart3,
  LogOut,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Ticket,
  Armchair,
  ScanLine,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  endDatetime?: string;
  status: string;
  locationId?: string;
  location?: {
    name: string;
  };
}

export default function ScannerHomePage() {
  const { user } = useAuth();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const now = new Date();
  
  const upcomingEvents = events?.filter(event => {
    const eventDate = parseISO(event.startDatetime);
    return isAfter(eventDate, now) || isToday(eventDate);
  }).sort((a, b) => 
    new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  ) || [];

  const todayEvents = upcomingEvents.filter(event => 
    isToday(parseISO(event.startDatetime))
  );

  const futureEvents = upcomingEvents.filter(event => 
    !isToday(parseISO(event.startDatetime))
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-title">
              <ScanLine className="h-6 w-6 text-emerald-500" />
              Scanner
            </h1>
            {user && (
              <p className="text-sm text-muted-foreground" data-testid="text-user-name">
                {(user as any).firstName} {(user as any).lastName}
              </p>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/scanner/history">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="card-history">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                  <History className="h-6 w-6 text-purple-400" />
                </div>
                <span className="font-medium text-sm">Eventi Passati</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/scanner/stats">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="card-stats">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
                <span className="font-medium text-sm">Statistiche</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {todayEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="text-today-section">
              <Clock className="h-5 w-5 text-emerald-500" />
              Eventi di Oggi
            </h2>
            <div className="space-y-3">
              {todayEvents.map(event => (
                <Link key={event.id} href={`/scanner/scan/${event.id}`}>
                  <Card className="hover-elevate cursor-pointer border-emerald-500/30 bg-emerald-500/5" data-testid={`card-event-today-${event.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                              Oggi
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(event.startDatetime), "HH:mm", { locale: it })}
                            </span>
                          </div>
                          <h3 className="font-semibold truncate" data-testid="text-event-name">
                            {event.name}
                          </h3>
                          {event.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <QrCode className="h-5 w-5 text-emerald-400" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="text-upcoming-section">
            <Calendar className="h-5 w-5 text-primary" />
            {todayEvents.length > 0 ? "Prossimi Eventi" : "Seleziona Evento"}
          </h2>
          
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : futureEvents.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-450px)] min-h-[200px]">
              <div className="space-y-3 pr-2">
                {futureEvents.map(event => (
                  <Link key={event.id} href={`/scanner/scan/${event.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-event-${event.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground mb-1">
                              {format(parseISO(event.startDatetime), "EEEE d MMMM", { locale: it })}
                            </p>
                            <h3 className="font-semibold truncate" data-testid="text-event-name">
                              {event.name}
                            </h3>
                            {event.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location.name}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          ) : todayEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Nessun evento disponibile
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
