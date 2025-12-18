import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

// This page now redirects to the unified login page
export default function PublicLoginPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectTo = params.get("redirect") || "/account";

  useEffect(() => {
    // Redirect to unified login with the same redirect parameter
    navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }, [navigate, redirectTo]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-foreground">Reindirizzamento...</div>
    </div>
  );
}
