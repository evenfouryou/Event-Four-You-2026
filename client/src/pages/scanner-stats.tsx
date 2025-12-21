import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Ticket,
  Armchair,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface EventStats {
  totalLists: number;
  checkedInLists: number;
  totalTables: number;
  checkedInTables: number;
  totalTickets: number;
  checkedInTickets: number;
}

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  status: string;
}

export default function ScannerStatsPage() {
  const { eventId } = useParams<{ eventId?: string }>();
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: stats, isLoading: statsLoading, refetch } = useQuery<EventStats>({
    queryKey: ['/api/e4u/events', eventId, 'scan-stats'],
    enabled: !!eventId,
  });

  const { data: allStats, isLoading: allStatsLoading } = useQuery<EventStats>({
    queryKey: ['/api/e4u/scanner/total-stats'],
    enabled: !eventId,
  });

  const currentStats = eventId ? stats : allStats;
  const isLoading = eventId ? (eventLoading || statsLoading) : allStatsLoading;

  const totalGuests = (currentStats?.totalLists || 0) + (currentStats?.totalTables || 0) + (currentStats?.totalTickets || 0);
  const checkedInGuests = (currentStats?.checkedInLists || 0) + (currentStats?.checkedInTables || 0) + (currentStats?.checkedInTickets || 0);
  const percentage = totalGuests > 0 ? Math.round((checkedInGuests / totalGuests) * 100) : 0;

  const handleRefresh = () => {
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/events', eventId, 'scan-stats'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/scanner/total-stats'] });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href={eventId ? `/scanner/scan/${eventId}` : "/scanner"}>
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-title">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Statistiche
              </h1>
              {event && (
                <p className="text-sm text-muted-foreground" data-testid="text-event-name">
                  {event.name}
                </p>
              )}
              {!eventId && (
                <p className="text-sm text-muted-foreground">
                  Riepilogo generale
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Ingressi Totali
                </CardTitle>
                <CardDescription>
                  {eventId ? "Per questo evento" : "Tutti gli eventi"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-4xl font-bold text-emerald-400" data-testid="text-checked-in">
                      {checkedInGuests}
                    </span>
                    <span className="text-xl text-muted-foreground">
                      {" "}/ {totalGuests}
                    </span>
                  </div>
                  <span className="text-2xl font-semibold text-emerald-400" data-testid="text-percentage">
                    {percentage}%
                  </span>
                </div>
                <Progress value={percentage} className="h-3" />
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Card data-testid="card-lists">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Liste</p>
                  <p className="text-lg font-bold" data-testid="text-lists-count">
                    {currentStats?.checkedInLists || 0}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{currentStats?.totalLists || 0}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-tables">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Armchair className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Tavoli</p>
                  <p className="text-lg font-bold" data-testid="text-tables-count">
                    {currentStats?.checkedInTables || 0}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{currentStats?.totalTables || 0}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-tickets">
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                    <Ticket className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Biglietti</p>
                  <p className="text-lg font-bold" data-testid="text-tickets-count">
                    {currentStats?.checkedInTickets || 0}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{currentStats?.totalTickets || 0}
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {event && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data evento</p>
                      <p className="font-medium">
                        {format(parseISO(event.startDatetime), "EEEE d MMMM yyyy, HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {eventId && (
              <Link href={`/scanner/scanned/${eventId}`}>
                <Card className="hover-elevate cursor-pointer" data-testid="card-view-scanned">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium">Utenti Scansionati</p>
                          <p className="text-sm text-muted-foreground">
                            Visualizza lista completa
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
