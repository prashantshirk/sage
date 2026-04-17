"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Palette,
  Shield,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Key,
  CreditCard,
  LogOut,
  ChevronRight,
  Check,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCurrentUser, updateCurrentUser, logout, unlinkTelegram } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
];

const themeOptions = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Smartphone },
];

const accentColors = [
  { id: "amber",  label: "Amber",  hex: "#d97706" },
  { id: "blue",   label: "Blue",   hex: "#3b82f6" },
  { id: "green",  label: "Green",  hex: "#22c55e" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "red",    label: "Red",    hex: "#ef4444" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("profile");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const { theme, setTheme } = useTheme();

  const [selectedAccent, setSelectedAccent] = useState("amber");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    reminders: true,
    marketing: false,
  });

  useEffect(() => {
    // Restore saved accent from localStorage on mount
    const savedAccent = localStorage.getItem('sage-accent') || 'amber';
    setSelectedAccent(savedAccent);
    if (savedAccent !== 'amber') {
      document.documentElement.setAttribute('data-accent', savedAccent);
    }

    async function loadUser() {
      try {
        const data = await getCurrentUser();
        setUser(data);
        setUserId(data?._id || data?.id || "");
        setTelegramLinked(!!data?.telegram_chat_id);
        if (data.notifications) {
          setNotifications(prev => ({ ...prev, ...data.notifications }));
        }
        if (data.appearance) {
          if (data.appearance.theme) setTheme(data.appearance.theme);
          if (data.appearance.accent) {
            setSelectedAccent(data.appearance.accent);
            localStorage.setItem('sage-accent', data.appearance.accent);
            if (data.appearance.accent === 'amber') {
              document.documentElement.removeAttribute('data-accent');
            } else {
              document.documentElement.setAttribute('data-accent', data.appearance.accent);
            }
          }
        }
      } catch (e) {
        toast.error("Failed to load user settings");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const saveSettings = async (updates: any) => {
    setSaving(true);
    try {
      await updateCurrentUser(updates);
      toast.success("Settings saved successfully");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    const newNotifs = { ...notifications, [key]: value };
    setNotifications(newNotifs);
    saveSettings({ notifications: newNotifs });
  };

  const handleAppearanceChange = (type: 'theme' | 'accent', value: string) => {
    if (type === 'theme') {
      setTheme(value);
      saveSettings({ appearance: { theme: value, accent: selectedAccent } });
    } else {
      setSelectedAccent(value);
      localStorage.setItem('sage-accent', value);
      if (value === 'amber') {
        document.documentElement.removeAttribute('data-accent');
      } else {
        document.documentElement.setAttribute('data-accent', value);
      }
      saveSettings({ appearance: { theme: theme, accent: value } });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (e) {
      toast.error("Logout failed");
    }
  };

  const handleUnlinkTelegram = async () => {
    setUnlinkLoading(true);
    try {
      await unlinkTelegram();
      setTelegramLinked(false);
      toast.success("Telegram disconnected successfully");
    } catch {
      toast.error("Failed to disconnect Telegram");
    }
    setUnlinkLoading(false);
  };

  const getTelegramLink = () => {
    if (!userId) return "#";
    return `https://t.me/SageAssistantmeBot?start=${userId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <section.icon className={cn(
                      "w-5 h-5",
                      activeSection === section.id && "text-primary"
                    )} />
                    {section.label}
                    {activeSection === section.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-3 space-y-6"
        >
          {/* Profile Section */}
          {activeSection === "profile" && (
            <>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                  <CardDescription>Update your personal details and profile picture.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-primary">{user?.name?.charAt(0) || "U"}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">Managed by Google OAuth</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={user?.name || ""} disabled className="bg-secondary/50 border-border text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email || ""} disabled className="bg-secondary/50 border-border text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Connected Accounts</CardTitle>
                  <CardDescription>Manage your connected services and integrations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        <Globe className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Google Workspace</p>
                        <p className="text-xs text-muted-foreground">Calendar & Gmail access connected</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-border text-emerald-500" disabled>Connected</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#229ED9] flex items-center justify-center shadow-sm">
                        <span className="text-white text-lg">✈</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Telegram</p>
                        <p className="text-xs text-muted-foreground">
                          {telegramLinked 
                            ? "✅ Connected — receive briefings & send commands" 
                            : "Get daily briefings and control Sage from Telegram"}
                        </p>
                      </div>
                    </div>
                    {telegramLinked ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleUnlinkTelegram}
                        disabled={unlinkLoading}
                      >
                        {unlinkLoading ? "Unlinking..." : "Disconnect"}
                      </Button>
                    ) : (
                      <Button asChild size="sm" className="bg-[#229ED9] hover:bg-[#1a8bc4] text-white">
                        <a href={getTelegramLink()} target="_blank" rel="noopener noreferrer">
                          Connect Telegram →
                        </a>
                      </Button>
                    )}
                  </div>
                  {!telegramLinked && (
                    <p className="text-xs text-muted-foreground px-1">
                      Click Connect, then tap Start in Telegram to link your account.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified by Sage.</CardDescription>
                  </div>
                  {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Daily Briefing Email</p>
                        <p className="text-xs text-muted-foreground">Receive your morning summary via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Push Notifications</p>
                        <p className="text-xs text-muted-foreground">Receive real-time alerts</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Task & Bill Reminders</p>
                        <p className="text-xs text-muted-foreground">Get reminded before due dates</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.reminders}
                      onCheckedChange={(checked) => handleNotificationChange("reminders", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <>
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Theme</CardTitle>
                      <CardDescription>Select your preferred visual mode.</CardDescription>
                    </div>
                    {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {themeOptions.map((themeOption) => (
                      <button
                        key={themeOption.id}
                        onClick={() => handleAppearanceChange("theme", themeOption.id)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-lg border transition-all",
                          theme === themeOption.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                          <themeOption.icon className={cn("w-6 h-6", theme === themeOption.id ? "text-primary" : "text-foreground")} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{themeOption.label}</span>
                        {theme === themeOption.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Accent Color</CardTitle>
                  <CardDescription>Choose your highlight color.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 p-2 flex-wrap">
                    {accentColors.map((accent) => (
                      <button
                        key={accent.id}
                        onClick={() => handleAppearanceChange("accent", accent.id)}
                        className={cn(
                          "w-12 h-12 rounded-full transition-all flex items-center justify-center shadow-sm",
                          selectedAccent === accent.id
                            ? "ring-4 ring-offset-4 ring-offset-background ring-foreground scale-110"
                            : "hover:scale-110 opacity-80 hover:opacity-100"
                        )}
                        style={{ backgroundColor: accent.hex }}
                        title={accent.label}
                      >
                        {selectedAccent === accent.id && <Check className="w-5 h-5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Privacy Section */}
          {activeSection === "privacy" && (
            <>
              <Card className="bg-card border-border border-destructive/20 overflow-hidden">
                <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />
                <CardHeader className="relative z-10">
                  <CardTitle className="text-lg text-destructive flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Actions
                  </CardTitle>
                  <CardDescription>Manage your session or permanently remove data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Sign Out</p>
                        <p className="text-xs text-muted-foreground">End your current session on this device</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>Log Out</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20 mt-4">
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Delete Account</p>
                        <p className="text-xs text-muted-foreground text-destructive/80">Permanently delete your account and all data</p>
                      </div>
                    </div>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
