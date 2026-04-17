"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Clock,
  Flag,
  Filter,
  Search,
  Bell,
  Repeat,
  ChevronRight,
  Star,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  dueDate: string;
  category: string;
  starred: boolean;
  recurring?: boolean;
}

const initialTasks: Task[] = [
  { id: 1, title: "Review Q4 budget proposal", completed: false, priority: "high", dueDate: "Today", category: "Work", starred: true },
  { id: 2, title: "Send weekly report to team", completed: false, priority: "medium", dueDate: "Today", category: "Work", starred: false },
  { id: 3, title: "Schedule dentist appointment", completed: false, priority: "low", dueDate: "Tomorrow", category: "Personal", starred: false },
  { id: 4, title: "Prepare presentation slides", completed: false, priority: "high", dueDate: "Tomorrow", category: "Work", starred: true },
  { id: 5, title: "Review pull requests", completed: true, priority: "medium", dueDate: "Today", category: "Work", starred: false },
  { id: 6, title: "Update project documentation", completed: true, priority: "low", dueDate: "Yesterday", category: "Work", starred: false },
  { id: 7, title: "Gym workout", completed: false, priority: "medium", dueDate: "Today", category: "Health", starred: false, recurring: true },
  { id: 8, title: "Read 30 minutes", completed: false, priority: "low", dueDate: "Today", category: "Personal", starred: false, recurring: true },
];

const reminders = [
  { id: 1, title: "Team standup in 30 minutes", time: "9:00 AM", type: "meeting" },
  { id: 2, title: "Submit expense report", time: "5:00 PM", type: "deadline" },
  { id: 3, title: "Call mom", time: "7:00 PM", type: "personal" },
  { id: 4, title: "Take medication", time: "9:00 PM", type: "health", recurring: true },
];

const categories = ["All", "Work", "Personal", "Health"];
const priorities = ["All", "High", "Medium", "Low"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const toggleStar = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, starred: !task.starred } : task
    ));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now(),
      title: newTaskTitle,
      completed: false,
      priority: "medium",
      dueDate: "Today",
      category: "Work",
      starred: false,
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
  };

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = selectedCategory === "All" || task.category === selectedCategory;
    const matchesPriority = selectedPriority === "All" || task.priority === selectedPriority.toLowerCase();
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesPriority && matchesSearch;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

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
          <p className="text-muted-foreground">{completedCount} of {totalCount} tasks completed today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-border">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
                  >
                    {priorities.map(pri => (
                      <option key={pri} value={pri}>{pri}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Task Input */}
              <div className="flex items-center gap-3 p-3 mb-4 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="Add a new task..."
                  className="border-0 bg-transparent p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
                />
                {newTaskTitle && (
                  <Button size="sm" onClick={addTask} className="bg-primary text-primary-foreground">
                    Add
                  </Button>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="group flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          task.completed ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {task.dueDate}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            {task.category}
                          </span>
                          {task.recurring && (
                            <Repeat className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          task.priority === "high" && "bg-destructive/20 text-destructive",
                          task.priority === "medium" && "bg-primary/20 text-primary",
                          task.priority === "low" && "bg-muted text-muted-foreground"
                        )}>
                          {task.priority}
                        </span>
                        <button
                          onClick={() => toggleStar(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Star className={cn(
                            "w-4 h-4",
                            task.starred ? "text-primary fill-primary" : "text-muted-foreground"
                          )} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reminders Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Today's Reminders */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Today&apos;s Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reminders.map((reminder, index) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{reminder.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{reminder.time}</span>
                      {reminder.recurring && <Repeat className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Flag className="w-5 h-5 text-primary" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed Today</span>
                <span className="text-sm font-medium text-foreground">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium text-foreground">{totalCount - completedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High Priority</span>
                <span className="text-sm font-medium text-destructive">
                  {tasks.filter(t => t.priority === "high" && !t.completed).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Starred</span>
                <span className="text-sm font-medium text-primary">
                  {tasks.filter(t => t.starred).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
