import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Users,
  Ticket,
  Armchair,
  Clock,
  User,
  Filter,
} from "lucide-react";

interface CheckedInPerson {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  type: 'list' | 'table' | 'ticket';
  checkedInAt: string;
  listName?: string;
  tableName?: string;
  ticketType?: string;
  sector?: string;
}

interface Event {
  id: string;
  name: string;
  startDatetime: string;
}

export default function ScannerScannedPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'list' | 'table' | 'ticket'>('all');

  const { data: event } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: checkedInPeople, isLoading } = useQuery<CheckedInPerson[]>({
    queryKey: ['/api/e4u/events', eventId, 'checked-in'],
    enabled: !!eventId,
  });

  const filteredPeople = checkedInPeople?.filter(person => {
    const matchesSearch = searchQuery.trim() === '' || 
      `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.phone?.includes(searchQuery);
    
    const matchesFilter = activeFilter === 'all' || person.type === activeFilter;
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => 
    new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
  ) || [];

  const listCount = checkedInPeople?.filter(p => p.type === 'list').length || 0;
  const tableCount = checkedInPeople?.filter(p => p.type === 'table').length || 0;
  const ticketCount = checkedInPeople?.filter(p => p.type === 'ticket').length || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <Link href={`/scanner/stats/${eventId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-title">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Utenti Scansionati
            </h1>
            {event && (
              <p className="text-sm text-muted-foreground truncate">
                {event.name}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-lg px-3">
            {checkedInPeople?.length || 0}
          </Badge>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o telefono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="shrink-0"
              data-testid="filter-all"
            >
              Tutti ({checkedInPeople?.length || 0})
            </Button>
            <Button
              variant={activeFilter === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('list')}
              className="shrink-0"
              data-testid="filter-lists"
            >
              <Users className="h-3 w-3 mr-1" />
              Liste ({listCount})
            </Button>
            <Button
              variant={activeFilter === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('table')}
              className="shrink-0"
              data-testid="filter-tables"
            >
              <Armchair className="h-3 w-3 mr-1" />
              Tavoli ({tableCount})
            </Button>
            <Button
              variant={activeFilter === 'ticket' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('ticket')}
              className="shrink-0"
              data-testid="filter-tickets"
            >
              <Ticket className="h-3 w-3 mr-1" />
              Biglietti ({ticketCount})
            </Button>
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
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPeople.length > 0 ? (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {filteredPeople.map((person, index) => (
                <Card key={person.id || index} data-testid={`card-person-${index}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid="text-person-name">
                          {person.firstName} {person.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs h-5">
                            {person.type === 'list' && <><Users className="h-3 w-3 mr-1" /> Lista</>}
                            {person.type === 'table' && <><Armchair className="h-3 w-3 mr-1" /> Tavolo</>}
                            {person.type === 'ticket' && <><Ticket className="h-3 w-3 mr-1" /> Biglietto</>}
                          </Badge>
                          {person.listName && (
                            <span className="truncate">{person.listName}</span>
                          )}
                          {person.tableName && (
                            <span className="truncate">{person.tableName}</span>
                          )}
                          {person.ticketType && (
                            <span className="truncate">{person.ticketType}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(person.checkedInAt), "HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || activeFilter !== 'all'
                  ? "Nessun risultato trovato"
                  : "Nessun utente scansionato"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
