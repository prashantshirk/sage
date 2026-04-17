"use client";

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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const upcomingEvents = [
  { time: "09:00", title: "Team Standup", type: "meeting" },
  { time: "11:30", title: "Client Call - Project Review", type: "call" },
  { time: "14:00", title: "Design Review", type: "meeting" },
  { time: "16:00", title: "1:1 with Manager", type: "meeting" },
];

const todaysTasks = [
  { title: "Review Q4 budget proposal", completed: true, priority: "high" },
  { title: "Send weekly report", completed: true, priority: "medium" },
  { title: "Update project documentation", completed: false, priority: "medium" },
  { title: "Prepare presentation slides", completed: false, priority: "high" },
  { title: "Review pull requests", completed: false, priority: "low" },
];

const quickStats = [
  { label: "Tasks Completed", value: "12/18", trend: "+3 today" },
  { label: "Meetings Today", value: "4", trend: "2 remaining" },
  { label: "Focus Time", value: "4.5h", trend: "+30min vs avg" },
];

export default function DashboardPage() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const completedTasks = todaysTasks.filter(t => t.completed).length;
  const taskProgress = (completedTasks / todaysTasks.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-foreground">{greeting}, John</h1>
          <p className="text-muted-foreground">Here&apos;s your daily briefing for today.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
            <Sun className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">72°F</span>
            <Cloud className="w-4 h-4 text-muted-foreground" />
          </div>
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
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Today&apos;s Schedule
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="text-sm font-mono text-muted-foreground w-14">{event.time}</div>
                  <div className="w-1 h-8 rounded-full bg-primary/50" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{event.type}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

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
                <span className="text-sm text-muted-foreground">{completedTasks}/{todaysTasks.length} done</span>
              </div>
              <Progress value={taskProgress} className="h-1.5 mt-2" />
            </CardHeader>
            <CardContent className="space-y-2">
              {todaysTasks.map((task, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                  )}
                  <span className={`text-sm flex-1 ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {task.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.priority === "high" 
                      ? "bg-destructive/20 text-destructive" 
                      : task.priority === "medium"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {task.priority}
                  </span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insight Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="bg-card border-border overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
            <CardContent className="p-6 relative">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Daily Insight</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your schedule, you have a 2-hour focus block between 12:00-14:00. 
                    Consider tackling your high-priority presentation slides during this time for maximum productivity.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="flex-shrink-0">
                  Apply Suggestion
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
