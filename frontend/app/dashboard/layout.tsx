"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Command,
  DollarSign,
  CheckSquare,
  Settings,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isLoggedIn, handleOAuthCallback, clearToken } from "@/lib/auth";
import { getCurrentUser, searchSage } from "@/lib/api";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/command", icon: Command, label: "Ask Sage" },
  { href: "/dashboard/finance", icon: DollarSign, label: "Finance" },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export const UserContext = createContext<any>(null);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{tasks: any[], expenses: any[]} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    // Restore accent preference from localStorage
    const savedAccent = localStorage.getItem('sage-accent');
    if (savedAccent && savedAccent !== 'amber') {
      document.documentElement.setAttribute('data-accent', savedAccent);
    }

    handleOAuthCallback(router);

    if (!isLoggedIn()) {
      router.push("/");
      return;
    }

    const fetchUser = async () => {
      try {
        const data = await getCurrentUser();
        setUser(data);
      } catch (error) {
        console.error("Failed to load user", error);
        clearToken();
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const results = await searchSage(searchQuery);
          setSearchResults(results);
          setShowSearchDropdown(true);
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen bg-background flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
                </div>
                <span className="text-xl font-semibold text-sidebar-foreground">Sage</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", isActive && "text-sidebar-primary")} />
                      {item.label}
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary"
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-sidebar-primary">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email || ""}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                  <LogOut className="w-4 h-4 text-sidebar-foreground/60 hover:text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults) setShowSearchDropdown(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSearchDropdown(false), 200);
                  }}
                  className="pl-9 w-64 bg-secondary border-border focus:border-primary"
                />
                
                {showSearchDropdown && (searchQuery.trim().length > 1) && (
                  <div className="absolute top-full mt-2 w-80 bg-popover border border-border shadow-lg rounded-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                    ) : searchResults && (searchResults.tasks.length > 0 || searchResults.expenses.length > 0) ? (
                      <div className="py-2">
                        {searchResults.tasks.length > 0 && (
                          <div className="px-3 py-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tasks</h4>
                            {searchResults.tasks.map((task: any) => (
                              <div key={task._id} className="p-2 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors mb-1">
                                <p className="text-sm font-medium truncate">{task.title}</p>
                                {task.due_date && <p className="text-xs text-muted-foreground truncate">{task.due_date.split('T')[0]}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {searchResults.tasks.length > 0 && searchResults.expenses.length > 0 && (
                          <div className="h-px bg-border my-2" />
                        )}

                        {searchResults.expenses.length > 0 && (
                          <div className="px-3 py-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expenses</h4>
                            {searchResults.expenses.map((exp: any) => (
                              <div key={exp._id} className="p-2 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors mb-1 flex justify-between items-center">
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="text-sm font-medium truncate">{exp.name || exp.title}</p>
                                  {exp.due_date && <p className="text-xs text-muted-foreground truncate">{exp.due_date.split('T')[0]}</p>}
                                </div>
                                <span className="text-xs font-bold shrink-0">₹{exp.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">No results found for &quot;{searchQuery}&quot;</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle Theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
