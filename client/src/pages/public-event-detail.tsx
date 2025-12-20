import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ChevronLeft,
  Plus,
  Minus,
  Sparkles,
  Check,
  AlertCircle,
  ShoppingCart,
  Music,
  Star,
  Zap,
  Map,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Seat {
  id: string;
  row: string;
  seatNumber: string;
  seatLabel?: string;
  posX?: string | null;
  posY?: string | null;
  status: string;
  isAccessible?: boolean;
}

interface Sector {
  id: string;
  name: string;
  capacity: number;
  availableSeats: number;
  priceIntero: string;
  priceRidotto: string | null;
  isNumbered: boolean;
  sectorCode: string;
  seats: Seat[];
}

interface FloorPlanZone {
  id: string;
  name: string;
  zoneType: string;
  coordinates: { x: number; y: number }[];
  fillColor: string | null;
  strokeColor: string | null;
  opacity: string | null;
  capacity: number | null;
  defaultSectorCode: string | null;
  isSelectable: boolean;
  eventMapping?: {
    sectorId: string;
    customPrice: string | null;
  } | null;
}

interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  zones: FloorPlanZone[];
}

interface EventDetail {
  id: string;
  eventId: number;
  siaeEventCode: string;
  totalCapacity: number;
  ticketsSold: number;
  ticketingStatus: string;
  saleStartDate: Date;
  saleEndDate: Date;
  maxTicketsPerUser: number;
  requiresNominative: boolean;
  allowsChangeName: boolean;
  eventName: string;
  eventDescription: string | null;
  eventImageUrl: string | null;
  eventStart: Date;
  eventEnd: Date;
  eventNotes: string | null;
  locationId: number;
  locationName: string;
  locationAddress: string;
  locationCapacity: number;
  sectors: Sector[];
}

function FloorPlanViewer({
  floorPlan,
  sectors,
  selectedZoneId,
  selectedSeatIds,
  onZoneClick,
  onSeatClick,
}: {
  floorPlan: FloorPlan;
  sectors: Sector[];
  selectedZoneId: string | null;
  selectedSeatIds: string[];
  onZoneClick: (zoneId: string, sectorCode: string | null) => void;
  onSeatClick: (seatId: string, seat: Seat) => void;
}) {
  // Colori per stato posto
  const getSeatColor = (status: string, isSelected: boolean, isAccessible?: boolean) => {
    if (isSelected) return '#22c55e'; // verde - selezionato
    if (isAccessible) return '#3b82f6'; // blu - accessibile
    switch (status) {
      case 'available': return '#10b981'; // verde chiaro - disponibile
      case 'sold': return '#ef4444'; // rosso - venduto
      case 'reserved': return '#f59e0b'; // arancione - riservato
      case 'blocked': return '#6b7280'; // grigio - bloccato
      default: return '#9ca3af';
    }
  };

  // Render singolo posto
  const renderSeat = (seat: Seat, sectorCode: string) => {
    if (!seat.posX || !seat.posY) return null;
    
    const x = Number(seat.posX);
    const y = Number(seat.posY);
    const isSelected = selectedSeatIds.includes(seat.id);
    const isAvailable = seat.status === 'available';
    
    return (
      <g key={seat.id}>
        <circle
          cx={x}
          cy={y}
          r={0.8}
          fill={getSeatColor(seat.status, isSelected, seat.isAccessible)}
          stroke={isSelected ? '#16a34a' : 'rgba(0,0,0,0.3)'}
          strokeWidth={isSelected ? 0.3 : 0.1}
          className={`transition-all duration-150 ${
            isAvailable ? 'cursor-pointer hover:r-1' : 'cursor-not-allowed'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (isAvailable) {
              onSeatClick(seat.id, seat);
            }
          }}
          data-testid={`seat-${seat.id}`}
        />
        {isSelected && (
          <circle
            cx={x}
            cy={y}
            r={1.2}
            fill="none"
            stroke="#22c55e"
            strokeWidth={0.15}
            className="pointer-events-none animate-pulse"
          />
        )}
      </g>
    );
  };

  const renderZonePolygon = (zone: FloorPlanZone) => {
    const coords = zone.coordinates;
    if (!coords || coords.length < 3) return null;
    
    const points = coords.map(p => `${p.x},${p.y}`).join(' ');
    const isSelected = selectedZoneId === zone.id;
    
    // Use eventMapping.sectorId if available, otherwise fall back to defaultSectorCode
    const sectorId = zone.eventMapping?.sectorId;
    const linkedSector = sectorId 
      ? sectors.find(s => s.id === sectorId)
      : sectors.find(s => s.sectorCode === zone.defaultSectorCode);
    const isAvailable = linkedSector ? linkedSector.availableSeats > 0 : false;
    
    // Use custom price from eventMapping if available
    const displayPrice = zone.eventMapping?.customPrice 
      ? Number(zone.eventMapping.customPrice) 
      : (linkedSector ? Number(linkedSector.priceIntero) : null);
    
    return (
      <g key={zone.id}>
        <polygon
          points={points}
          fill={isSelected ? '#22c55e' : (zone.fillColor || '#3b82f6')}
          stroke={isSelected ? '#16a34a' : (zone.strokeColor || '#1d4ed8')}
          strokeWidth="2"
          opacity={isSelected ? 0.7 : (Number(zone.opacity) || 0.4)}
          className={`transition-all duration-200 ${
            zone.isSelectable && isAvailable 
              ? 'cursor-pointer hover:opacity-60' 
              : isAvailable ? 'cursor-default' : 'cursor-not-allowed opacity-20'
          }`}
          onClick={() => {
            if (zone.isSelectable && isAvailable && linkedSector) {
              onZoneClick(zone.id, linkedSector.sectorCode);
            }
          }}
          data-testid={`zone-polygon-${zone.id}`}
        />
        <text
          x={coords.reduce((sum, p) => sum + p.x, 0) / coords.length}
          y={coords.reduce((sum, p) => sum + p.y, 0) / coords.length}
          fill="white"
          fontSize="10"
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none font-semibold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {zone.name}
        </text>
        {displayPrice !== null && (
          <text
            x={coords.reduce((sum, p) => sum + p.x, 0) / coords.length}
            y={coords.reduce((sum, p) => sum + p.y, 0) / coords.length + 12}
            fill="rgba(255,255,255,0.8)"
            fontSize="8"
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none"
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
          >
            €{displayPrice.toFixed(0)}
          </text>
        )}
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <Card className="bg-card/50 border-border p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Map className="w-5 h-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Mappa della Venue</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Clicca su una zona per selezionarla e vedere i dettagli del biglietto
        </p>
        
        <div className="relative w-full aspect-video bg-muted/30 rounded-lg overflow-hidden">
          {floorPlan.imageUrl ? (
            <img 
              src={floorPlan.imageUrl} 
              alt={floorPlan.name}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/30">
              <Map className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ zIndex: 10 }}
          >
            {/* Render zone polygons */}
            {floorPlan.zones.map(zone => renderZonePolygon(zone))}
            
            {/* Render individual seats for numbered sectors */}
            {sectors.filter(s => s.isNumbered && s.seats?.length > 0).map(sector => 
              sector.seats.map(seat => renderSeat(seat, sector.sectorCode))
            )}
          </svg>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
            <span>Selezionato</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span>Venduto</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span>Riservato</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
            <span>Accessibile</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function SectorCard({
  sector,
  ticketedEventId,
  requiresNominative,
  onAddToCart,
  isAdding,
  justAdded,
  isHighlighted,
  mapSelectedSeatIds,
  onSeatSelectFromCard,
}: {
  sector: Sector;
  ticketedEventId: string;
  requiresNominative: boolean;
  onAddToCart: (data: any) => Promise<void>;
  isAdding: boolean;
  justAdded: string | null;
  isHighlighted?: boolean;
  mapSelectedSeatIds?: string[];
  onSeatSelectFromCard?: (seatId: string, seat: Seat) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [ticketType, setTicketType] = useState("intero");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Find the selected seat for this sector from map selection
  const selectedSeat = sector.seats.find(s => mapSelectedSeatIds?.includes(s.id)) || null;
  
  const handleSeatClick = (seat: Seat) => {
    if (onSeatSelectFromCard) {
      onSeatSelectFromCard(seat.id, seat);
    }
  };

  const price = ticketType === "ridotto" && sector.priceRidotto
    ? Number(sector.priceRidotto)
    : Number(sector.priceIntero);

  const totalPrice = price * (sector.isNumbered ? 1 : quantity);
  const isAvailable = sector.availableSeats > 0;
  const wasJustAdded = justAdded === sector.id;

  const handleAdd = async () => {
    if (!isAvailable) return;

    if (sector.isNumbered && !selectedSeat) {
      return;
    }

    if (requiresNominative && (!firstName || !lastName)) {
      return;
    }

    await onAddToCart({
      ticketedEventId,
      sectorId: sector.id,
      seatId: selectedSeat?.id,
      quantity: sector.isNumbered ? 1 : quantity,
      ticketType,
      participantFirstName: firstName,
      participantLastName: lastName,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className={`relative overflow-hidden transition-all duration-500 ${
          wasJustAdded 
            ? "bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border-emerald-500/50 shadow-lg shadow-emerald-500/20" 
            : isHighlighted
            ? "bg-gradient-to-br from-primary/20 to-blue-900/30 border-primary ring-2 ring-primary/50 shadow-lg shadow-primary/20"
            : "bg-gradient-to-br from-card/80 to-card/60 border-border hover:border-primary/30"
        }`}
        data-testid={`card-sector-${sector.id}`}
      >
        <AnimatePresence>
          {wasJustAdded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center bg-emerald-900/80 backdrop-blur-sm z-10"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10 }}
                  className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check className="w-8 h-8 text-white" />
                </motion.div>
                <p className="text-lg font-semibold text-foreground mb-3">Aggiunto al carrello!</p>
                <Link href="/carrello">
                  <Button size="sm" className="bg-white text-black hover:bg-gray-100" data-testid="button-go-to-cart">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Vai al carrello
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
                  <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-foreground truncate" data-testid={`text-sector-name-${sector.id}`}>
                  {sector.name}
                </CardTitle>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent" data-testid={`text-sector-price-${sector.id}`}>
                €{price.toFixed(2)}
              </div>
              {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
                <p className="text-xs text-muted-foreground">Ridotto: €{Number(sector.priceRidotto).toFixed(2)}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
          {!isAvailable ? (
            <div className="py-6 text-center">
              <Badge variant="destructive" className="text-sm px-4 py-2">
                Esaurito
              </Badge>
            </div>
          ) : (
            <>
              {sector.priceRidotto && Number(sector.priceRidotto) > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm text-muted-foreground font-medium">Tipo Biglietto</Label>
                  <RadioGroup value={ticketType} onValueChange={setTicketType} className="flex gap-2 sm:gap-3">
                    <div 
                      className={`flex-1 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                        ticketType === "intero" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-muted"
                      }`}
                      onClick={() => setTicketType("intero")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="intero" id={`intero-${sector.id}`} className="border-primary" />
                        <Label htmlFor={`intero-${sector.id}`} className="text-foreground cursor-pointer font-medium text-sm sm:text-base">
                          Intero
                        </Label>
                      </div>
                      <p className="text-primary font-bold mt-1 text-sm sm:text-base">€{Number(sector.priceIntero).toFixed(2)}</p>
                    </div>
                    <div 
                      className={`flex-1 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all ${
                        ticketType === "ridotto" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-muted"
                      }`}
                      onClick={() => setTicketType("ridotto")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ridotto" id={`ridotto-${sector.id}`} className="border-primary" />
                        <Label htmlFor={`ridotto-${sector.id}`} className="text-foreground cursor-pointer font-medium text-sm sm:text-base">
                          Ridotto
                        </Label>
                      </div>
                      <p className="text-primary font-bold mt-1 text-sm sm:text-base">€{Number(sector.priceRidotto).toFixed(2)}</p>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {sector.isNumbered ? (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm text-muted-foreground font-medium">Seleziona Posto</Label>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2 max-h-40 overflow-y-auto p-2 sm:p-3 bg-background/30 rounded-xl">
                    {sector.seats.map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status !== "available"}
                        className={`p-2 text-xs rounded-lg font-medium transition-all ${
                          seat.status !== "available"
                            ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                            : selectedSeat?.id === seat.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                            : "bg-muted/50 text-foreground hover:bg-muted"
                        }`}
                        data-testid={`seat-${seat.id}`}
                      >
                        {seat.row}{seat.seatNumber}
                      </button>
                    ))}
                  </div>
                  {selectedSeat && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-emerald-400 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Posto selezionato: Fila {selectedSeat.row}, Posto {selectedSeat.seatNumber}
                    </motion.p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm text-muted-foreground font-medium">Quantità</Label>
                  <div className="flex items-center gap-3 sm:gap-4 bg-background/30 rounded-xl p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="text-foreground h-10 w-10 rounded-lg"
                      data-testid={`button-minus-${sector.id}`}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <span className="text-xl sm:text-2xl font-bold text-foreground w-10 sm:w-12 text-center" data-testid={`text-quantity-${sector.id}`}>
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="text-foreground h-10 w-10 rounded-lg"
                      data-testid={`button-plus-${sector.id}`}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}

              {requiresNominative && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm text-muted-foreground font-medium">Nome</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Mario"
                      className="bg-background/30 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
                      data-testid={`input-firstname-${sector.id}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm text-muted-foreground font-medium">Cognome</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Rossi"
                      className="bg-background/30 border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
                      data-testid={`input-lastname-${sector.id}`}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Totale</p>
                  <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent" data-testid={`text-total-${sector.id}`}>
                    €{totalPrice.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={
                    isAdding ||
                    (sector.isNumbered && !selectedSeat) ||
                    (requiresNominative && (!firstName || !lastName))
                  }
                  className="font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-lg shadow-primary/25 transition-all h-11 sm:h-auto"
                  data-testid={`button-add-${sector.id}`}
                >
                  {isAdding ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                      <span className="text-sm sm:text-base">Aggiungi</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PublicEventDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [justAddedSector, setJustAddedSector] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [highlightedSectorCode, setHighlightedSectorCode] = useState<string | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  const { data: event, isLoading, error } = useQuery<EventDetail>({
    queryKey: ["/api/public/events", params.id],
  });

  const { data: floorPlan } = useQuery<FloorPlan>({
    queryKey: ["/api/public/locations", event?.locationId, "floor-plan", event?.id],
    queryFn: async () => {
      const res = await fetch(`/api/public/locations/${event?.locationId}/floor-plan?eventId=${event?.id}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.message || text;
        } catch {
          // Not JSON
        }
        throw new Error(message);
      }
      return res.json();
    },
    enabled: !!event?.locationId && !!event?.id,
    retry: false,
  });

  const handleZoneClick = (zoneId: string, sectorCode: string | null) => {
    setSelectedZoneId(zoneId);
    setHighlightedSectorCode(sectorCode);
    
    if (sectorCode) {
      setTimeout(() => {
        const sectorElement = document.querySelector(`[data-sector-code="${sectorCode}"]`);
        if (sectorElement) {
          sectorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleSeatClick = (seatId: string, seat: Seat) => {
    setSelectedSeatIds(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
    
    // Find the sector for this seat and highlight it
    const sector = event?.sectors.find(s => s.seats.some(st => st.id === seatId));
    if (sector) {
      setHighlightedSectorCode(sector.sectorCode);
      
      toast({
        title: selectedSeatIds.includes(seatId) ? "Posto deselezionato" : "Posto selezionato",
        description: `${seat.seatLabel || `${seat.row}${seat.seatNumber}`}`,
      });
    }
  };

  const handleAddToCart = async (data: any) => {
    setIsAdding(true);
    try {
      await apiRequest("POST", "/api/public/cart/add", data);
      setJustAddedSector(data.sectorId);
      setCartCount(prev => prev + (data.quantity || 1));
      
      toast({
        title: "Aggiunto al carrello!",
        description: `${data.quantity || 1} biglietto/i aggiunto/i con successo`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
      
      setTimeout(() => {
        setJustAddedSector(null);
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere al carrello.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="p-8 text-center bg-red-500/10 border-red-500/20 max-w-md backdrop-blur-xl">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-foreground mb-2">Evento non trovato</h2>
            <p className="text-muted-foreground mb-6">L'evento richiesto non è disponibile o non esiste.</p>
            <Link href="/acquista">
              <Button variant="ghost" className="text-foreground">
                <ChevronLeft className="w-4 h-4 mr-1" /> Torna agli eventi
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/acquista">
              <Button variant="ghost" className="text-muted-foreground" data-testid="button-back">
                <ChevronLeft className="w-4 h-4 mr-1" /> Eventi
              </Button>
            </Link>
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/25">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground hidden sm:block">Event4U</span>
              </div>
            </Link>
            <Link href="/carrello">
              <Button className="relative rounded-xl shadow-lg shadow-primary/25" data-testid="button-cart">
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline ml-2">Carrello</span>
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {isLoading ? (
          <div className="space-y-4 sm:space-y-6">
            <Skeleton className="h-64 sm:h-80 rounded-2xl sm:rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Skeleton className="h-56 sm:h-64 rounded-xl sm:rounded-2xl" />
              <Skeleton className="h-56 sm:h-64 rounded-xl sm:rounded-2xl" />
            </div>
          </div>
        ) : event ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 sm:space-y-8"
          >
            <Card className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-0 bg-gradient-to-br from-indigo-900/60 via-purple-900/50 to-pink-900/40">
              <div className="relative aspect-[4/3] sm:aspect-square md:aspect-[2/1]">
                {event.eventImageUrl ? (
                  <img
                    src={event.eventImageUrl}
                    alt={event.eventName}
                    className="absolute inset-0 w-full h-full object-cover"
                    data-testid="img-event-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="w-32 h-32 text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-transparent" />
              </div>
              
              <CardContent className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                    {event.ticketingStatus === "active" && (
                      <Badge className="bg-emerald-500/90 text-white border-0 px-2 sm:px-3 py-0.5 sm:py-1 shadow-lg shadow-emerald-500/25 text-xs sm:text-sm">
                        <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                        In Vendita
                      </Badge>
                    )}
                    {event.requiresNominative && (
                      <Badge className="bg-purple-500/90 text-white border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm">
                        Nominativo
                      </Badge>
                    )}
                  </div>
                  
                  <h1
                    className="text-xl sm:text-3xl md:text-5xl font-black text-foreground mb-2 sm:mb-4 leading-tight"
                    data-testid="text-event-name"
                  >
                    {event.eventName}
                  </h1>
                  
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-foreground/90">
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 backdrop-blur-sm rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                      <span className="font-medium text-xs sm:text-base" data-testid="text-event-date">
                        {format(new Date(event.eventStart), "d MMM", { locale: it })}
                        <span className="hidden sm:inline"> {format(new Date(event.eventStart), "EEEE", { locale: it })}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 backdrop-blur-sm rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
                      <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                      <span className="font-medium text-xs sm:text-base" data-testid="text-event-time">
                        {format(new Date(event.eventStart), "HH:mm")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/50 backdrop-blur-sm rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2">
                      <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary" />
                      <span className="font-medium text-xs sm:text-base truncate max-w-[120px] sm:max-w-none" data-testid="text-event-location">
                        {event.locationName}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>

            {event.eventDescription && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-card/50 border-border p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    Descrizione
                  </h3>
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-event-description">
                    {event.eventDescription}
                  </p>
                </Card>
              </motion.div>
            )}

            {event.requiresNominative && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Card className="bg-purple-500/10 border-purple-500/20 p-4 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-300">Biglietti Nominativi</h4>
                    <p className="text-sm text-purple-200/70">
                      Questo evento richiede biglietti nominativi. Inserisci nome e cognome per ogni partecipante.
                      {event.allowsChangeName && " Il cambio nominativo è consentito."}
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {floorPlan && floorPlan.zones && floorPlan.zones.length > 0 && (
              <FloorPlanViewer
                floorPlan={floorPlan}
                sectors={event.sectors}
                selectedZoneId={selectedZoneId}
                selectedSeatIds={selectedSeatIds}
                onZoneClick={handleZoneClick}
                onSeatClick={handleSeatClick}
              />
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
                <Ticket className="w-7 h-7 text-primary" />
                Scegli il tuo biglietto
              </h2>
              <div className="grid md:grid-cols-2 gap-6" data-testid="grid-sectors">
                {event.sectors.map((sector, index) => (
                  <motion.div
                    key={sector.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    data-sector-code={sector.sectorCode}
                  >
                    <SectorCard
                      sector={sector}
                      ticketedEventId={event.id}
                      requiresNominative={event.requiresNominative}
                      onAddToCart={handleAddToCart}
                      isAdding={isAdding}
                      justAdded={justAddedSector}
                      isHighlighted={highlightedSectorCode === sector.sectorCode}
                      mapSelectedSeatIds={selectedSeatIds}
                      onSeatSelectFromCard={handleSeatClick}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {event.sectors.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-12 text-center bg-card/50 border-border rounded-2xl">
                  <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Nessun biglietto disponibile</h3>
                  <p className="text-muted-foreground">
                    I biglietti per questo evento non sono ancora disponibili.
                  </p>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}
