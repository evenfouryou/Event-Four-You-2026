import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function NotFound() {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen p-6" data-testid="page-not-found">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
              <h1 className="text-2xl font-bold">404 Page Not Found</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Did you forget to add the page to the router?
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-3" data-testid="page-not-found">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 p-4">
          <div className="flex mb-4 gap-2 flex-wrap">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <h1 className="text-xl font-bold">404 Page Not Found</h1>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
