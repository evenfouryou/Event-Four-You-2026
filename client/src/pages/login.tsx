import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail } from "lucide-react";
import { Link, useSearch } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { triggerHaptic, HapticButton, SafeArea } from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";

// Helper to detect if input looks like a phone number
const isPhoneNumber = (input: string): boolean => {
  const cleaned = input.replace(/[\s\-\(\)]/g, '');
  // Starts with + or is all digits (min 8 chars)
  return cleaned.startsWith('+') || (/^\d{8,}$/.test(cleaned));
};

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function Login() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectTo = params.get("redirect");
  const isMobile = useIsMobile();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowResendVerification(false);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      // Check if input is a phone number for PR login
      if (isPhoneNumber(email)) {
        try {
          await apiRequest('POST', '/api/pr/login', { phone: email, password });
          triggerHaptic('success');
          queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
          window.location.href = '/pr/wallet';
          return;
        } catch (prErr: any) {
          // If PR login fails, continue to try other login methods
          // Only throw if it's a specific auth error
          if (prErr.message && !prErr.message.includes("non valide")) {
            throw prErr;
          }
        }
      }

      try {
        const response: any = await apiRequest('POST', '/api/auth/login', { email, password });
        
        triggerHaptic('success');
        if (response.user?.role === 'cliente') {
          window.location.href = redirectTo || '/account';
        } else if (response.user?.role === 'scanner') {
          window.location.href = '/scanner';
        } else {
          window.location.href = redirectTo || '/';
        }
        return;
      } catch (loginErr: any) {
        const isEmail = email.includes('@');
        if (!isEmail) {
          try {
            await apiRequest('POST', '/api/cashiers/login', { username: email, password });
            triggerHaptic('success');
            window.location.href = '/cashier/dashboard';
            return;
          } catch (cashierErr: any) {
            throw loginErr;
          }
        }
        throw loginErr;
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.message || "Credenziali non valide");
      if (err.message && err.message.includes("non verificata")) {
        setShowResendVerification(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    triggerHaptic('medium');
    try {
      const response: any = await apiRequest('POST', '/api/resend-verification', { email });
      triggerHaptic('success');
      toast({
        title: "Email inviata",
        description: response.message || "Controlla la tua casella di posta per il link di verifica.",
      });
      setShowResendVerification(false);
    } catch (err: any) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: err.message || "Impossibile inviare l'email. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" data-testid="page-login">
        <motion.div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[700px] h-[700px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="text-center space-y-4">
            <Link href="/" className="flex flex-col items-center gap-3">
              <BrandLogo variant="vertical" className="h-24 w-auto" />
            </Link>
            <div>
              <CardTitle className="text-2xl">Bentornato</CardTitle>
              <CardDescription>Accedi al tuo account per continuare</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showResendVerification && (
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>La tua email non è stata ancora verificata.</p>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="w-full"
                        data-testid="button-resend-verification"
                      >
                        {isResending ? "Invio in corso..." : "Rinvia Email di Verifica"}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email, Telefono o Username</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="email, +39 3XX... o username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>

              <div className="flex justify-end">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary font-medium hover:underline"
                  data-testid="link-forgot-password"
                >
                  Password dimenticata?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full gradient-golden text-black font-semibold"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-card px-4 text-muted-foreground">oppure</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = '/api/login';
                }}
                data-testid="button-replit-login"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z"/>
                </svg>
                Accedi con Replit
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Non hai un account?{" "}
                <Link 
                  href="/register" 
                  className="text-primary font-semibold hover:underline" 
                  data-testid="link-register"
                >
                  Registrati gratis
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <footer className="absolute bottom-4 text-center text-sm text-muted-foreground w-full">
          © {new Date().getFullYear()} Event Four You
        </footer>
      </div>
    );
  }

  // Mobile version
  return (
    <SafeArea 
      className="min-h-screen bg-background flex flex-col relative overflow-hidden"
      top={true}
      bottom={true}
      left={true}
      right={true}
    >
      <motion.div 
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="flex flex-col items-center mb-10"
        >
          <Link href="/" className="flex flex-col items-center gap-3 min-h-[44px]">
            <BrandLogo variant="vertical" className="h-28 w-auto" />
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Bentornato</h1>
            <p className="text-muted-foreground text-base">
              Accedi al tuo account per continuare
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
              >
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {showResendVerification && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
              >
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <p className="text-base">La tua email non è stata ancora verificata.</p>
                      <HapticButton 
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="w-full h-14 border-primary/30 text-base rounded-xl"
                        hapticType="medium"
                        data-testid="button-resend-verification"
                      >
                        {isResending ? "Invio in corso..." : "Rinvia Email di Verifica"}
                      </HapticButton>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.15 }}
            >
              <Label htmlFor="email" className="text-base font-medium">Email, Telefono o Username</Label>
              <Input
                id="email"
                type="text"
                placeholder="email, +39 3XX... o username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                data-testid="input-email"
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.2 }}
            >
              <Label htmlFor="password" className="text-base font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                data-testid="input-password"
              />
            </motion.div>

            <motion.div 
              className="flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springConfig, delay: 0.25 }}
            >
              <Link 
                href="/forgot-password" 
                className="text-base text-primary font-medium min-h-[44px] flex items-center px-2"
                data-testid="link-forgot-password"
              >
                Password dimenticata?
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.3 }}
              whileTap={{ scale: 0.98 }}
            >
              <HapticButton
                type="submit"
                className="w-full h-14 gradient-golden text-black font-semibold text-lg rounded-xl"
                disabled={isLoading}
                hapticType="medium"
                data-testid="button-submit"
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </HapticButton>
            </motion.div>

            <motion.div 
              className="relative my-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springConfig, delay: 0.35 }}
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-background px-4 text-muted-foreground">oppure</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.4 }}
              whileTap={{ scale: 0.98 }}
            >
              <HapticButton
                type="button"
                variant="outline"
                className="w-full h-14 border-white/10 text-base rounded-xl"
                onClick={() => {
                  window.location.href = '/api/login';
                }}
                hapticType="light"
                data-testid="button-replit-login"
              >
                <svg className="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z"/>
                </svg>
                Accedi con Replit
              </HapticButton>
            </motion.div>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springConfig, delay: 0.45 }}
          className="mt-10 text-center"
        >
          <p className="text-base text-muted-foreground">
            Non hai un account?{" "}
            <Link 
              href="/register" 
              className="text-primary font-semibold min-h-[44px] inline-flex items-center px-1" 
              data-testid="link-register"
            >
              Registrati gratis
            </Link>
          </p>
        </motion.div>
      </div>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springConfig, delay: 0.5 }}
        className="py-6 text-center text-sm text-muted-foreground"
      >
        © {new Date().getFullYear()} Event Four You
      </motion.footer>
    </SafeArea>
  );
}
