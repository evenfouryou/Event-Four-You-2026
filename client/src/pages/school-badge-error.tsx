import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, AlertTriangle, Clock, Home } from "lucide-react";
import { motion } from "framer-motion";

const ERROR_MESSAGES: Record<string, { title: string; description: string; icon: typeof XCircle }> = {
  "missing-token": {
    title: "Token mancante",
    description: "Il link di verifica non contiene un token valido. Assicurati di aver copiato correttamente il link dall'email.",
    icon: AlertTriangle,
  },
  "invalid-token": {
    title: "Token non valido",
    description: "Il link di verifica non è valido. Potrebbe essere stato già utilizzato o non esiste.",
    icon: XCircle,
  },
  "expired-token": {
    title: "Link scaduto",
    description: "Il link di verifica è scaduto. I link sono validi per 24 ore. Richiedi un nuovo badge per ricevere un nuovo link.",
    icon: Clock,
  },
  "server-error": {
    title: "Errore del server",
    description: "Si è verificato un errore durante la verifica. Riprova più tardi o contatta l'assistenza.",
    icon: XCircle,
  },
};

export default function SchoolBadgeError() {
  const [, setLocation] = useLocation();
  
  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "server-error";
  
  const errorInfo = ERROR_MESSAGES[reason] || ERROR_MESSAGES["server-error"];
  const IconComponent = errorInfo.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="text-center" data-testid="card-badge-error">
          <CardHeader>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <IconComponent className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle data-testid="text-error-title">{errorInfo.title}</CardTitle>
            <CardDescription data-testid="text-error-description">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              data-testid="button-go-home"
            >
              <Home className="h-4 w-4 mr-2" />
              Torna alla home
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
