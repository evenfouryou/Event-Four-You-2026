import { Link, useLocation } from "wouter";
import { Home, Calendar, Package, Settings, Wine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Wine, label: "Beverage", href: "/beverage" },
  { icon: Calendar, label: "Eventi", href: "/events" },
  { icon: Package, label: "Magazzino", href: "/warehouse" },
  { icon: Settings, label: "Impostazioni", href: "/settings" },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-3 py-1 rounded-lg transition-colors touch-manipulation",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-6 w-6 mb-1", isActive && "text-primary")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
