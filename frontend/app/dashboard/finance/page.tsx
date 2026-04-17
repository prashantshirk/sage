"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const accounts = [
  { name: "Main Checking", balance: 12450.00, change: +2.4, icon: Wallet },
  { name: "Savings", balance: 45200.00, change: +5.1, icon: PiggyBank },
  { name: "Investment", balance: 28750.00, change: -1.2, icon: TrendingUp },
  { name: "Credit Card", balance: -1240.00, change: 0, icon: CreditCard },
];

const recentTransactions = [
  { name: "Spotify Premium", amount: -9.99, category: "Entertainment", date: "Today" },
  { name: "Salary Deposit", amount: 4500.00, category: "Income", date: "Today" },
  { name: "Amazon Purchase", amount: -67.50, category: "Shopping", date: "Yesterday" },
  { name: "Electric Bill", amount: -125.00, category: "Utilities", date: "Yesterday" },
  { name: "Grocery Store", amount: -89.32, category: "Food", date: "2 days ago" },
  { name: "Freelance Payment", amount: 850.00, category: "Income", date: "3 days ago" },
];

const budgets = [
  { category: "Food & Dining", spent: 420, limit: 600, color: "bg-chart-1" },
  { category: "Shopping", spent: 280, limit: 400, color: "bg-chart-2" },
  { category: "Transportation", spent: 150, limit: 200, color: "bg-chart-3" },
  { category: "Entertainment", spent: 85, limit: 150, color: "bg-chart-4" },
];

const savingsGoals = [
  { name: "Emergency Fund", current: 8500, target: 10000, icon: PiggyBank },
  { name: "Vacation", current: 2400, target: 5000, icon: Target },
  { name: "New Car", current: 12000, target: 30000, icon: CreditCard },
];

export default function FinancePage() {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

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
          <p className="text-muted-foreground">Monitor your spending and savings goals.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <DollarSign className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </motion.div>

      {/* Total Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-card border-border overflow-hidden">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
            <CardContent className="p-6 relative">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
                  <p className="text-4xl font-bold text-foreground">
                    ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-sm text-chart-2">
                      <TrendingUp className="w-4 h-4" />
                      +$1,250.00
                    </div>
                    <span className="text-muted-foreground text-sm">vs last month</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="border-border">
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Accounts Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {accounts.map((account, index) => (
          <motion.div
            key={account.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
          >
            <Card className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <account.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{account.name}</p>
                <p className={`text-xl font-bold ${account.balance < 0 ? "text-destructive" : "text-foreground"}`}>
                  ${Math.abs(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                {account.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${account.change > 0 ? "text-chart-2" : "text-destructive"}`}>
                    {account.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {account.change > 0 ? "+" : ""}{account.change}%
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Recent Transactions
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentTransactions.map((transaction, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      transaction.amount > 0 ? "bg-chart-2/20" : "bg-muted"
                    }`}>
                      {transaction.amount > 0 ? (
                        <ArrowDownRight className="w-4 h-4 text-chart-2" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{transaction.name}</p>
                      <p className="text-xs text-muted-foreground">{transaction.category} • {transaction.date}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    transaction.amount > 0 ? "text-chart-2" : "text-foreground"
                  }`}>
                    {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Budgets & Goals */}
        <div className="space-y-6">
          {/* Monthly Budgets */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Monthly Budgets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {budgets.map((budget, index) => (
                  <motion.div
                    key={budget.category}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">{budget.category}</span>
                      <span className="text-sm text-muted-foreground">
                        ${budget.spent} / ${budget.limit}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${budget.color} rounded-full transition-all`}
                        style={{ width: `${(budget.spent / budget.limit) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Savings Goals */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-primary" />
                  Savings Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {savingsGoals.map((goal, index) => (
                  <motion.div
                    key={goal.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className="p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <goal.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">{goal.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((goal.current / goal.target) * 100)}%
                      </span>
                    </div>
                    <Progress value={(goal.current / goal.target) * 100} className="h-1.5" />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        ${goal.current.toLocaleString()} saved
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ${goal.target.toLocaleString()} goal
                      </span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
