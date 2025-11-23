import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Company } from "@shared/schema";

const settingsSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['/api/companies/current'],
  });

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: company ? {
      name: company.name,
      taxId: company.taxId || '',
      address: company.address || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      await apiRequest('PATCH', `/api/companies/${company?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Successo",
        description: "Impostazioni azienda aggiornate con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le impostazioni",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nessuna azienda associata</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
        <p className="text-muted-foreground">
          Gestisci le informazioni della tua azienda
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informazioni Azienda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Azienda *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nome della tua azienda" 
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partita IVA / Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="IT12345678901" 
                        data-testid="input-company-tax-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Via, città, CAP, provincia" 
                        rows={3}
                        data-testid="input-company-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informazioni Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
            <p className="text-base" data-testid="text-user-email">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Ruolo</p>
            <p className="text-base capitalize" data-testid="text-user-role">
              {user?.role === 'gestore' ? 'Gestore Azienda' : user?.role}
            </p>
          </div>
          {(user?.firstName || user?.lastName) && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Nome</p>
              <p className="text-base" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
