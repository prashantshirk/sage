"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  CheckCircle2,
  XCircle,
  X,
  CheckSquare,
  DollarSign,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { processNaturalLanguage, getSuggestions, getTodaysTasks, getExpenses } from "@/lib/api";

export default function AskSagePage() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; action?: string; data?: any } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [suggestionsRes, tasksRes, expensesRes] = await Promise.all([
          getSuggestions().catch(() => ({ suggestions: [] })),
          getTodaysTasks().catch(() => []),
          getExpenses().catch(() => [])
        ]);
        
        if (suggestionsRes && suggestionsRes.suggestions) {
          setSuggestions(suggestionsRes.suggestions);
        }
        
        setRecentTasks((Array.isArray(tasksRes) ? tasksRes : []).slice(0, 5));
        setRecentExpenses((Array.isArray(expensesRes) ? expensesRes : []).slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setResult(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    try {
      const res = await processNaturalLanguage(inputText);
      setResult(res);
      setInputText("");
      
      const [tasksRes, expensesRes] = await Promise.all([
        getTodaysTasks().catch(() => []),
        getExpenses().catch(() => [])
      ]);
      setRecentTasks((Array.isArray(tasksRes) ? tasksRes : []).slice(0, 5));
      setRecentExpenses((Array.isArray(expensesRes) ? expensesRes : []).slice(0, 5));
    } catch (e: any) {
      setResult({
        success: false,
        message: e.message || "Failed to process request."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          Ask Sage
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Tell me what to track, add, or remind you about.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <Card className="border-border shadow-lg bg-card/50 backdrop-blur">
          <CardContent className="p-6 space-y-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 500))}
              placeholder="e.g. Netflix is due tomorrow, ₹649 — add it as a reminder"
              className="resize-none text-lg min-h-[120px] bg-secondary/50 border-transparent focus-visible:ring-primary"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                {inputText.length} / 500
              </span>
              <Button 
                onClick={handleSubmit} 
                disabled={!inputText.trim() || isLoading}
                size="lg"
                className="gap-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-md transition-all hover:scale-105"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send to Sage
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative bg-primary/10 p-4 rounded-full">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-primary font-medium animate-pulse">Sage is processing your request...</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isLoading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <Card className={result.success ? "border-green-500/30 bg-green-500/5 relative" : "border-red-500/30 bg-red-500/5 relative"}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-muted-foreground hover:bg-black/5"
                onClick={() => setResult(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {result.success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-4 flex-1">
                    <p className={`text-lg font-medium ${result.success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      {result.message}
                    </p>
                    
                    {result.success && result.action === "add_expense" && result.data && (
                      <div className="bg-background/80 rounded-lg p-3 border border-green-500/20 max-w-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{result.data.name || result.data.title}</p>
                            <p className="text-xs text-muted-foreground">{result.data.due_date}</p>
                          </div>
                        </div>
                        <p className="font-bold">₹{result.data.amount}</p>
                      </div>
                    )}
                    
                    {result.success && result.action === "add_task" && result.data && (
                      <div className="bg-background/80 rounded-lg p-3 border border-green-500/20 max-w-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <CheckSquare className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{result.data.title}</p>
                            <p className="text-xs text-muted-foreground">{result.data.category || "reminder"}</p>
                          </div>
                        </div>
                        {result.data.due_date && <p className="text-xs font-medium bg-secondary px-2 py-1 rounded">{result.data.due_date}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-foreground">Try saying...</h3>
        {loadingInitial ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-48 bg-secondary animate-pulse rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(suggestion)}
                className="px-4 py-2 rounded-full text-sm bg-secondary/60 hover:bg-primary hover:text-primary-foreground transition-colors border border-border hover:border-transparent cursor-pointer text-left"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="space-y-4 pt-4 border-t border-border"
      >
        <h3 className="text-lg font-semibold text-foreground">Recent additions via Sage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Tasks
            </h4>
            {loadingInitial ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary animate-pulse rounded-lg" />)
            ) : recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tasks recently added.</p>
            ) : (
              recentTasks.map((task, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                  <div className={`mt-0.5 w-4 h-4 rounded border ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase">{task.category || 'task'}</span>
                      {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Expenses & Bills
            </h4>
            {loadingInitial ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary animate-pulse rounded-lg" />)
            ) : recentExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No expenses recently added.</p>
            ) : (
              recentExpenses.map((exp, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exp.name || exp.title}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase">{exp.category || 'expense'}</span>
                      <span className="text-xs font-semibold">₹{exp.amount}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
