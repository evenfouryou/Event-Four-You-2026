import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Ticket,
  Download,
  Mail,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  QrCode,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface TicketData {
  id: string;
  fiscalSealCode: string;
  ticketTypeCode: string;
  sectorCode: string;
  grossAmount: string;
  status: string;
  qrCode: string;
  participantFirstName: string;
  participantLastName: string;
  emissionDateStr: string;
  eventName: string;
  eventStart: Date;
  locationName: string;
  sectorName: string;
}

function TicketCard({ ticket }: { ticket: TicketData }) {
  const { toast } = useToast();

  const copyCode = () => {
    navigator.clipboard.writeText(ticket.fiscalSealCode);
    toast({
      title: "Copiato!",
      description: "Codice biglietto copiato negli appunti.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-[#151922] border-white/10 overflow-hidden" data-testid={`card-ticket-${ticket.id}`}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10" />
          <CardContent className="relative p-6">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center shrink-0">
                <QrCode className="w-12 h-12 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg truncate" data-testid={`text-event-${ticket.id}`}>
                  {ticket.eventName}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {ticket.sectorName} - {ticket.ticketTypeCode === "INT" ? "Intero" : "Ridotto"}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(ticket.eventStart), "d MMMM yyyy", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(ticket.eventStart), "HH:mm")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {ticket.locationName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-yellow-400" data-testid={`text-price-${ticket.id}`}>
                  €{Number(ticket.grossAmount).toFixed(2)}
                </p>
                <Badge
                  className={
                    ticket.status === "valid"
                      ? "mt-2 bg-teal-500/20 text-teal-400 border-teal-500/30"
                      : "mt-2 bg-red-500/20 text-red-400 border-red-500/30"
                  }
                  data-testid={`badge-status-${ticket.id}`}
                >
                  {ticket.status === "valid" ? "Valido" : ticket.status}
                </Badge>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Intestatario</p>
                  <p className="text-sm text-white" data-testid={`text-participant-${ticket.id}`}>
                    {ticket.participantFirstName} {ticket.participantLastName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Codice Biglietto</p>
                    <p className="text-sm font-mono text-white" data-testid={`text-code-${ticket.id}`}>
                      {ticket.fiscalSealCode.slice(0, 8)}...
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyCode}
                    className="text-slate-400 hover:text-yellow-400"
                    data-testid={`button-copy-${ticket.id}`}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

export default function PublicCheckoutSuccessPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const transactionCode = params.get("transaction");

  const { data: tickets, isLoading } = useQuery<TicketData[]>({
    queryKey: ["/api/public/tickets"],
  });

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="text-lg font-bold text-white">Event4U</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-teal-500/20 flex items-center justify-center">
            <Check className="w-10 h-10 text-teal-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="text-success-title">
            Acquisto Completato!
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            I tuoi biglietti sono stati generati con successo.
            Li riceverai anche via email con il QR code per l'ingresso.
          </p>
          {transactionCode && (
            <Badge className="mt-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-sm py-1 px-3">
              Transazione: {transactionCode}
            </Badge>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-[#151922] border-white/10 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Email Inviata</h3>
              <p className="text-sm text-slate-400">I biglietti sono stati inviati alla tua email</p>
            </div>
          </Card>
          <Card className="bg-[#151922] border-white/10 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Scarica PDF</h3>
              <p className="text-sm text-slate-400">Puoi scaricare i biglietti in formato PDF</p>
            </div>
          </Card>
        </div>

        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-yellow-400" />
          I Tuoi Biglietti
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-4" data-testid="list-tickets">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-white/5 border-white/10">
            <Ticket className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">Nessun biglietto trovato.</p>
          </Card>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/acquista">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-more-events"
            >
              Scopri Altri Eventi
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/i-miei-biglietti">
            <Button
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              data-testid="button-my-tickets"
            >
              <Ticket className="w-4 h-4 mr-2" />
              I Miei Biglietti
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            Hai bisogno di assistenza?{" "}
            <a href="#" className="text-yellow-400 hover:underline">
              Contattaci
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
