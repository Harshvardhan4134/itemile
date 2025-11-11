import { Outlet, NavLink } from "react-router-dom";
import { Map, Shield, Users, FileWarning, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: Shield, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/listings", label: "Listings", icon: Map },
  { to: "/admin/reports", label: "Reports", icon: FileWarning },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => {
  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex h-screen">
        <aside className="hidden md:flex md:flex-col w-64 border-r bg-background">
          <div className="p-6 border-b">
            <div className="font-urbanist font-bold text-xl">Lendlly Admin</div>
            <p className="text-xs text-muted-foreground mt-1">
              Moderation & Trust Center
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto">
            <ul className="p-4 space-y-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      ].join(" ")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <header className="flex flex-col gap-3 border-b bg-background px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold">RentShare Admin Console</h1>
              <p className="text-sm text-muted-foreground">
                Manage users, listings, and trust operations
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:hidden">
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    [
                      "px-3 py-1.5 rounded-md text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    ].join(" ")
                  }
                >
                  {label}
                </NavLink>
              ))}
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </header>
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;


