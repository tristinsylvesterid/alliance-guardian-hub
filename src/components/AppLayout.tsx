import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, Trophy, Calendar, Settings, Shield, Archive, CalendarClock } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/event-archive", label: "Event Archive", icon: CalendarClock },
  { to: "/archive", label: "Member Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
          <Shield className="h-8 w-8 text-gold" />
          <div>
            <h1 className="font-heading text-lg font-bold tracking-wide text-gold">nOva</h1>
            <p className="text-xs text-sidebar-foreground/60">Alliance Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-gold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-6 py-4">
          <p className="text-xs text-sidebar-foreground/40">Phase 1 · Mock Data</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
