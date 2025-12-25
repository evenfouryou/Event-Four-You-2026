import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Users, Euro, MapPin, Star, Check, Loader2 } from "lucide-react";

interface FloorPlanZone {
  id: string;
  name: string;
  zoneType: string;
}

interface Recommendation {
  zoneId: string;
  zoneName?: string;
  availableSeats?: number;
  suggestedSeats?: number;
  price?: number;
  occupancyPercent?: number;
  popularityScore?: number;
  score?: number;
  reason: string;
}

interface SmartAssistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  zones: FloorPlanZone[];
  onSelectZone: (zoneId: string) => void;
}

export function SmartAssistModal({
  open,
  onOpenChange,
  eventId,
  zones,
  onSelectZone,
}: SmartAssistModalProps) {
  const [ticketType, setTicketType] = useState<string>("intero");
  const [budget, setBudget] = useState<string>("");
  const [preferredZone, setPreferredZone] = useState<string>("any");
  const [groupSize, setGroupSize] = useState<string>("1");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const recommendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${eventId}/recommendations`, {
        partySize: parseInt(groupSize) || 1,
        preferredZoneType: preferredZone !== "any" ? preferredZone : undefined,
        maxPrice: budget ? parseFloat(budget) : undefined,
        ticketType,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const recs = data.recommendations || [];
      const enrichedRecs = recs.map((rec: Recommendation) => {
        const zone = zones.find(z => z.id === rec.zoneId);
        return {
          ...rec,
          zoneName: zone?.name || rec.zoneName || "Zona sconosciuta",
        };
      });
      setRecommendations(enrichedRecs);
      setHasSearched(true);
    },
  });

  const handleSearch = () => {
    recommendMutation.mutate();
  };

  const handleSelectRecommendation = (zoneId: string) => {
    onSelectZone(zoneId);
    onOpenChange(false);
  };

  const handleReset = () => {
    setTicketType("intero");
    setBudget("");
    setPreferredZone("any");
    setGroupSize("1");
    setRecommendations([]);
    setHasSearched(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Smart Assist
          </DialogTitle>
          <DialogDescription>
            Trova la zona migliore in base alle tue preferenze
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-type">Tipo Biglietto</Label>
              <Select value={ticketType} onValueChange={setTicketType}>
                <SelectTrigger id="ticket-type" data-testid="select-ticket-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intero">Intero</SelectItem>
                  <SelectItem value="ridotto">Ridotto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-size">Numero Persone</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="group-size"
                  type="number"
                  min="1"
                  max="50"
                  value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  className="pl-10"
                  data-testid="input-group-size"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget Massimo (opzionale)</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Es: 50.00"
                  className="pl-10"
                  data-testid="input-budget"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred-zone">Zona Preferita</Label>
              <Select value={preferredZone} onValueChange={setPreferredZone}>
                <SelectTrigger id="preferred-zone" data-testid="select-preferred-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualsiasi</SelectItem>
                  <SelectItem value="table">Tavolo</SelectItem>
                  <SelectItem value="sector">Settore</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="general">Generale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={recommendMutation.isPending}
            className="w-full"
            data-testid="button-search-recommendations"
          >
            {recommendMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ricerca in corso...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Trova Zone Consigliate
              </>
            )}
          </Button>

          {recommendMutation.isPending && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {hasSearched && recommendations.length === 0 && !recommendMutation.isPending && (
            <div className="text-center py-6 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna zona disponibile con i criteri selezionati</p>
              <p className="text-sm">Prova a modificare le preferenze</p>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Zone Consigliate</Label>
              {recommendations.map((rec, index) => (
                <Card
                  key={rec.zoneId}
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSelectRecommendation(rec.zoneId)}
                  data-testid={`recommendation-${rec.zoneId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{rec.zoneName}</span>
                          {index === 0 && (
                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                              <Star className="w-3 h-3 mr-1" />
                              Consigliata
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {rec.availableSeats !== undefined && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {rec.availableSeats} posti
                            </span>
                          )}
                          {rec.price !== undefined && (
                            <span className="flex items-center gap-1">
                              <Euro className="w-3 h-3" />
                              {rec.price.toFixed(2)}
                            </span>
                          )}
                          {(rec.score !== undefined || rec.popularityScore !== undefined) && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Star className="w-3 h-3" />
                              {rec.score ?? rec.popularityScore}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" data-testid={`button-select-${rec.zoneId}`}>
                        <Check className="w-4 h-4 mr-1" />
                        Seleziona
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasSearched && (
            <Button variant="outline" onClick={handleReset} data-testid="button-reset">
              Nuova Ricerca
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-close">
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
