import { Link } from "@tanstack/react-router";
import { Home, History, Star, GraduationCap, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/favoritos", label: "Favoritos", icon: Star },
  { to: "/aprender", label: "Aprender", icon: GraduationCap },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors [&.active]:text-primary"
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
