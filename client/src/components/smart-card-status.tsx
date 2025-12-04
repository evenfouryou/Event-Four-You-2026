/**
 * Componente per visualizzare lo stato del lettore Smart Card MiniLector EVO V3
 * Mostra un'icona live con tooltip informativo
 */

import { useSmartCardStatus, smartCardService } from "@/lib/smart-card-service";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SmartCardStatusProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function SmartCardStatus({ 
  compact = false, 
  showLabel = true,
  className 
}: SmartCardStatusProps) {
  const status = useSmartCardStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Force a status check
    smartCardService.startPolling();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDemoMode = () => {
    if (status.readerName?.includes('DEMO')) {
      smartCardService.disableDemoMode();
    } else {
      smartCardService.enableDemoMode();
    }
  };

  // Determina lo stato visuale
  const getStatusInfo = () => {
    if (!status.middlewareAvailable) {
      return {
        icon: WifiOff,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/30',
        pulseColor: 'bg-destructive',
        label: 'Middleware Offline',
        description: 'Trust1Connector non disponibile',
        severity: 'error' as const
      };
    }

    if (!status.readerDetected) {
      return {
        icon: ShieldX,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        pulseColor: 'bg-orange-500',
        label: 'Lettore Non Connesso',
        description: 'Collegare MiniLector EVO V3',
        severity: 'warning' as const
      };
    }

    if (!status.cardInserted) {
      return {
        icon: ShieldAlert,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        pulseColor: 'bg-yellow-500',
        label: 'Carta Non Inserita',
        description: 'Inserire Smart Card SIAE',
        severity: 'warning' as const
      };
    }

    return {
      icon: ShieldCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      pulseColor: 'bg-green-500',
      label: 'Pronto',
      description: 'Smart Card attiva',
      severity: 'success' as const
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const canEmit = status.cardInserted && status.readerDetected;

  // Versione compatta per header
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "relative flex items-center justify-center w-9 h-9 rounded-full border cursor-pointer transition-all",
              statusInfo.bgColor,
              statusInfo.borderColor,
              "hover:scale-105",
              className
            )}
            data-testid="smart-card-status-compact"
          >
            <StatusIcon className={cn("w-4 h-4", statusInfo.color)} />
            
            {/* Pulse animation per stato attivo */}
            {canEmit && (
              <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  statusInfo.pulseColor
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  statusInfo.pulseColor
                )} />
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <StatusIcon className={cn("w-4 h-4", statusInfo.color)} />
              {statusInfo.label}
            </div>
            <p className="text-xs text-muted-foreground">
              {statusInfo.description}
            </p>
            {status.readerName && (
              <p className="text-xs text-muted-foreground">
                Lettore: {status.readerName}
              </p>
            )}
            {status.error && (
              <p className="text-xs text-destructive">
                {status.error}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Versione estesa con dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 px-3 h-9",
            statusInfo.bgColor,
            statusInfo.borderColor,
            "border",
            className
          )}
          data-testid="smart-card-status-button"
        >
          <div className="relative">
            <StatusIcon className={cn("w-4 h-4", statusInfo.color)} />
            {canEmit && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  statusInfo.pulseColor
                )} />
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  statusInfo.pulseColor
                )} />
              </span>
            )}
          </div>
          {showLabel && (
            <span className={cn("text-sm font-medium", statusInfo.color)}>
              {statusInfo.label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72" data-testid="smart-card-dropdown">
        <DropdownMenuLabel className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Lettore Smart Card SIAE
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Stato connessione */}
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Middleware:</span>
            <Badge 
              variant={status.middlewareAvailable ? "default" : "destructive"}
              className="text-xs"
            >
              {status.middlewareAvailable ? (
                <><Wifi className="w-3 h-3 mr-1" /> Online</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" /> Offline</>
              )}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lettore:</span>
            <Badge 
              variant={status.readerDetected ? "default" : "secondary"}
              className="text-xs"
            >
              {status.readerDetected ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Connesso</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Non Rilevato</>
              )}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Smart Card:</span>
            <Badge 
              variant={status.cardInserted ? "default" : "secondary"}
              className={cn(
                "text-xs",
                status.cardInserted ? "bg-green-500 hover:bg-green-600" : ""
              )}
            >
              {status.cardInserted ? (
                <><Shield className="w-3 h-3 mr-1" /> Inserita</>
              ) : (
                <><AlertTriangle className="w-3 h-3 mr-1" /> Non Inserita</>
              )}
            </Badge>
          </div>
        </div>
        
        {/* Info lettore */}
        {status.readerName && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 space-y-1">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Dispositivo:</span>
                <p className="mt-0.5">{status.readerName}</p>
              </div>
              {status.cardType && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Tipo Carta:</span>
                  <p className="mt-0.5">{status.cardType}</p>
                </div>
              )}
              {status.cardAtr && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">ATR:</span>
                  <p className="mt-0.5 font-mono text-[10px]">{status.cardAtr}</p>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Errore */}
        {status.error && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-start gap-2 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{status.error}</span>
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Azioni */}
        <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Aggiorna Stato
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleDemoMode}>
          <Info className="w-4 h-4 mr-2" />
          {status.readerName?.includes('DEMO') ? 'Disabilita Demo' : 'Modalità Demo'}
        </DropdownMenuItem>
        
        {/* Stato emissione */}
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-md text-sm",
            canEmit 
              ? "bg-green-500/10 text-green-700 dark:text-green-400" 
              : "bg-destructive/10 text-destructive"
          )}>
            {canEmit ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Pronto per emissione biglietti</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Emissione biglietti bloccata</span>
              </>
            )}
          </div>
        </div>
        
        {/* Ultimo controllo */}
        <div className="px-2 py-1 text-[10px] text-muted-foreground">
          Ultimo controllo: {status.lastCheck.toLocaleTimeString('it-IT')}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Hook per verificare se è possibile emettere biglietti
 * Da usare nelle pagine di emissione
 */
export function useCanEmitTickets(): {
  canEmit: boolean;
  reason: string | null;
  status: ReturnType<typeof useSmartCardStatus>;
} {
  const status = useSmartCardStatus();
  
  let reason: string | null = null;
  
  if (!status.middlewareAvailable) {
    reason = "Middleware Trust1Connector non disponibile";
  } else if (!status.readerDetected) {
    reason = "Lettore MiniLector EVO non connesso";
  } else if (!status.cardInserted) {
    reason = "Smart Card SIAE non inserita";
  }
  
  return {
    canEmit: status.cardInserted && status.readerDetected && status.middlewareAvailable,
    reason,
    status
  };
}
