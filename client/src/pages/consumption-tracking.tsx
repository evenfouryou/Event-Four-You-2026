import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Minus, Plus, AlertTriangle, Package, ArrowLeft, Upload, Download } from "lucide-react";
import { useLocation } from "wouter";
import type { Event, Station, Product, Stock } from "@shared/schema";

export default function ConsumptionTracking() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadQuantities, setLoadQuantities] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const urlEventId = urlParams.get('eventId');
  const urlStationId = urlParams.get('stationId');

  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId || "");
  const [selectedStationId, setSelectedStationId] = useState<string>(urlStationId || "");

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: generalStocks } = useQuery<Stock[]>({
    queryKey: ['/api/stock/general'],
  });

  const activeEvents = events?.filter(e => e.status === 'ongoing') || [];

  useEffect(() => {
    if (urlEventId) {
      setSelectedEventId(urlEventId);
    } else if (activeEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(activeEvents[0].id);
    }
  }, [activeEvents, selectedEventId, urlEventId]);

  useEffect(() => {
    if (urlStationId) {
      setSelectedStationId(urlStationId);
    }
  }, [urlStationId]);

  const selectedEvent = events?.find(e => e.id === selectedEventId);

  const { data: allStations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const stations = allStations?.filter(s => 
    s.eventId === selectedEventId || !s.eventId
  ) || [];

  const { data: eventStocks } = useQuery<Array<{
    id: string;
    productId: string;
    stationId: string | null;
    quantity: string;
  }>>({
    queryKey: ['/api/events', selectedEventId, 'stocks'],
    enabled: !!selectedEventId,
  });

  useEffect(() => {
    if (urlStationId) {
      setSelectedStationId(urlStationId);
    } else if (stations && stations.length > 0 && !selectedStationId) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId, urlStationId]);

  const selectedStation = stations?.find(s => s.id === selectedStationId);

  const getProductStock = (productId: string): number => {
    if (!selectedStationId) return 0;
    const stock = eventStocks?.find(s => 
      s.productId === productId && s.stationId === selectedStationId
    );
    if (!stock) return 0;
    const quantity = parseFloat(stock.quantity);
    return isNaN(quantity) ? 0 : quantity;
  };

  const getGeneralStock = (productId: string): number => {
    const stock = generalStocks?.find(s => s.productId === productId);
    if (!stock) return 0;
    const quantity = parseFloat(stock.quantity);
    return isNaN(quantity) ? 0 : quantity;
  };

  const consumeMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string | null; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/consume', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      toast({
        title: "Successo",
        description: "Consumo registrato",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile registrare il consumo",
        variant: "destructive",
      });
    },
  });

  const loadMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/event-transfer', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setLoadQuantities({});
      toast({
        title: "Successo",
        description: "Prodotto caricato sulla postazione",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare il prodotto",
        variant: "destructive",
      });
    },
  });

  const handleConsume = (productId: string, quantity: number) => {
    if (!selectedEventId) return;
    
    consumeMutation.mutate({
      eventId: selectedEventId,
      stationId: selectedStationId || null,
      productId,
      quantity,
    });
  };

  const handleLoad = (productId: string) => {
    if (!selectedEventId || !selectedStationId) return;
    const qty = parseFloat(loadQuantities[productId] || "0");
    if (qty <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    
    loadMutation.mutate({
      eventId: selectedEventId,
      stationId: selectedStationId,
      productId,
      quantity: qty,
    });
  };

  const filteredProducts = products?.filter(p => 
    p.active && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const productsWithStock = filteredProducts.filter(p => getProductStock(p.id) > 0);
  const productsInGeneral = filteredProducts.filter(p => getGeneralStock(p.id) > 0);

  if (eventsLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Nessun evento in corso</p>
            <p className="text-sm text-muted-foreground">Non ci sono eventi attivi al momento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="p-3 sm:p-4 md:p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/beverage')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">{selectedEvent?.name}</h1>
              {selectedStation && (
                <p className="text-sm text-muted-foreground">{selectedStation.name}</p>
              )}
            </div>
          </div>
          
          {!urlEventId && !urlStationId && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Evento</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger data-testid="select-event" className="h-11 sm:h-10">
                    <SelectValue placeholder="Evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Postazione</Label>
                <Select 
                  value={selectedStationId} 
                  onValueChange={setSelectedStationId}
                  disabled={!stations || stations.length === 0}
                >
                  <SelectTrigger data-testid="select-station" className="h-11 sm:h-10">
                    <SelectValue placeholder="Postazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.map(station => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca prodotto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 sm:h-10"
              data-testid="input-search-product"
            />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6">
        {!selectedStationId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">Seleziona una postazione</p>
              <p className="text-sm text-muted-foreground">
                Scegli evento e postazione sopra per visualizzare i prodotti e registrare i consumi
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="scarico" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="carico" className="flex items-center gap-2" data-testid="tab-carico">
                <Upload className="h-4 w-4" />
                Carico
              </TabsTrigger>
              <TabsTrigger value="scarico" className="flex items-center gap-2" data-testid="tab-scarico">
                <Download className="h-4 w-4" />
                Scarico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="carico">
              <div className="mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-500" />
                  Carica Prodotti
                </h2>
                <p className="text-sm text-muted-foreground">
                  Trasferisci prodotti dal magazzino generale alla postazione
                </p>
              </div>

              {productsInGeneral.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun prodotto disponibile nel magazzino</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {productsInGeneral.map((product) => {
                    const generalStock = getGeneralStock(product.id);
                    const stationStock = getProductStock(product.id);
                    return (
                      <Card key={product.id} data-testid={`load-product-card-${product.id}`} className="overflow-hidden">
                        <CardHeader className="pb-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-500/10 rounded-md flex items-center justify-center flex-shrink-0">
                              <Package className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base truncate">{product.name}</CardTitle>
                              <p className="text-xs text-muted-foreground truncate">{product.code}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Magazzino:</span>
                              <span className="font-medium">{generalStock.toFixed(2)} {product.unitOfMeasure}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Postazione:</span>
                              <span className="font-medium">{stationStock.toFixed(2)} {product.unitOfMeasure}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="Qtà"
                              value={loadQuantities[product.id] || ""}
                              onChange={(e) => setLoadQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className="flex-1"
                              data-testid={`input-load-qty-${product.id}`}
                            />
                            <Button
                              onClick={() => handleLoad(product.id)}
                              disabled={loadMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-load-${product.id}`}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Carica
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scarico">
              <div className="mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Download className="h-5 w-5 text-orange-500" />
                  Scarica Consumi
                </h2>
                <p className="text-sm text-muted-foreground">
                  Registra i consumi dei prodotti caricati sulla postazione
                </p>
              </div>

              {productsWithStock.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">Nessun prodotto caricato</p>
                    <p className="text-sm text-muted-foreground">
                      Vai nella sezione Carico per trasferire prodotti dal magazzino
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {productsWithStock.map((product) => {
                    const stockValue = getProductStock(product.id);
                    const isLowStock = stockValue <= 5;
                    return (
                      <Card key={product.id} data-testid={`product-card-${product.id}`} className="overflow-hidden">
                        <CardHeader className="pb-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-orange-500/10 rounded-md flex items-center justify-center flex-shrink-0">
                              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base sm:text-lg truncate">{product.name}</CardTitle>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{product.code}</p>
                            </div>
                            {product.category && (
                              <Badge variant="secondary" className="flex-shrink-0 text-xs">{product.category}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-medium">
                              Giacenza: {stockValue.toFixed(2)} {product.unitOfMeasure}
                            </span>
                            {isLowStock && (
                              <Badge variant="destructive" className="ml-auto text-xs" data-testid={`badge-low-${product.id}`}>
                                Basso
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => handleConsume(product.id, 0.5)}
                              disabled={consumeMutation.isPending || stockValue < 0.5}
                              data-testid={`button-consume-half-${product.id}`}
                              className="flex flex-col items-center justify-center gap-1 h-16"
                            >
                              <Minus className="h-5 w-5" />
                              <span className="font-semibold">0.5</span>
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => handleConsume(product.id, 1)}
                              disabled={consumeMutation.isPending || stockValue < 1}
                              data-testid={`button-consume-one-${product.id}`}
                              className="flex flex-col items-center justify-center gap-1 h-16"
                            >
                              <Minus className="h-5 w-5" />
                              <span className="font-semibold">1</span>
                            </Button>
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => handleConsume(product.id, 2)}
                              disabled={consumeMutation.isPending || stockValue < 2}
                              data-testid={`button-consume-two-${product.id}`}
                              className="flex flex-col items-center justify-center gap-1 h-16"
                            >
                              <Minus className="h-5 w-5" />
                              <span className="font-semibold">2</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
