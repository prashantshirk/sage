"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Target,
  CheckCircle2,
  Trash2,
  Loader2,
  Calendar,
  PieChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getExpenses, getFinanceSummary, createExpense, markExpensePaid, deleteExpense } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  subscription: "bg-blue-500",
  bill: "bg-rose-500",
  emi: "bg-purple-500",
  utility: "bg-amber-500",
  other: "bg-emerald-500"
};

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState({ monthly_total: 0, overdue_count: 0, due_soon_count: 0 });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("bill");
  const [newDueDate, setNewDueDate] = useState("");

  const fetchData = async () => {
    try {
      const [expensesData, summaryData] = await Promise.all([
        getExpenses(),
        getFinanceSummary()
      ]);
      setExpenses(expensesData.expenses || []);
      setStats({
        monthly_total: expensesData.monthly_total || 0,
        overdue_count: expensesData.overdue_count || 0,
        due_soon_count: expensesData.due_soon_count || 0
      });
      setSummary(summaryData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAmount || !newDueDate) return;

    setIsSubmitting(true);
    try {
      await createExpense({
        name: newName,
        amount: parseFloat(newAmount),
        category: newCategory,
        due_date: newDueDate,
      });
      toast.success("Expense added successfully");
      setIsAddModalOpen(false);
      
      // Reset form
      setNewName("");
      setNewAmount("");
      setNewCategory("bill");
      setNewDueDate("");
      
      // Refresh data
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markExpensePaid(id);
      toast.success("Marked as paid");
      fetchData();
    } catch (e) {
      toast.error("Failed to mark as paid");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete expense");
    }
  };

  const totalBalance = stats.monthly_total;

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
          <h1 className="text-2xl font-bold text-foreground">Finance Tracker</h1>
          <p className="text-muted-foreground">Monitor your spending and upcoming bills.</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all hover:scale-[1.02]">
              <DollarSign className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddExpense} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Expense Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Netflix Subscription" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newCategory} 
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="bill">Bill</option>
                  <option value="subscription">Subscription</option>
                  <option value="emi">EMI</option>
                  <option value="utility">Utility</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} required />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-card border-border overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-primary/5 pointer-events-none" />
          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Total Monthly Expenses</p>
                {loading ? (
                  <div className="h-10 w-48 bg-secondary animate-pulse rounded-md" />
                ) : (
                  <p className="text-4xl font-extrabold text-foreground tracking-tight">
                    ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 text-sm text-rose-500 font-medium">
                    <TrendingUp className="w-4 h-4" />
                    Unpaid Balance
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-center bg-secondary/50 p-3 rounded-lg min-w-[100px]">
                  <p className="text-2xl font-bold text-destructive">{loading ? "-" : stats.overdue_count}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Overdue</p>
                </div>
                <div className="text-center bg-secondary/50 p-3 rounded-lg min-w-[100px]">
                  <p className="text-2xl font-bold text-amber-500">{loading ? "-" : stats.due_soon_count}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-1">Due Soon</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Expenses & Bills
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary animate-pulse rounded-lg" />)}
                </div>
              ) : expenses.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No expenses tracked yet.</p>
                  <p className="text-sm">Click "Add Expense" or tell Sage.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {expenses.map((expense) => {
                      const isPaid = expense.status === "paid";
                      const isOverdue = expense.status === "overdue";
                      
                      return (
                        <motion.div
                          key={expense._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPaid ? 'bg-emerald-500/10' : isOverdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                              {isPaid ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Calendar className={`w-5 h-5 ${isOverdue ? 'text-destructive' : 'text-primary'}`} />}
                            </div>
                            <div>
                              <p className={cn("text-sm font-medium", isPaid && "text-muted-foreground line-through")}>
                                {expense.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {expense.due_date ? new Date(expense.due_date).toLocaleDateString() : 'No date'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-semibold">
                                  {expense.category || 'other'}
                                </span>
                                {isOverdue && !isPaid && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive uppercase font-bold tracking-wider">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "text-sm font-bold tracking-tight",
                              isPaid ? "text-muted-foreground" : "text-foreground"
                            )}>
                              ${expense.amount.toFixed(2)}
                            </span>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isPaid && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer" onClick={() => handleMarkPaid(expense._id)}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => handleDelete(expense._id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-24 bg-secondary animate-pulse rounded" />
                        <div className="h-2 bg-secondary animate-pulse rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : summary?.by_category && Object.keys(summary.by_category).length > 0 ? (
                  <div className="space-y-5">
                    {Object.entries(summary.by_category)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .map(([category, amount]: [string, any], index) => {
                        const percent = totalBalance > 0 ? (amount / totalBalance) * 100 : 0;
                        const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
                        
                        return (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground capitalize tracking-wide">{category}</span>
                              <span className="text-sm font-semibold text-muted-foreground">
                                ${amount.toFixed(2)} <span className="text-xs font-normal opacity-70">({percent.toFixed(0)}%)</span>
                              </span>
                            </div>
                            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colorClass} transition-all duration-1000 ease-out`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </motion.div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No data to visualize.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* This Week's Focus */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="bg-card border-border border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  Due This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-foreground">
                    ${loading ? "..." : (summary?.due_this_week?.amount || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">
                    across {loading ? "-" : summary?.due_this_week?.count || 0} bills
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
