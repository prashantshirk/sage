"use client";

import { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  Paperclip,
  ImageIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { processNaturalLanguage, getSuggestions, getTodaysTasks, getExpenses } from "@/lib/api";
import { toast } from "sonner";

export default function AskSagePage() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; action?: string; data?: any } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && 
       ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      setVoiceSupported(true);
    }
  }, []);

  const startVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Use default browser language instead of hardcoding en-IN which can cause network errors
    recognition.lang = window.navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error("Speech recognition error:", event.error, event);
      if (event.error === "not-allowed") {
        toast.error("Microphone permission denied. Please allow mic access in your browser.");
      } else if (event.error === "no-speech") {
        // Continuous mode might throw no-speech if quiet for too long
        // toast.error("No speech detected. Try again.");
      } else if (event.error === "network") {
        toast.error("Network error: If using Brave, Speech API is blocked. Also ensure you are using localhost or HTTPS.");
      } else {
        toast.error(`Voice input failed (${event.error}). Try again.`);
      }
    };

    recognition.onresult = (event: any) => {
      let newTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        newTranscript += event.results[i][0].transcript;
      }
      setInputText(prev => prev + (prev ? " " : "") + newTranscript.trim());
    };

    recognition.start();
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      const mimeType = base64String.match(/data:(.*?);/)?.[1] || "image/jpeg";
      const base64Data = base64String.split(',')[1];
      setImageBase64(base64Data);
      setImageMimeType(mimeType);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImageBase64(null);
    setImageMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (overrideText?: string) => {
    const textToSend = typeof overrideText === "string" ? overrideText : inputText;
    
    if (!textToSend.trim() && !imageBase64) {
      toast.error("Please enter something first.");
      return;
    }
    
    setIsLoading(true);
    setResult(null);
    try {
      const res = await processNaturalLanguage(textToSend.trim(), imageBase64 || undefined, imageMimeType || undefined);
      setResult(res);
      setInputText("");
      setSelectedFile(null);
      setImageBase64(null);
      setImageMimeType(null);
      
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
            {isListening && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                Listening... speak now
              </div>
            )}
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
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <span className="text-sm text-muted-foreground font-medium">
                  {inputText.length} / 500
                </span>
                
                {selectedFile && (
                  <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                    <button onClick={clearFile} className="hover:text-primary/70 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={startVoiceInput}
                    disabled={isLoading}
                    className={`
                      relative flex items-center justify-center
                      h-10 w-10 rounded-full border transition-all duration-200
                      ${isListening 
                        ? "bg-red-500 border-red-500 text-white animate-pulse shadow-lg shadow-red-500/40" 
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }
                    `}
                    title={isListening ? "Tap to stop" : "Tap to speak"}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="18" height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                    </svg>
                    {isListening && (
                      <span className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping" />
                    )}
                  </button>
                )}
                <Button 
                  onClick={() => handleSubmit()} 
                  disabled={(!inputText.trim() && !imageBase64) || isLoading}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white shadow-md transition-all hover:scale-105"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Send to Sage
                </Button>
              </div>
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
