import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, Trophy, Calendar, Settings, Shield, Archive, CalendarClock, Swords, UserCog, LogOut, ScrollText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/at-risk", label: "At Risk", icon: AlertTriangle },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/svs-planning", label: "SvS Planning", icon: Swords },
  { to: "/event-archive", label: "Event Archive", icon: CalendarClock },
  { to: "/archive", label: "Member Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { to: "/admin", label: "User Management", icon: UserCog, adminOnly: true },
  { to: "/changelog", label: "Change Log", icon: ScrollText, adminOnly: true },
] as const;


export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAdmin, displayName, signOut } = useAuth();

  const filteredNav = navItems.filter((item) => !("adminOnly" in item && item.adminOnly) || isAdmin);

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
          {filteredNav.map((item) => {
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
        <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
              {displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{displayName || "Officer"}</p>
              <p className="text-[10px] text-sidebar-foreground/40">{isAdmin ? "Admin" : "Officer"}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
