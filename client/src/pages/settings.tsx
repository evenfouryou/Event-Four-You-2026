import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
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
import { Building2, Save, User, Mail, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
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
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">Nessuna azienda associata</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-settings-title">
          Impostazioni
        </h1>
        <p className="text-muted-foreground">
          Gestisci le informazioni della tua azienda
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
        data-testid="card-company-settings"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold">Informazioni Azienda</h2>
        </div>

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
                className="gradient-golden text-black font-semibold hover:opacity-90 min-h-[48px] md:min-h-9"
                data-testid="button-save-settings"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 mt-6"
        data-testid="card-account-info"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold">Informazioni Account</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-0.5">Email</p>
              <p className="text-base" data-testid="text-user-email">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-0.5">Ruolo</p>
              <p className="text-base capitalize" data-testid="text-user-role">
                {user?.role === 'gestore' ? 'Gestore Azienda' : user?.role}
              </p>
            </div>
          </div>

          {(user?.firstName || user?.lastName) && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-0.5">Nome</p>
                <p className="text-base" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
