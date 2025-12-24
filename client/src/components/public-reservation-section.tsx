import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { triggerHaptic } from "@/components/mobile-primitives";
import {
  Users,
  Table2,
  Phone,
  Mail,
  User,
  AlertCircle,
  Check,
  Loader2,
  QrCode,
  Info,
  Tag,
} from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface EventReservationSettings {
  eventId: string;
  listsEnabled: boolean;
  tablesEnabled: boolean;
  paidReservationsEnabled: boolean;
  listReservationFee: string;
  listReservationFeeDescription: string;
  accessDisclaimer: string;
}

interface EventList {
  id: string;
  name: string;
  price: string | null;
  maxCapacity: number | null;
  isActive: boolean;
  entriesCount?: number;
}

interface TableType {
  id: string;
  name: string;
  price: string;
  maxGuests: number;
  totalQuantity: number;
  description: string | null;
  isActive: boolean;
  reservedCount?: number;
}

interface ReservationResult {
  id: string;
  qrToken: string;
  qrCodeUrl: string;
  customerFirstName: string;
  customerLastName: string;
  reservationType: string;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: springTransition,
};

const listReservationSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  phone: z.string().min(6, "Numero di telefono non valido"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  prCode: z.string().optional(),
});

const tableReservationSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  phone: z.string().min(6, "Numero di telefono non valido"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  prCode: z.string().optional(),
  guestCount: z.number().min(1, "Almeno 1 ospite"),
});

type ListReservationFormData = z.infer<typeof listReservationSchema>;
type TableReservationFormData = z.infer<typeof tableReservationSchema>;

export function PublicReservationSection({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [location] = useLocation();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTableTypeId, setSelectedTableTypeId] = useState<string | null>(null);
  const [reservationResult, setReservationResult] = useState<ReservationResult | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const prCodeFromUrl = urlParams.get("pr") || urlParams.get("prCode") || "";

  const { data: settings, isLoading: settingsLoading } = useQuery<EventReservationSettings>({
    queryKey: ["/api/public/events", eventId, "reservation-settings"],
  });

  const { data: lists, isLoading: listsLoading } = useQuery<EventList[]>({
    queryKey: ["/api/public/events", eventId, "lists"],
    enabled: settings?.listsEnabled === true,
  });

  const { data: tableTypes, isLoading: tablesLoading } = useQuery<TableType[]>({
    queryKey: ["/api/public/events", eventId, "table-types"],
    enabled: settings?.tablesEnabled === true,
  });

  const listForm = useForm<ListReservationFormData>({
    resolver: zodResolver(listReservationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      prCode: prCodeFromUrl,
    },
  });

  const tableForm = useForm<TableReservationFormData>({
    resolver: zodResolver(tableReservationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      prCode: prCodeFromUrl,
      guestCount: 1,
    },
  });

  useEffect(() => {
    if (prCodeFromUrl) {
      listForm.setValue("prCode", prCodeFromUrl);
      tableForm.setValue("prCode", prCodeFromUrl);
    }
  }, [prCodeFromUrl, listForm, tableForm]);

  const createReservationMutation = useMutation({
    mutationFn: async (data: {
      eventId: string;
      reservationType: "list" | "table";
      customerFirstName: string;
      customerLastName: string;
      customerPhone: string;
      customerEmail?: string;
      prCode?: string;
      listId?: string;
      tableTypeId?: string;
      guestCount?: number;
      amount: string;
    }) => {
      const res = await apiRequest("POST", "/api/public/reservations", data);
      return res.json();
    },
    onSuccess: (result: ReservationResult) => {
      setReservationResult(result);
      setIsSuccessDialogOpen(true);
      triggerHaptic("success");
      queryClient.invalidateQueries({ queryKey: ["/api/public/events", eventId, "lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/events", eventId, "table-types"] });
      listForm.reset({ prCode: prCodeFromUrl });
      tableForm.reset({ prCode: prCodeFromUrl, guestCount: 1 });
      setSelectedListId(null);
      setSelectedTableTypeId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile completare la prenotazione",
        variant: "destructive",
      });
    },
  });

  const handleListReservation = (data: ListReservationFormData) => {
    if (!selectedListId) return;

    const selectedList = lists?.find((l) => l.id === selectedListId);
    const fee = settings?.paidReservationsEnabled 
      ? (selectedList?.price || settings?.listReservationFee || "0")
      : "0";

    createReservationMutation.mutate({
      eventId,
      reservationType: "list",
      customerFirstName: data.firstName,
      customerLastName: data.lastName,
      customerPhone: data.phone,
      customerEmail: data.email || undefined,
      prCode: data.prCode || undefined,
      listId: selectedListId,
      amount: fee,
    });
  };

  const handleTableReservation = (data: TableReservationFormData) => {
    if (!selectedTableTypeId) return;

    const selectedTable = tableTypes?.find((t) => t.id === selectedTableTypeId);
    if (!selectedTable) return;

    createReservationMutation.mutate({
      eventId,
      reservationType: "table",
      customerFirstName: data.firstName,
      customerLastName: data.lastName,
      customerPhone: data.phone,
      customerEmail: data.email || undefined,
      prCode: data.prCode || undefined,
      tableTypeId: selectedTableTypeId,
      guestCount: data.guestCount,
      amount: selectedTable.price,
    });
  };

  if (settingsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!settings || (!settings.listsEnabled && !settings.tablesEnabled)) {
    return null;
  }

  const activeLists = lists?.filter((l) => l.isActive) || [];
  const activeTableTypes = tableTypes?.filter((t) => t.isActive) || [];

  if (activeLists.length === 0 && activeTableTypes.length === 0) {
    return null;
  }

  return (
    <motion.div
      {...fadeInUp}
      className="space-y-6"
      data-testid="section-reservations"
    >
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Servizio di Prenotazione</h2>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-300 text-sm">Avviso Importante</h4>
          <p className="text-xs text-amber-200/70">
            {settings.accessDisclaimer || 
              "L'accesso è subordinato al rispetto delle condizioni del locale e alla verifica in fase di accreditamento."}
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {settings.listsEnabled && activeLists.length > 0 && (
          <AccordionItem value="lists" className="border-0">
            <AccordionTrigger className="bg-card/50 border border-border rounded-2xl px-4 py-3 hover:no-underline [&[data-state=open]]:rounded-b-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Prenotazione Lista</h3>
                  <p className="text-sm text-muted-foreground">Prenota il tuo ingresso in lista</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-card/30 border border-t-0 border-border rounded-b-2xl p-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  {activeLists.map((list) => {
                    const isSelected = selectedListId === list.id;
                    const listPrice = list.price ? Number(list.price) : 0;
                    const fee = settings.paidReservationsEnabled ? listPrice : 0;
                    
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedListId(isSelected ? null : list.id);
                        }}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border bg-background/30"
                        }`}
                        data-testid={`list-option-${list.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="font-medium text-foreground">{list.name}</span>
                          </div>
                          {fee > 0 && (
                            <Badge variant="secondary" className="text-primary">
                              €{fee.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        {list.maxCapacity && list.entriesCount !== undefined && (
                          <p className="text-xs text-muted-foreground mt-2 ml-7">
                            {list.maxCapacity - (list.entriesCount || 0)} posti disponibili
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedListId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-border pt-4"
                  >
                    <Form {...listForm}>
                      <form
                        onSubmit={listForm.handleSubmit(handleListReservation)}
                        className="space-y-4"
                        data-testid="form-list-reservation"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={listForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Nome</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                      {...field}
                                      placeholder="Mario"
                                      className="pl-10"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={listForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Cognome</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Rossi" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={listForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Telefono</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="tel"
                                    placeholder="+39 333 1234567"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={listForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Email (opzionale)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="mario@email.com"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={listForm.control}
                          name="prCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                Codice PR (opzionale)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="PR-XXXXXXXX"
                                  data-testid="input-pr-code"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={createReservationMutation.isPending}
                          data-testid="button-book-list"
                        >
                          {createReservationMutation.isPending ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Prenotazione in corso...
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5 mr-2" />
                              Prenota Lista
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {settings.tablesEnabled && activeTableTypes.length > 0 && (
          <AccordionItem value="tables" className="border-0">
            <AccordionTrigger className="bg-card/50 border border-border rounded-2xl px-4 py-3 hover:no-underline [&[data-state=open]]:rounded-b-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <Table2 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Prenotazione Tavolo</h3>
                  <p className="text-sm text-muted-foreground">Riserva un tavolo per il tuo gruppo</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="bg-card/30 border border-t-0 border-border rounded-b-2xl p-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  {activeTableTypes.map((tableType) => {
                    const isSelected = selectedTableTypeId === tableType.id;
                    const available = tableType.totalQuantity - (tableType.reservedCount || 0);
                    const isAvailable = available > 0;
                    
                    return (
                      <button
                        key={tableType.id}
                        type="button"
                        onClick={() => {
                          if (isAvailable) {
                            triggerHaptic("light");
                            setSelectedTableTypeId(isSelected ? null : tableType.id);
                          }
                        }}
                        disabled={!isAvailable}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          !isAvailable
                            ? "border-border/50 bg-background/10 opacity-50 cursor-not-allowed"
                            : isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border bg-background/30"
                        }`}
                        data-testid={`table-option-${tableType.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <div>
                              <span className="font-medium text-foreground">{tableType.name}</span>
                              <p className="text-xs text-muted-foreground">
                                Max {tableType.maxGuests} ospiti
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              €{Number(tableType.price).toFixed(2)}
                            </div>
                            {isAvailable ? (
                              <Badge variant="secondary" className="text-xs">
                                {available} disponibili
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Esaurito
                              </Badge>
                            )}
                          </div>
                        </div>
                        {tableType.description && (
                          <p className="text-xs text-muted-foreground mt-2 ml-7">
                            {tableType.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedTableTypeId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-border pt-4"
                  >
                    <Form {...tableForm}>
                      <form
                        onSubmit={tableForm.handleSubmit(handleTableReservation)}
                        className="space-y-4"
                        data-testid="form-table-reservation"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={tableForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Nome</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                      {...field}
                                      placeholder="Mario"
                                      className="pl-10"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={tableForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Cognome</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Rossi" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={tableForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Telefono</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="tel"
                                    placeholder="+39 333 1234567"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={tableForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Email (opzionale)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="mario@email.com"
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={tableForm.control}
                          name="guestCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Numero Ospiti</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                  <Input
                                    {...field}
                                    type="number"
                                    min={1}
                                    max={tableTypes?.find((t) => t.id === selectedTableTypeId)?.maxGuests || 10}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    className="pl-10"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={tableForm.control}
                          name="prCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                Codice PR (opzionale)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="PR-XXXXXXXX"
                                  data-testid="input-pr-code"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          size="lg"
                          disabled={createReservationMutation.isPending}
                          data-testid="button-book-table"
                        >
                          {createReservationMutation.isPending ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Prenotazione in corso...
                            </>
                          ) : (
                            <>
                              <Check className="w-5 h-5 mr-2" />
                              Prenota Tavolo
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {settings.paidReservationsEnabled && settings.listReservationFeeDescription && (
        <div className="bg-card/30 border border-border p-4 rounded-xl flex items-start gap-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {settings.listReservationFeeDescription}
          </p>
        </div>
      )}

      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-reservation-success">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              Prenotazione Confermata!
            </DialogTitle>
            <DialogDescription className="text-center">
              La tua prenotazione è stata registrata con successo.
            </DialogDescription>
          </DialogHeader>

          {reservationResult && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">
                  {reservationResult.customerFirstName} {reservationResult.customerLastName}
                </p>
                <Badge className="mt-2">
                  {reservationResult.reservationType === "list" ? "Lista" : "Tavolo"}
                </Badge>
              </div>

              {reservationResult.qrCodeUrl && (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-4 rounded-xl">
                    <img
                      src={reservationResult.qrCodeUrl}
                      alt="QR Code Prenotazione"
                      className="w-48 h-48"
                      data-testid="img-qr-code"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Mostra questo QR code all'ingresso per la verifica
                  </p>
                  <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      L'accesso è subordinato al rispetto delle condizioni del locale e alla verifica in fase di accreditamento.
                    </p>
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {reservationResult.qrToken}
                  </code>
                </div>
              )}

            </div>
          )}

          <Button
            className="w-full"
            onClick={() => setIsSuccessDialogOpen(false)}
          >
            Chiudi
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
