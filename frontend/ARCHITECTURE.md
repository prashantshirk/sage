# Sage Frontend - Comprehensive Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Core Routes & Pages](#core-routes--pages)
6. [Components Architecture](#components-architecture)
7. [Data Flow Architecture](#data-flow-architecture)
8. [Features Overview](#features-overview)
9. [UI/UX Framework](#uiux-framework)
10. [Styling System](#styling-system)
11. [Key Workflows](#key-workflows)
12. [Component Inventory](#component-inventory)

---

## System Overview

**Sage** is an intelligent life operating system - a comprehensive productivity dashboard designed to centralize and simplify daily workflows. The application brings together scheduling, task management, financial tracking, and command execution in a single elegant interface.

### Core Mission
Organize and streamline user productivity by providing:
- **Daily Briefing**: Personalized schedule and weather overview
- **Task Management**: Smart reminders and task tracking
- **Finance Tracking**: Account monitoring and budget management
- **Command Center**: Quick access to all tools and documents
- **Settings & Customization**: User preferences and integrations

### Key Characteristics
- **Dark Theme First**: Modern dark-mode UI with customizable accent colors
- **Real-time Interactivity**: React 19.2.4 with client-side state management
- **Responsive Design**: Mobile-first approach using Tailwind CSS
- **Smooth Animations**: Framer Motion for delightful user experiences
- **Component Library**: Radix UI primitives for accessibility
- **Type Safe**: Full TypeScript support

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SAGE FRONTEND APPLICATION                      │
│                    (Next.js 16.2.0 + React 19.2.4)                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    ROUTING LAYER (Next.js App Router)                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /                    /dashboard               /dashboard/*          │
│  ↓                    ↓                        ↓                     │
│ Landing Page    Dashboard Layout      Sub-pages (Layout Wrapper)   │
│                       ↓                        ↓                     │
│                   Dashboard Page      • Overview /                  │
│                                       • Tasks    /tasks             │
│                                       • Finance  /finance           │
│                                       • Command  /command           │
│                                       • Settings /settings          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│               PRESENTATION LAYER (Components & Hooks)                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │         Global UI Components (50+ Radix-based)              │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ • Button        • Card          • Dialog      • Sidebar      │    │
│  │ • Input         • Label         • Toast       • Drawer       │    │
│  │ • Select        • Tabs          • Dropdown    • Popover      │    │
│  │ • Checkbox      • Radio         • Progress    • Accordion    │    │
│  │ • Switch        • Slider        • Badge       • Tooltip      │    │
│  │ • Calendar      • DatePicker    • Carousel    • Navigation   │    │
│  │ • Form          • Textarea      • InputOTP    • Context Menu │    │
│  │ • Table         • Separator     • AspectRatio • HoverCard    │    │
│  │ • ScrollArea    • Resizable     • AlertDialog • Sonner Toast │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │            Page-Specific Components & Hooks                 │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ Hooks:                                                       │    │
│  │ • use-toast      - Toast notifications                      │    │
│  │ • use-mobile     - Mobile device detection                  │    │
│  │                                                              │    │
│  │ Context:                                                    │    │
│  │ • ThemeProvider  - Theme switching (dark/light/system)      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                 STATE MANAGEMENT LAYER                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  • React State (useState)              - Component-level state      │
│  • Task Filtering & Sorting            - Client-side              │
│  • User Preferences                    - Local state              │
│  • Notification Management             - Sonner toast system      │
│  • Theme Context                       - next-themes              │
│                                                                      │
│  Note: Currently client-side only. Ready for backend integration   │
│        via API calls (e.g., fetch/axios)                          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                  STYLING LAYER                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  • Tailwind CSS 4.2.0      - Utility-first styling               │
│  • CSS Variables           - Color palette system                │
│  • Dark Mode Support       - Built-in dark theme                │
│  • Responsive Grid         - Mobile-first design                │
│  • Custom Utilities        - gradient-text, glass, glow effects │
│  • PostCSS 8.5             - CSS processing                     │
│                                                                      │
│  Colors:                                                            │
│  • Primary (Amber)    - Main accent (#d4a855)                     │
│  • Foreground         - Text on primary                           │
│  • Background         - Page background                           │
│  • Card               - Card backgrounds                          │
│  • Muted              - Disabled/secondary                        │
│  • Destructive        - Delete/error actions                     │
│  • Sidebar variants   - Sidebar-specific colors                  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                   ANIMATION LAYER                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Framer Motion 12.38.0                                              │
│                                                                      │
│  • Fade in/out animations      - On page load                     │
│  • Scale transitions           - Hover effects                    │
│  • Slide animations            - Component entrance               │
│  • Layout animations           - Active indicator                 │
│  • AnimatePresence             - Exit animations                  │
│  • Staggered animations        - Sequential item renders          │
│  • WhileInView                 - Scroll-triggered                 │
│                                                                      │
│  Timings:                                                           │
│  • 0.3s - Fast transitions                                        │
│  • 0.4s - Standard page animations                                │
│  • 0.6s - Slower hero animations                                  │
│  • Stagger delay - 0.05-0.1s between items                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    UTILITIES & HELPERS                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  • lib/utils.ts     - cn() utility (clsx + tailwind-merge)        │
│  • Lucide Icons     - 564+ icon library                           │
│  • date-fns         - Date formatting & manipulation              │
│  • Recharts         - Chart components (ready for use)            │
│  • React Hook Form  - Form handling & validation                  │
│  • Zod              - Schema validation                           │
│  • Class Variance   - Dynamic CSS classes                         │
│  • Embla Carousel   - Carousel functionality                      │
│  • Vaul             - Drawer animations                           │
└──────────────────────────────────────────────────────────────────────┘

```

---

## Project Structure

```
FRONTEND/
├── app/                          # Next.js App Router (14+ structure)
│   ├── layout.tsx                # Root layout with metadata & fonts
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global styles & Tailwind directives
│   └── dashboard/                # Dashboard namespace
│       ├── layout.tsx            # Dashboard layout (sidebar + header)
│       ├── page.tsx              # Dashboard overview (/dashboard)
│       ├── tasks/
│       │   └── page.tsx          # Tasks & reminders page
│       ├── finance/
│       │   └── page.tsx          # Finance tracker page
│       ├── command/
│       │   └── page.tsx          # Command center page
│       └── settings/
│           └── page.tsx          # Settings & preferences page
│
├── components/                   # React components
│   ├── ui/                       # UI component library (50+ components)
│   │   ├── button.tsx            # Base button component
│   │   ├── card.tsx              # Card container
│   │   ├── input.tsx             # Text input
│   │   ├── dialog.tsx            # Modal dialog
│   │   ├── sidebar.tsx           # Sidebar
│   │   ├── dropdown-menu.tsx     # Dropdown menu
│   │   ├── badge.tsx             # Badge/label
│   │   ├── progress.tsx          # Progress bar
│   │   ├── switch.tsx            # Toggle switch
│   │   ├── tabs.tsx              # Tab interface
│   │   ├── toast.tsx             # Toast notifications
│   │   ├── toaster.tsx           # Toast container
│   │   ├── use-toast.ts          # Toast hook
│   │   ├── sonner.tsx            # Sonner toast integration
│   │   ├── calendar.tsx          # Date picker
│   │   ├── select.tsx            # Select dropdown
│   │   ├── form.tsx              # Form wrapper
│   │   ├── label.tsx             # Form label
│   │   ├── textarea.tsx          # Text area
│   │   ├── [30+ more UI components...]
│   │
│   └── theme-provider.tsx        # Theme context provider
│
├── hooks/                        # Custom React hooks
│   ├── use-toast.ts              # Toast notification hook
│   └── use-mobile.ts             # Mobile detection hook
│
├── lib/                          # Utilities & helpers
│   └── utils.ts                  # cn() function for class merging
│
├── styles/                       # Global styles (typically empty if using Tailwind)
│   └── [global.css in app/]      # CSS variables, custom utilities
│
├── public/                       # Static assets
│   └── [images, favicons, etc]
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.mjs            # PostCSS configuration
├── components.json               # ShadcN component registry
├── pnpm-lock.yaml                # Locked dependencies (pnpm)
└── .gitignore                    # Git ignore rules
```

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.0 | React framework with App Router |
| **React** | 19.2.4 | UI library & component model |
| **React DOM** | 19.2.4 | React rendering engine |
| **TypeScript** | 5.7.3 | Type safety & IDE support |

### UI & Component Library
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Radix UI** | Latest | Headless UI primitives (30+ components) |
| **Tailwind CSS** | 4.2.0 | Utility-first CSS framework |
| **Lucide React** | 0.564.0 | Icon library (564+ icons) |
| **Class Variance Authority** | 0.7.1 | CSS class variants system |
| **Tailwind Merge** | 3.3.1 | Smart class merging |
| **clsx** | 2.1.1 | Class name utilities |

### Animation & Interaction
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Framer Motion** | 12.38.0 | React animation library |
| **Embla Carousel** | 8.6.0 | Carousel/slider component |
| **React Resizable Panels** | 2.1.7 | Resizable panel layout |
| **Vaul** | 1.1.2 | Drawer/dialog animations |

### Forms & Validation
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React Hook Form** | 7.54.1 | Form state management |
| **Hook Form Resolvers** | 3.9.1 | Form validation adapters |
| **Zod** | 3.24.1 | Schema validation |

### Date & Time
| Technology | Version | Purpose |
|-----------|---------|---------|
| **date-fns** | 4.1.0 | Date manipulation & formatting |
| **React Day Picker** | 9.13.2 | Date picker component |

### Visualization
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Recharts** | 2.15.0 | Chart components (bar, line, pie, etc) |

### Notifications & UI
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Sonner** | 1.7.1 | Beautiful toast notifications |
| **Next Themes** | 0.4.6 | Theme switching support |

### Other Utilities
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Input OTP** | 1.4.2 | OTP input field |
| **cmdk** | 1.1.1 | Command/search menu |
| **Autoprefixer** | 10.4.20 | CSS vendor prefixes |
| **PostCSS** | 8.5 | CSS processing |
| **Vercel Analytics** | 1.6.1 | Analytics tracking |

---

## Core Routes & Pages

### Route Hierarchy

```
/                                    (Landing Page)
├── GET  /                          → page.tsx (LandingPage component)
│
└── /dashboard/*                    (Dashboard Namespace)
    ├── GET  /dashboard             → dashboard/page.tsx (DashboardPage)
    ├── GET  /dashboard/tasks       → dashboard/tasks/page.tsx (TasksPage)
    ├── GET  /dashboard/finance     → dashboard/finance/page.tsx (FinancePage)
    ├── GET  /dashboard/command     → dashboard/command/page.tsx (CommandCenterPage)
    └── GET  /dashboard/settings    → dashboard/settings/page.tsx (SettingsPage)
```

### Page Specifications

#### 1. **Landing Page** (`/`)
**File**: `app/page.tsx`

**Purpose**: Marketing/onboarding page showcasing Sage

**Key Sections**:
- Navigation bar with logo & CTA buttons
- Hero section with animated headline
- Feature cards (Daily Briefing, Command Center, Finance, Smart Reminders)
- Benefits section (Lightning Fast, Privacy First, Works Everywhere)
- Call-to-action section
- Footer

**Technologies**: Framer Motion (animations), Lucide icons, motion variants

**State**: None (static page)

---

#### 2. **Dashboard Overview** (`/dashboard`)
**File**: `app/dashboard/page.tsx`

**Purpose**: Daily briefing and productivity snapshot

**Key Components**:
- Header with greeting & weather widget
- Quick stats cards (3 columns):
  - Tasks Completed (12/18)
  - Meetings Today (4)
  - Focus Time (4.5h)
- Today's Schedule card (upcoming events with time & type)
- Today's Tasks card with progress bar & priority badges
- AI Insight card with recommendation engine

**State Management**:
```typescript
const upcomingEvents = [...]  // Static data
const todaysTasks = [...]     // Static data with completion status
const taskProgress = (completed/total) * 100  // Computed
const greeting = currentHour-based logic      // Time-based
```

**Interactions**: View-only display with hover effects

---

#### 3. **Tasks & Reminders** (`/dashboard/tasks`)
**File**: `app/dashboard/tasks/page.tsx`

**Purpose**: Task management, filtering, and reminders

**Key Features**:
- Task list with filtering (category, priority, search)
- Task operations:
  - Add new task (input + Enter/button)
  - Toggle completion (checkbox)
  - Star/favorite tasks
  - Delete tasks
- Real-time search across task titles
- Category filtering (All, Work, Personal, Health)
- Priority filtering (All, High, Medium, Low)
- Today's Reminders sidebar (4 items)
- Quick Stats sidebar (completed, pending, high-priority, starred)

**State Management**:
```typescript
const [tasks, setTasks] = useState<Task[]>(initialTasks)
const [selectedCategory, setSelectedCategory] = useState("All")
const [selectedPriority, setSelectedPriority] = useState("All")
const [searchQuery, setSearchQuery] = useState("")
const [newTaskTitle, setNewTaskTitle] = useState("")

interface Task {
  id: number
  title: string
  completed: boolean
  priority: "high" | "medium" | "low"
  dueDate: string
  category: string
  starred: boolean
  recurring?: boolean
}
```

**Key Interactions**:
- Staggered animations (AnimatePresence) on task list
- Hover actions for star/delete visibility
- Instant filtering feedback
- Add task with keyboard Enter support

---

#### 4. **Finance Tracker** (`/dashboard/finance`)
**File**: `app/dashboard/finance/page.tsx`

**Purpose**: Financial overview, budgets, and savings tracking

**Key Features**:
- Total Balance display with trend indicator
- Accounts Grid (4 cards):
  - Main Checking ($12,450)
  - Savings ($45,200)
  - Investment ($28,750)
  - Credit Card (-$1,240)
- Recent Transactions list (income/expense)
- Monthly Budgets with progress bars
- Savings Goals with progress tracking
- Transaction icons & color coding (green for income, red for expense)

**State Management**:
```typescript
const accounts = [...]        // Account data with balances
const recentTransactions = [] // Transaction history
const budgets = [...]         // Budget limits & spent amounts
const savingsGoals = [...]    // Goals with current/target values
const totalBalance = accounts.reduce(...)  // Computed
```

**Data Visualization**: Progress bars with color-coded categories

---

#### 5. **Command Center** (`/dashboard/command`)
**File**: `app/dashboard/command/page.tsx`

**Purpose**: Quick access hub for all tools and documents

**Key Features**:
- Search bar (search all documents & tools)
- Quick Actions (6 buttons):
  - New Event (⌘E)
  - Compose Email (⌘M)
  - New Document (⌘D)
  - Open Files (⌘O)
  - New Message (⌘N)
  - Start Meeting (⌘V)
- Recent Items section (5 items with timestamps)
- Bookmarks section (4 quick links)
- Tools section (Calculator, Timer, Focus Music, Clipboard)

**State Management**:
```typescript
const [searchQuery, setSearchQuery] = useState("")
// Static data for quick actions, recent items, bookmarks, tools
```

**Interactions**: Click items, keyboard shortcuts display, hover states

---

#### 6. **Settings & Preferences** (`/dashboard/settings`)
**File**: `app/dashboard/settings/page.tsx`

**Purpose**: User account and application preferences

**Sections**:
1. **Profile Section**:
   - Avatar display & change
   - First/Last Name fields
   - Email field
   - Timezone selector
   - Connected Accounts (Google, Bank via Plaid)

2. **Notifications Section**:
   - Email Notifications toggle
   - Push Notifications toggle
   - Task Reminders toggle
   - Marketing Emails toggle

3. **Appearance Section**:
   - Theme selection (Dark, Light, System)
   - Accent color picker (Amber, Blue, Green, Purple, Red)

4. **Privacy & Security Section**:
   - Password management
   - Two-Factor Authentication
   - Danger Zone (Delete Account)

**State Management**:
```typescript
const [activeSection, setActiveSection] = useState("profile")
const [selectedTheme, setSelectedTheme] = useState("dark")
const [selectedAccent, setSelectedAccent] = useState("amber")
const [notifications, setNotifications] = useState({
  email: true,
  push: true,
  reminders: true,
  marketing: false,
})
```

**UI Pattern**: Sidebar navigation with tabbed content area

---

## Components Architecture

### UI Component Library (50+ Components)

The application uses a comprehensive Radix UI-based component library. All components are in `components/ui/`:

#### Form Components
- **Button** (`button.tsx`) - Primary, secondary, outline, ghost variants
- **Input** (`input.tsx`) - Text input with focus states
- **Label** (`label.tsx`) - Form label
- **Textarea** (`textarea.tsx`) - Multi-line text input
- **Select** (`select.tsx`) - Dropdown selector
- **Checkbox** (`checkbox.tsx`) - Checkbox input
- **Radio Group** (`radio-group.tsx`) - Radio button group
- **Switch** (`switch.tsx`) - Toggle switch
- **Form** (`form.tsx`) - React Hook Form wrapper

#### Container Components
- **Card** (`card.tsx`) - Container with header/content/footer
- **Dialog** (`dialog.tsx`) - Modal overlay
- **Drawer** (`drawer.tsx`) - Slide-out panel
- **Popover** (`popover.tsx`) - Floating popover
- **Sheet** (`sheet.tsx`) - Off-canvas sheet
- **Sidebar** (`sidebar.tsx`) - Sidebar navigation

#### Data Display
- **Table** (`table.tsx`) - Data table
- **Badge** (`badge.tsx`) - Small label/tag
- **Progress** (`progress.tsx`) - Progress bar
- **Carousel** (`carousel.tsx`) - Image carousel
- **Skeleton** (`skeleton.tsx`) - Loading placeholder

#### Navigation & Menu
- **Menubar** (`menubar.tsx`) - Top menu bar
- **Dropdown Menu** (`dropdown-menu.tsx`) - Dropdown actions
- **Navigation Menu** (`navigation-menu.tsx`) - Navigation links
- **Tabs** (`tabs.tsx`) - Tab interface
- **Breadcrumb** (`breadcrumb.tsx`) - Navigation breadcrumb
- **Pagination** (`pagination.tsx`) - Page navigation

#### Input Specializations
- **Calendar** (`calendar.tsx`) - Date picker calendar
- **Input OTP** (`input-otp.tsx`) - OTP input field
- **Input Group** (`input-group.tsx`) - Grouped inputs
- **Slider** (`slider.tsx`) - Range slider
- **Toggle** (`toggle.tsx`) - Button toggle
- **Toggle Group** (`toggle-group.tsx`) - Grouped toggles

#### Feedback & Information
- **Toast** (`toast.tsx`) - Toast notification
- **Toaster** (`toaster.tsx`) - Toast container
- **Alert** (`alert.tsx`) - Alert message
- **Alert Dialog** (`alert-dialog.tsx`) - Confirmation dialog
- **Tooltip** (`tooltip.tsx`) - Hover tooltip
- **Hover Card** (`hover-card.tsx`) - Hover information card

#### Utilities
- **Separator** (`separator.tsx`) - Visual divider
- **Scroll Area** (`scroll-area.tsx`) - Custom scrollbar
- **Resizable** (`resizable.tsx`) - Resizable panels
- **Aspect Ratio** (`aspect-ratio.tsx`) - Fixed aspect ratio
- **Command** (`command.tsx`) - Command/search palette
- **Context Menu** (`context-menu.tsx`) - Right-click menu
- **Empty** (`empty.tsx`) - Empty state
- **Chart** (`chart.tsx`) - Chart wrapper (Recharts)
- **Spinner** (`spinner.tsx`) - Loading spinner
- **KBD** (`kbd.tsx`) - Keyboard key display

#### Hooks
- **use-toast** - Toast notification hook
- **use-mobile** - Mobile device detection

### Theme Provider

**File**: `components/theme-provider.tsx`

```typescript
export const ThemeProvider = ({ children }) => {
  // Wraps application with next-themes
  // Supports: dark, light, system
  // Persists theme preference to localStorage
}
```

**Usage**: Applied at root layout level

---

## Data Flow Architecture

### Component-Level Data Flow

```
Page Component
    ↓
State (useState)
    ↓
Event Handlers
    ↓
State Update
    ↓
Re-render with new state
    ↓
Child Components (via props)
    ↓
UI Updates
```

### Dashboard Overview Data Flow

```
DashboardPage Component
├── Local computed state
│   ├── currentHour → greeting (time-based)
│   ├── completedTasks → taskProgress (percentage)
│   └── Static data arrays
│
├── Render Quick Stats
│   └── Display metrics cards (static)
│
├── Render Schedule & Tasks
│   ├── Loop upcomingEvents array
│   ├── Loop todaysTasks array
│   └── Apply animations per item
│
└── Render AI Insight
    └── Static recommendation card
```

### Tasks Page Data Flow

```
TasksPage Component
├── State Management
│   ├── tasks (Task[])
│   ├── selectedCategory (string)
│   ├── selectedPriority (string)
│   ├── searchQuery (string)
│   └── newTaskTitle (string)
│
├── Event Handlers
│   ├── toggleTask(id) → setTasks (mark complete/incomplete)
│   ├── toggleStar(id) → setTasks (favorite/unfavorite)
│   ├── deleteTask(id) → setTasks (remove from array)
│   └── addTask() → setTasks (prepend new task)
│
├── Filtering Logic
│   └── filteredTasks = tasks.filter(
│       matchesCategory && matchesPriority && matchesSearch
│     )
│
├── Render Left Panel (Tasks)
│   ├── Search bar (updateSearchQuery)
│   ├── Category selector (updateSelectedCategory)
│   ├── Priority selector (updateSelectedPriority)
│   ├── Add task input (updateNewTaskTitle, addTask)
│   └── Task list (AnimatePresence + motion.div)
│       └── For each filteredTask:
│           ├── Checkbox (toggleTask)
│           ├── Title & metadata
│           ├── Star button (toggleStar)
│           └── Delete button (deleteTask)
│
└── Render Right Panel (Sidebar)
    ├── Today's Reminders (static)
    └── Quick Stats (computed from tasks array)
```

### Finance Page Data Flow

```
FinancePage Component
├── State Management (none - all static data)
│   ├── accounts (Account[])
│   ├── recentTransactions (Transaction[])
│   ├── budgets (Budget[])
│   └── savingsGoals (SavingsGoal[])
│
├── Computed Values
│   └── totalBalance = accounts.reduce((sum, acc) => sum + acc.balance)
│
├── Render Sections
│   ├── Total Balance Card
│   │   ├── Display totalBalance
│   │   └── Show trend vs last month
│   │
│   ├── Accounts Grid (4 columns)
│   │   └── For each account:
│   │       ├── Account name & balance
│   │       └── Trend indicator (+ or -)
│   │
│   ├── Recent Transactions (2-column layout)
│   │   └── For each transaction:
│   │       ├── Icon (income/expense color)
│   │       ├── Name, category, date
│   │       └── Amount display
│   │
│   ├── Monthly Budgets
│   │   └── For each budget:
│   │       ├── Category name
│   │       ├── Spent/Limit display
│   │       └── Progress bar (width = spent/limit)
│   │
│   └── Savings Goals
│       └── For each goal:
│           ├── Icon & name
│           ├── Progress bar
│           └── Current/Target display
```

---

## Features Overview

### 1. Daily Briefing

**Location**: Dashboard Overview page

**Components**:
- Greeting message (time-aware: Good morning/afternoon/evening)
- Weather widget (72°F with cloud icon)
- Date display (Mon, Jan 15)
- Quick stats (3 cards)
- Schedule preview (4 upcoming events)
- Task summary (completed vs total with progress)
- AI insight recommendation

**Interactions**: View-only, read information

**Data Source**: Static mock data (ready for API integration)

---

### 2. Task Management

**Location**: Tasks & Reminders page (`/dashboard/tasks`)

**Features**:
- **Create Tasks**: Add new tasks via input field or Enter key
- **Task States**:
  - Completed/Incomplete toggle (checkbox)
  - Starred/Unfavorited (star icon)
  - Priority levels (High/Medium/Low)
  - Categories (Work/Personal/Health)
  - Due dates
  - Recurring tasks indicator
- **Filtering**:
  - By category (All/Work/Personal/Health)
  - By priority (All/High/Medium/Low)
  - By search query (real-time)
- **Task Display**:
  - Staggered entrance animation
  - Completion status (strikethrough for completed)
  - Hover actions (star, delete)
  - Priority color coding
  - Category tags
  - Date display
- **Reminders**:
  - Today's reminders list
  - Reminder time & type
  - Recurring indicators

**Data Model**:
```typescript
interface Task {
  id: number                              // Unique identifier
  title: string                           // Task name
  completed: boolean                      // Completion status
  priority: "high" | "medium" | "low"    // Priority level
  dueDate: string                         // Due date string (e.g., "Today")
  category: string                        // Category (Work, Personal, Health)
  starred: boolean                        // Favorite flag
  recurring?: boolean                     // Optional recurring indicator
}
```

**Quick Stats**:
- Completed Today
- Pending tasks
- High-priority uncompleted
- Starred tasks count

---

### 3. Finance Tracking

**Location**: Finance page (`/dashboard/finance`)

**Features**:
- **Account Overview**:
  - Display total balance
  - Trend vs last month
  - Individual account cards with balances
  - Percentage changes per account
- **Transactions**:
  - Recent transaction list
  - Transaction type (income/expense)
  - Category classification
  - Transaction date
  - Amount display (color-coded)
  - Icon indicators (up arrow = income, down arrow = expense)
- **Budgets**:
  - Monthly spending limits
  - Category-based budgets
  - Spent vs limit display
  - Visual progress bar
  - Color-coded by category
- **Savings Goals**:
  - Goal name
  - Current savings amount
  - Target amount
  - Progress percentage
  - Progress bar visualization
  - Goal-specific icons

**Quick Actions**:
- Add Transaction button
- Withdraw button
- Deposit button

**Data Model**:
```typescript
interface Account {
  name: string              // Account name
  balance: number           // Current balance
  change: number            // Percentage change
  icon: IconComponent       // React component icon
}

interface Transaction {
  name: string              // Payee/description
  amount: number            // Transaction amount
  category: string          // Category
  date: string              // Date string
}

interface Budget {
  category: string          // Budget category
  spent: number             // Amount spent
  limit: number             // Budget limit
  color: string             // Tailwind color class
}

interface SavingsGoal {
  name: string              // Goal name
  current: number           // Current savings
  target: number            // Target amount
  icon: IconComponent       // Goal icon
}
```

---

### 4. Command Center

**Location**: Command Center page (`/dashboard/command`)

**Features**:
- **Global Search**:
  - Search placeholder: "Search everything... (⌘K)"
  - Real-time search across actions, documents
- **Quick Actions** (6 buttons):
  - New Event (⌘E) - Calendar
  - Compose Email (⌘M) - Mail
  - New Document (⌘D) - Document
  - Open Files (⌘O) - Folder
  - New Message (⌘N) - Chat
  - Start Meeting (⌘V) - Video
  - Each with keyboard shortcut display
- **Recent Items**:
  - Q4 Budget Report.xlsx (2 hours ago)
  - Weekly Team Sync (Yesterday)
  - Re: Project Update (Yesterday)
  - Product Roadmap 2024.pdf (2 days ago)
  - Client Presentation Recording (3 days ago)
  - Item type indicators
  - Timestamp display
- **Bookmarks**:
  - Company Dashboard
  - Project Management
  - Design System
  - Documentation
  - Quick link tiles
- **Tools** (4 items):
  - Calculator (Quick calculations)
  - Timer (Focus & pomodoro)
  - Focus Music (Ambient sounds)
  - Clipboard (History manager)
  - Tool description text

**Interactions**:
- Click to open items
- Hover animations
- Keyboard shortcut badges
- Search functionality (static UI ready for API)

---

### 5. Settings & Customization

**Location**: Settings page (`/dashboard/settings`)

**Profile Settings**:
- Profile photo with change option
- First name, Last name inputs
- Email input
- Timezone selector
- Connected accounts display (Google, Bank)

**Notification Settings**:
- Email Notifications toggle
- Push Notifications toggle
- Task Reminders toggle
- Marketing Emails toggle
- Each with description

**Appearance Settings**:
- Theme selector (Dark/Light/System)
  - Visual theme preview
  - Selected indicator
- Accent color picker (5 colors):
  - Amber (default)
  - Blue
  - Green
  - Purple
  - Red
  - Ring indicator on selected

**Privacy & Security**:
- Password change button
- Two-Factor Authentication enable
- Delete Account (danger zone)

**State Management**:
```typescript
const [activeSection, setActiveSection] = useState("profile")
const [selectedTheme, setSelectedTheme] = useState("dark")
const [selectedAccent, setSelectedAccent] = useState("amber")
const [notifications, setNotifications] = useState({
  email: true,
  push: true,
  reminders: true,
  marketing: false,
})
```

---

### 6. Sidebar Navigation

**Location**: Dashboard Layout (`app/dashboard/layout.tsx`)

**Features**:
- **Navigation Items** (5 main links):
  - Overview (LayoutDashboard icon) → `/dashboard`
  - Command (Command icon) → `/dashboard/command`
  - Finance (DollarSign icon) → `/dashboard/finance`
  - Tasks (CheckSquare icon) → `/dashboard/tasks`
  - Settings (Settings icon) → `/dashboard/settings`
- **Active State Indicator**:
  - Dot indicator on active item
  - Background highlight
  - Icon color change
  - Smooth animation with layoutId
- **User Section**:
  - Avatar with initials (JD)
  - User name (John Doe)
  - Email (john@example.com)
  - Clickable profile area
- **Logo Section**:
  - Sage logo with icon
  - Clickable to return home
- **Mobile Responsive**:
  - Hamburger menu on mobile
  - Sidebar slides in from left
  - Overlay dismisses sidebar
  - Close button on sidebar

**Responsive Design**:
- Desktop: Fixed sidebar on left
- Mobile: Hidden by default, toggleable via hamburger menu
- Tablet: Collapsible sidebar

---

### 7. Top Header Bar

**Location**: Dashboard Layout header

**Features**:
- **Left Section**:
  - Mobile menu toggle (hamburger)
  - Search bar (Search... with icon)
  - Search bar width: 64 characters on desktop
  - Hidden on mobile (shown via hamburger)
- **Right Section**:
  - Notification bell icon
  - Red dot indicator (unread notifications)
  - Hover states

**Styling**:
- Glass morphism effect
- Sticky positioning (top: 0)
- z-index: 30 (above content, below mobile sidebar overlay)
- Semi-transparent backdrop blur

---

## UI/UX Framework

### Design System

#### Color Palette

**Primary Colors**:
- **Primary (Amber)**: `#d4a855` - Main brand color, buttons, accents
- **Foreground**: Text on primary
- **Primary Foreground**: Text on primary background

**Neutral Colors**:
- **Background**: Page background (dark)
- **Card**: Card backgrounds
- **Secondary**: Input backgrounds, muted cards
- **Muted**: Disabled, secondary text

**Semantic Colors**:
- **Destructive**: Delete, error, warning actions (red)
- **Chart colors**: Multi-color set (chart-1 through chart-5)

**Component-Specific**:
- **Sidebar colors**: sidebar-foreground, sidebar-accent, sidebar-primary, sidebar-border

#### Typography

**Font Stack**:
```css
--font-geist-sans: Geist font family (Google Fonts)
--font-geist-mono: Geist Mono font family (Google Fonts)
```

**Base Styles**:
- Font: `font-sans` (Geist)
- Antialiasing: `antialiased`
- Size: Responsive text sizes

**Heading Styles**:
- H1: `text-5xl md:text-7xl` - Hero headlines
- H2: `text-3xl md:text-4xl` - Section titles
- H3: `text-2xl` - Card titles
- Body: `text-sm` to `text-lg` - Content

#### Spacing

**Scale** (Tailwind):
- 2px: `px-0.5`, `py-0.5`
- 4px: `px-1`, `py-1`
- 8px: `px-2`, `py-2`
- 12px: `px-3`, `py-3`
- 16px: `px-4`, `py-4`
- 24px: `px-6`, `py-6`
- 32px: `px-8`, `py-8`

#### Border Radius

**Preset**:
- Small: `rounded-lg` (8px)
- Medium: `rounded-xl` (12px)
- Large: `rounded-2xl` (16px)
- Full: `rounded-full` (50%)

#### Shadows

**Tailwind Defaults**:
- `shadow-sm` - Card hover
- `shadow-md` - Elevated elements
- `shadow-lg` - Modals
- Custom glow effects via CSS

#### Effects

**Custom Utilities** (in `globals.css`):
- `.glass` - Glass morphism effect
- `.glow-amber` - Amber glow
- `.glow-amber-sm` - Small amber glow
- `.gradient-text` - Gradient text effect
- `.tw-animate-` - Custom animations

### Responsive Design

**Breakpoints** (Tailwind):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Grid Layouts**:
- **1 column** (mobile)
- **2 columns** (tablet): `md:grid-cols-2`
- **3 columns** (desktop): `lg:grid-cols-3`
- **4 columns** (wide): `lg:grid-cols-4`

**Component Responsiveness**:
- Buttons: Stack on mobile, row on desktop
- Sidebars: Hidden on mobile, show on lg
- Grids: Adjust columns based on screen size
- Modals: Full height on mobile, centered on desktop

### Accessibility

**Radix UI Integration**:
- Semantic HTML
- ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly

**Implemented**:
- Proper heading hierarchy
- Alt text for icons (via title)
- Label associations (htmlFor)
- Keyboard shortcuts (⌘K, ⌘E, etc.)
- Skip links (potential)

---

## Styling System

### CSS Architecture

**Location**: `app/globals.css`

**Structure**:
```css
/* 1. Tailwind Directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 2. CSS Variables (for Tailwind theming) */
:root {
  --primary: ...;
  --foreground: ...;
  /* All color variables */
}

/* 3. Custom Utilities */
.glass {
  /* Glass morphism */
}

.glow-amber {
  /* Amber glow effect */
}

.gradient-text {
  /* Gradient text */
}

/* 4. Animation definitions */
@keyframes ... {
  /* Custom keyframes */
}
```

### Tailwind Configuration

**File**: `tailwind.config.ts`

**Key Customizations**:
- Custom color palette (primary, sidebar colors)
- Custom utilities (glass, glow, gradient-text)
- Dark mode (default enabled)
- Extended animation definitions

### PostCSS Configuration

**File**: `postcss.config.mjs`

**Plugins**:
1. **Tailwind CSS** - Utility-first styling
2. **Autoprefixer** - Vendor prefixes

---

## Key Workflows

### 1. User Landing Flow

```
User visits /
    ↓
LandingPage component loads
    ↓
Animated hero section appears
    ↓
Features showcase with stagger animation
    ↓
Benefits section (scroll-triggered animation)
    ↓
CTA section
    ↓
User clicks "Open Dashboard" or "Get Started"
    ↓
Navigate to /dashboard
```

### 2. Task Management Workflow

```
User navigates to /dashboard/tasks
    ↓
TasksPage component loads
    ↓
Display filtered tasks (initial: all tasks)
    ↓
User types in search bar
    ↓
filteredTasks re-computed
    ↓
Task list updates with animation
    ↓
User clicks task checkbox
    ↓
toggleTask(id) called
    ↓
tasks state updated
    ↓
Checkbox icon changes
    ↓
Task title gets strikethrough if completed
    ↓
Stats sidebar updates (completed count)
```

### 3. Finance Overview Workflow

```
User navigates to /dashboard/finance
    ↓
FinancePage component loads
    ↓
totalBalance computed from accounts
    ↓
Display total balance card
    ↓
Render account cards with animations
    ↓
Display transaction list
    ↓
Display budget progress bars
    ↓
Display savings goals
    ↓
All animations stagger from 0.3s delay
```

### 4. Settings Configuration Workflow

```
User navigates to /dashboard/settings
    ↓
SettingsPage component loads
    ↓
activeSection = "profile" (default)
    ↓
Render settings sidebar
    ↓
User clicks "Appearance" in sidebar
    ↓
activeSection = "appearance"
    ↓
Profile section hidden, appearance section shown
    ↓
User clicks theme option
    ↓
selectedTheme state updated
    ↓
Theme option highlighted
    ↓
User selects accent color
    ↓
selectedAccent state updated
    ↓
Ring indicator on selected color
```

### 5. Search & Filter Workflow

```
User types in search input
    ↓
searchQuery state updated
    ↓
Render callback:
    filteredTasks = tasks.filter(task =>
      (selectedCategory === "All" || task.category === selectedCategory) &&
      (selectedPriority === "All" || task.priority === selectedPriority) &&
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    ↓
Filtered results displayed with animation
    ↓
Each item animates in with stagger delay
```

### 6. Mobile Navigation Workflow

```
User on mobile device
    ↓
DashboardLayout detects mobile
    ↓
Sidebar hidden (-translate-x-full)
    ↓
Hamburger menu visible
    ↓
User clicks hamburger
    ↓
sidebarOpen = true
    ↓
Mobile overlay appears
    ↓
Sidebar slides in from left
    ↓
User clicks nav item or overlay
    ↓
sidebarOpen = false
    ↓
Sidebar slides out
```

---

## Component Inventory

### Page Components (6)

| Component | File | Route | Purpose |
|-----------|------|-------|---------|
| LandingPage | `app/page.tsx` | `/` | Marketing/onboarding |
| DashboardLayout | `app/dashboard/layout.tsx` | `/dashboard/*` | Main dashboard shell |
| DashboardPage | `app/dashboard/page.tsx` | `/dashboard` | Daily briefing |
| TasksPage | `app/dashboard/tasks/page.tsx` | `/dashboard/tasks` | Task management |
| FinancePage | `app/dashboard/finance/page.tsx` | `/dashboard/finance` | Finance tracking |
| CommandCenterPage | `app/dashboard/command/page.tsx` | `/dashboard/command` | Quick access hub |
| SettingsPage | `app/dashboard/settings/page.tsx` | `/dashboard/settings` | User preferences |

### Layout Components (2)

| Component | File | Purpose |
|-----------|------|---------|
| RootLayout | `app/layout.tsx` | Global app shell, metadata |
| DashboardLayout | `app/dashboard/layout.tsx` | Dashboard sidebar + header |

### UI Component Library (50+)

**Form Components**:
- Button, Input, Label, Textarea, Select, Checkbox, Radio Group, Switch, Form

**Container Components**:
- Card, Dialog, Drawer, Popover, Sheet, Sidebar

**Data Display**:
- Table, Badge, Progress, Carousel, Skeleton

**Navigation**:
- Menubar, Dropdown Menu, Navigation Menu, Tabs, Breadcrumb, Pagination

**Input Specializations**:
- Calendar, Input OTP, Input Group, Slider, Toggle, Toggle Group

**Feedback**:
- Toast, Toaster, Alert, Alert Dialog, Tooltip, Hover Card

**Utilities**:
- Separator, Scroll Area, Resizable, Aspect Ratio, Command, Context Menu, Empty, Chart, Spinner, KBD

### Custom Hooks (2)

| Hook | File | Purpose |
|------|------|---------|
| use-toast | `hooks/use-toast.ts` | Toast notifications |
| use-mobile | `hooks/use-mobile.ts` | Mobile detection |

### Providers (1)

| Provider | File | Purpose |
|----------|------|---------|
| ThemeProvider | `components/theme-provider.tsx` | Theme context (next-themes) |

### Utility Functions (1)

| Utility | File | Purpose |
|---------|------|---------|
| cn() | `lib/utils.ts` | Class merging (clsx + tailwind-merge) |

---

## Integration Points & Future Enhancements

### Ready for Backend Integration

1. **API Layer**:
   - Replace static data with fetch/axios calls
   - Add error handling
   - Loading states

2. **State Management**:
   - Consider Context API or Redux for complex state
   - Server state with SWR or React Query

3. **Authentication**:
   - Add login/auth flow
   - Protected routes
   - Session management

4. **Real-time Features**:
   - WebSocket for live updates
   - Server-Sent Events (SSE)

5. **Database Models Needed**:
   ```
   User
   ├── Profile (name, email, avatar)
   ├── Preferences (theme, notifications, timezone)
   └── Accounts (linked services)
   
   Task
   ├── Title, description
   ├── Priority, category
   ├── Due date
   ├── Completion status
   └── User ID (foreign key)
   
   Transaction
   ├── Amount, type
   ├── Category, description
   ├── Date
   └── User ID (foreign key)
   
   Account
   ├── Name, balance
   ├── Type (checking, savings, etc.)
   └── User ID (foreign key)
   
   SavingsGoal
   ├── Name, target amount
   ├── Current progress
   └── User ID (foreign key)
   ```

### Performance Optimization Opportunities

1. **Code Splitting**: Lazy load dashboard sub-pages
2. **Image Optimization**: Use Next.js Image component
3. **Caching**: Implement ISR for static content
4. **Monitoring**: Integrate Vercel Analytics
5. **Bundle Analysis**: Use `@next/bundle-analyzer`

### Testing Strategy

1. **Unit Tests**: Component rendering, state logic
2. **Integration Tests**: Page workflows
3. **E2E Tests**: User journeys (Cypress/Playwright)

---

## Summary

**Sage** is a modern, fully-featured productivity dashboard built with Next.js 16, React 19, and Tailwind CSS. The architecture emphasizes:

- **Component-Driven**: 50+ reusable UI components
- **Type Safety**: Full TypeScript support
- **Responsive Design**: Mobile-first approach
- **Smooth Animations**: Framer Motion throughout
- **User-Centric**: Intuitive navigation and interactions
- **Scalability**: Ready for backend integration
- **Accessibility**: Radix UI primitives for standards compliance

The codebase is well-organized, maintainable, and ready for production deployment and future enhancements.

---

## Quick Start Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

**Development Server**: http://localhost:3000

---

**Document Generated**: 2026-04-17
**Application**: Sage - Intelligent Life Operating System
**Version**: 0.1.0
**Status**: Ready for Development & Deployment
