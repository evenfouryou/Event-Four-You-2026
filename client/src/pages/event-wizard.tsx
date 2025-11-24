import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema, type Location as LocationType, type EventFormat, type InsertEvent } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Repeat, FileText, Save, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { id: 1, title: "Informazioni Base", icon: FileText },
  { id: 2, title: "Date e Orari", icon: Calendar },
  { id: 3, title: "Ricorrenza", icon: Repeat },
  { id: 4, title: "Riepilogo", icon: CheckCircle2 }
];

export default function EventWizard() {
  const [, params] = useRoute("/events/wizard/:id?");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(params?.id || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: locations } = useQuery<LocationType[]>({
    queryKey: ['/api/locations'],
  });

  const { data: formats } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  // Load existing draft if editing
  const { data: existingEvent } = useQuery({
    queryKey: ['/api/events', draftId],
    enabled: !!draftId,
    queryFn: async () => {
      const events = await queryClient.fetchQuery<any[]>({ queryKey: ['/api/events'] });
      return events.find(e => e.id === draftId);
    }
  });

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: '',
      locationId: '',
      startDatetime: undefined,
      endDatetime: undefined,
      status: 'draft',
      isRecurring: false,
      recurrencePattern: 'none',
      recurrenceInterval: 1,
      formatId: undefined,
      capacity: undefined,
      notes: '',
      companyId: '',
    },
  });

  // Load existing draft data
  useEffect(() => {
    if (existingEvent) {
      form.reset({
        ...existingEvent,
        startDatetime: existingEvent.startDatetime ? new Date(existingEvent.startDatetime) : undefined,
        endDatetime: existingEvent.endDatetime ? new Date(existingEvent.endDatetime) : undefined,
      });
    }
  }, [existingEvent]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (form.formState.isDirty) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [form.formState.isDirty]);

  const saveDraftMutation = useMutation({
    mutationFn: async (data: Partial<InsertEvent>) => {
      if (draftId) {
        return apiRequest(`/api/events/${draftId}`, 'PATCH', { ...data, status: 'draft' });
      } else {
        return apiRequest('/api/events', 'POST', { ...data, status: 'draft' });
      }
    },
    onSuccess: (savedEvent: any) => {
      if (!draftId && savedEvent?.id) {
        setDraftId(savedEvent.id);
        navigate(`/events/wizard/${savedEvent.id}`);
      }
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      if (draftId) {
        return apiRequest(`/api/events/${draftId}`, 'PATCH', { ...data, status: 'scheduled' });
      } else {
        return apiRequest('/api/events', 'POST', { ...data, status: 'scheduled' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Successo",
        description: "Evento creato con successo",
      });
      navigate('/events');
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare l'evento",
        variant: "destructive",
      });
    },
  });

  const saveDraft = () => {
    const values = form.getValues();
    saveDraftMutation.mutate(values);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      saveDraft();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: InsertEvent) => {
    publishMutation.mutate(data);
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {draftId ? 'Modifica Evento' : 'Nuovo Evento'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lastSaved && `Ultima modifica salvata: ${lastSaved.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={saveDraftMutation.isPending}
            data-testid="button-save-draft"
          >
            <Save className="h-4 w-4 mr-2" />
            Salva Bozza
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/events')}
            data-testid="button-cancel-wizard"
          >
            Annulla
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isActive ? 'bg-primary/10' : isCompleted ? 'bg-green-100' : 'bg-muted'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Steps */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Base</CardTitle>
                <CardDescription>Inserisci i dettagli fondamentali dell'evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Evento</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Matrimonio Rossi-Bianchi" {...field} data-testid="input-event-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location">
                            <SelectValue placeholder="Seleziona location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {location.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="formatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato Evento (opzionale)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-format">
                            <SelectValue placeholder="Seleziona formato" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nessun formato</SelectItem>
                          {formats?.map((format) => (
                            <SelectItem key={format.id} value={format.id}>
                              <div className="flex items-center gap-2">
                                <Badge style={{ backgroundColor: format.color || '#3b82f6' }}>
                                  {format.name}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Dates */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Date e Orari</CardTitle>
                <CardDescription>Quando si svolgerà l'evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="startDatetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Ora Inizio</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-start-datetime"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDatetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data/Ora Fine</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-end-datetime"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capienza Stimata (opzionale)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="es. 100"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-capacity"
                        />
                      </FormControl>
                      <FormDescription>Numero massimo di partecipanti previsti</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Recurrence */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Ricorrenza (Opzionale)</CardTitle>
                <CardDescription>Configura se l'evento si ripete</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-recurring"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Evento ricorrente</FormLabel>
                        <FormDescription>
                          Attiva questa opzione se l'evento si ripete periodicamente
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('isRecurring') && (
                  <>
                    <FormField
                      control={form.control}
                      name="recurrencePattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequenza</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recurrence-pattern">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Giornaliero</SelectItem>
                              <SelectItem value="weekly">Settimanale</SelectItem>
                              <SelectItem value="monthly">Mensile</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ogni quanti giorni/settimane/mesi</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              value={field.value || 1}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-recurrence-interval"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrenceCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero di occorrenze</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="es. 5"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-recurrence-count"
                            />
                          </FormControl>
                          <FormDescription>
                            Lascia vuoto per specificare una data di fine
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Summary */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo e Note</CardTitle>
                <CardDescription>Rivedi i dettagli e aggiungi eventuali note</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <div>
                    <span className="font-medium">Nome: </span>
                    <span>{form.watch('name')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Location: </span>
                    <span>{locations?.find(l => l.id === form.watch('locationId'))?.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Inizio: </span>
                    <span>{form.watch('startDatetime')?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Fine: </span>
                    <span>{form.watch('endDatetime')?.toLocaleString()}</span>
                  </div>
                  {form.watch('isRecurring') && (
                    <div>
                      <span className="font-medium">Ricorrenza: </span>
                      <span>{form.watch('recurrencePattern')} x{form.watch('recurrenceCount')}</span>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Aggiuntive (opzionale)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Inserisci eventuali note..."
                          {...field}
                          value={field.value || ''}
                          data-testid="input-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                data-testid="button-next-step"
              >
                Avanti
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={publishMutation.isPending}
                data-testid="button-publish-event"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Pubblica Evento
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
