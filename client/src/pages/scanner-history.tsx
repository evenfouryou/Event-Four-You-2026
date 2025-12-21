import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  History,
  Calendar,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Users,
  Ticket,
  Armchair,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  startDatetime: string;
  endDatetime?: string;
  status: string;
  location?: {
    name: string;
  };
}

export default function ScannerHistoryPage() {
  const { user } = useAuth();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const now = new Date();
  
  const pastEvents = events?.filter(event => {
    const eventDate = parseISO(event.startDatetime);
    return isBefore(eventDate, now) && event.status === 'closed';
  }).sort((a, b) => 
    new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime()
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <Link href="/scanner">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-title">
              <History className="h-5 w-5 text-purple-500" />
              Eventi Passati
            </h1>
            <p className="text-sm text-muted-foreground">
              Storico degli eventi scansionati
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
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
        ) : pastEvents.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-3 pr-2">
              {pastEvents.map(event => (
                <Link key={event.id} href={`/scanner/stats/${event.id}`}>
                  <Card className="hover-elevate cursor-pointer" data-testid={`card-event-${event.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Concluso
                            </Badge>
                          </div>
                          <h3 className="font-semibold truncate" data-testid="text-event-name">
                            {event.name}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(event.startDatetime), "d MMMM yyyy", { locale: it })}
                          </p>
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
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Nessun evento passato trovato
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
