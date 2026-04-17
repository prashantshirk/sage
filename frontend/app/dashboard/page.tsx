"use client";

import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Cloud,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Mail,
  DollarSign,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDailyBriefing } from "@/lib/api";
import { UserContext } from "./layout";

export default function DashboardPage() {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [briefingData, setBriefingData] = useState<any>(null);
  
  // Local state for handled emails
  const [handledEmails, setHandledEmails] = useState<Set<number>>(new Set());

  const fetchBriefing = async () => {
    try {
      const data = await getDailyBriefing();
      setBriefingData(data);
    } catch (e) {
      console.error("Failed to fetch daily briefing", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBriefing();
  };

  const handleEmailAction = (index: number) => {
    setHandledEmails(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  // Data processing safely
  const tasks = briefingData?.tasks_today || [];
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  
  const events = briefingData?.calendar_events || [];
  const expenses = briefingData?.upcoming_expenses || [];
  const actionItems = briefingData?.email_action_items || [];
  const activeActionItems = actionItems.filter((_: any, i: number) => !handledEmails.has(i));

  const quickStats = [
    { label: "Tasks Today", value: tasks.length || 0, trend: `${completedTasks} completed` },
    { label: "Bills Due", value: briefingData?.bills_due_this_week?.count || 0, trend: `₹${briefingData?.bills_due_this_week?.total || 0} total` },
    { label: "Action Items", value: activeActionItems.length, trend: `${handledEmails.size} handled` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">{greeting}, {user?.name ? user.name.split(" ")[0] : "there"}</h1>
          <p className="text-muted-foreground">Here&apos;s your daily briefing for today.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={loading || refreshing}
            className="bg-card border-border gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {loading ? (
                    <div className="h-8 w-16 bg-secondary animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  )}
                </div>
                {!loading && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* AI Briefing Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="bg-card border-border overflow-hidden shadow-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
            <CardContent className="p-6 relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    Sage Briefing
                    {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </h3>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-secondary animate-pulse rounded w-full" />
                      <div className="h-4 bg-secondary animate-pulse rounded w-5/6" />
                      <div className="h-4 bg-secondary animate-pulse rounded w-4/6" />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap h-auto">
                      {briefingData?.briefing_text || "No briefing generated for today."}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Today's Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Today&apos;s Tasks
                  </CardTitle>
                  {!loading && <span className="text-sm text-muted-foreground">{completedTasks}/{tasks.length} done</span>}
                </div>
                {!loading && <Progress value={taskProgress} className="h-1.5 mt-2" />}
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-12 bg-secondary animate-pulse rounded-lg" />)
                ) : tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">No tasks for today.</p>
                ) : (
                  tasks.map((task: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group border border-transparent"
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className={`w-5 h-5 flex-shrink-0 transition-colors ${task.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'}`} />
                      )}
                      <span className={`text-sm flex-1 ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {task.title}
                      </span>
                      {task.status === "overdue" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                          Overdue
                        </span>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Today's Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Today&apos;s Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1, 2].map(i => <div key={i} className="h-12 bg-secondary animate-pulse rounded-lg" />)
                ) : events.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">No events scheduled today.</p>
                ) : (
                  events.map((event: any, index: number) => {
                    const timeStr = new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="text-sm font-mono text-muted-foreground w-16 text-right">
                          {event.start_time.length > 10 ? timeStr : "All Day"}
                        </div>
                        <div className="w-1 h-8 rounded-full bg-primary/50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Action Items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Unread Action Items
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1, 2].map(i => <div key={i} className="h-20 bg-secondary animate-pulse rounded-lg" />)
                ) : activeActionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">Inbox zero! No action items pending.</p>
                ) : (
                  actionItems.map((item: any, index: number) => {
                    if (handledEmails.has(index)) return null;
                    return (
                      <div
                        key={index}
                        className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-medium text-foreground leading-tight">{item.subject}</h4>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                            item.urgency === 'high' ? 'bg-destructive/20 text-destructive' : 
                            item.urgency === 'medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'
                          }`}>
                            {item.urgency}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.summary}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">From: {item.sender_name}</span>
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleEmailAction(index)}>
                            Mark Handled
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Bills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Upcoming Bills
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-12 bg-secondary animate-pulse rounded-lg" />)
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-2">No bills due in the next 7 days.</p>
                ) : (
                  expenses.map((expense: any, index: number) => {
                    let badgeColor = "bg-green-500/20 text-green-500";
                    if (expense.status === "overdue") badgeColor = "bg-destructive/20 text-destructive";
                    else if (expense.status === "due_soon") badgeColor = "bg-amber-500/20 text-amber-500";
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{expense.name}</span>
                          <span className="text-xs text-muted-foreground">{expense.due_date}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-bold">₹{expense.amount}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${badgeColor}`}>
                            {expense.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
