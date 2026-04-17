"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Flag,
  Flame,
  CheckSquare,
  Award,
  Loader2,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTodaysTasks, getUpcomingTasks, updateTaskStatus, getStreak, getStreakHistory, submitDailyProgress } from "@/lib/api";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [todaysTasks, setTodaysTasks] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any>({ tomorrow: [], this_week: [], next_week: [] });
  const [streakData, setStreakData] = useState<any>({ current_streak: 0, best_streak: 0 });
  const [streakHistory, setStreakHistory] = useState<any[]>([]);

  const fetchAllData = async () => {
    try {
      const [todayRes, upcomingRes, streakRes, historyRes] = await Promise.all([
        getTodaysTasks().catch(() => []),
        getUpcomingTasks().catch(() => ({ tomorrow: [], this_week: [], next_week: [] })),
        getStreak().catch(() => ({ current_streak: 0, best_streak: 0 })),
        getStreakHistory().catch(() => [])
      ]);
      setTodaysTasks(Array.isArray(todayRes) ? todayRes : []);
      setUpcomingTasks(upcomingRes);
      setStreakData(streakRes);
      setStreakHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    
    // Optimistic update
    setTodaysTasks(prev => 
      prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t)
    );
    
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (e) {
      // Revert on error
      setTodaysTasks(prev => 
        prev.map(t => t._id === taskId ? { ...t, status: currentStatus } : t)
      );
      toast.error("Failed to update task status.");
    }
  };

  const handleProgressSubmit = async () => {
    setSubmitting(true);
    const completedCount = todaysTasks.filter(t => t.status === "completed").length;
    try {
      const res = await submitDailyProgress(todaysTasks.length, completedCount);
      toast.success(`Progress submitted! Streak: ${res.current_streak} 🔥`);
      
      // Refresh streak data
      const [streakRes, historyRes] = await Promise.all([
        getStreak().catch(() => streakData),
        getStreakHistory().catch(() => streakHistory)
      ]);
      setStreakData(streakRes);
      setStreakHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit progress");
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = todaysTasks.filter(t => t.status === "completed").length;
  const totalCount = todaysTasks.length;
  const progressPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  // Ensure history is a 35 day array
  const heatmapCells = Array(35).fill(null).map((_, i) => {
    if (i < streakHistory.length) return streakHistory[i];
    return { completed: false, date: "" };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks & Reminders</h1>
          <p className="text-muted-foreground">Manage your daily priorities and long-term goals.</p>
        </div>
        <div className="flex bg-secondary p-1 rounded-lg">
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('today')}
          >
            Today
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'upcoming' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {activeTab === "today" && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    Today&apos;s Tasks
                  </CardTitle>
                  <span className="text-sm font-medium text-muted-foreground">{completedCount} / {totalCount} Completed</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-secondary animate-pulse rounded-lg" />)}
                  </div>
                ) : todaysTasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No tasks scheduled for today.</p>
                    <p className="text-sm">Use &quot;Ask Sage&quot; to add new tasks.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {todaysTasks.map((task, index) => (
                        <motion.div
                          key={task._id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className="group flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/60 transition-colors"
                        >
                          <button onClick={() => handleToggleTask(task._id, task.status)} className="flex-shrink-0 cursor-pointer">
                            {task.status === "completed" ? (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : (
                              <Circle className={`w-5 h-5 transition-colors ${task.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground hover:text-primary'}`} />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate transition-colors",
                              task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {task.due_time && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.due_time}
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-semibold">
                                {task.category || 'reminder'}
                              </span>
                            </div>
                          </div>
                          {task.status === "overdue" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive flex-shrink-0">
                              Overdue
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                
                {!loading && todaysTasks.length > 0 && (
                  <Button 
                    className="w-full mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-md transition-all hover:scale-[1.02]" 
                    onClick={handleProgressSubmit}
                    disabled={submitting || completedCount === 0}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Flame className="w-4 h-4 mr-2" />}
                    Submit Daily Progress
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "upcoming" && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2].map(i => (
                      <div key={i} className="space-y-3">
                        <div className="h-5 w-24 bg-secondary animate-pulse rounded" />
                        <div className="h-12 bg-secondary animate-pulse rounded-lg" />
                        <div className="h-12 bg-secondary animate-pulse rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {Object.entries(upcomingTasks).map(([groupKey, groupTasks]: [string, any]) => {
                      if (!groupTasks || groupTasks.length === 0) return null;
                      
                      const groupTitle = groupKey.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
                      
                      return (
                        <div key={groupKey} className="space-y-3">
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{groupTitle}</h3>
                          <div className="space-y-2">
                            {groupTasks.map((task: any) => (
                              <div key={task._id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{task.due_date} {task.due_time && `• ${task.due_time}`}</p>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-semibold">
                                  {task.category || 'reminder'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {(!upcomingTasks.tomorrow?.length && !upcomingTasks.this_week?.length && !upcomingTasks.next_week?.length) && (
                      <div className="py-8 text-center text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No upcoming tasks found.</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Gamification Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Streak Card */}
          <Card className="bg-card border-border overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5 z-0" />
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Productivity Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-foreground">{loading ? "-" : streakData?.current_streak || 0}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase mt-1">Current Streak</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-foreground">{loading ? "-" : streakData?.best_streak || 0}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase mt-1">Best Streak</p>
                </div>
              </div>

              {/* Heatmap Grid (35 days = 5 weeks) */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Last 35 Days</p>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                {loading ? (
                  <div className="grid grid-cols-7 gap-1">
                    {Array(35).fill(0).map((_, i) => <div key={i} className="aspect-square bg-secondary rounded-sm animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {heatmapCells.map((day, i) => (
                      <div 
                        key={i} 
                        className={`aspect-square rounded-sm transition-colors ${day?.completed ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-secondary'}`}
                        title={day?.date ? new Date(day.date).toLocaleDateString() : 'No data'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
