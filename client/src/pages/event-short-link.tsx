import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function EventShortLink() {
  const { shortId } = useParams<{ shortId: string }>();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveShortLink() {
      if (!shortId) {
        setError("Link non valido");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/events/short/${shortId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Evento non trovato");
          } else {
            setError("Errore nel caricamento dell'evento");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        navigate(`/acquista/${data.id}`, { replace: true });
      } catch (err) {
        setError("Errore di connessione");
        setLoading(false);
      }
    }

    resolveShortLink();
  }, [shortId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento evento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Oops!</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return null;
}
