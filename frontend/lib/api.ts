const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("sage_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiCall(method: string, endpoint: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: getAuthHeaders(),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

// 2. Auth functions
export async function getGoogleLoginUrl() {
  return apiCall("GET", "/auth/google/login");
}

export async function getCurrentUser() {
  return apiCall("GET", "/auth/me");
}

export async function updateCurrentUser(data: any) {
  return apiCall("PATCH", "/auth/me", data);
}

export async function logout() {
  const res = await apiCall("POST", "/auth/logout");
  if (typeof window !== "undefined") {
    localStorage.removeItem("sage_token");
  }
  return res;
}

// 3. NLP functions
export async function processNaturalLanguage(input: string, imageBase64?: string, mimeType?: string) {
  return apiCall("POST", "/api/nlp/process", { input, image_base64: imageBase64, mime_type: mimeType });
}

export async function getSuggestions() {
  return apiCall("GET", "/api/nlp/suggestions");
}

// 4. Task functions
export async function getTodaysTasks() {
  return apiCall("GET", "/api/tasks/today");
}

export async function getUpcomingTasks(days: number = 7) {
  return apiCall("GET", `/api/tasks/upcoming?days=${days}`);
}

export async function createTask(data: any) {
  return apiCall("POST", "/api/tasks/", data);
}

export async function updateTaskStatus(taskId: string, status: "completed" | "pending" | "overdue") {
  return apiCall("PATCH", `/api/tasks/${taskId}/status`, { status });
}

export async function deleteTask(taskId: string) {
  return apiCall("DELETE", `/api/tasks/${taskId}`);
}

export async function syncCalendar() {
  return apiCall("POST", "/api/tasks/sync-calendar");
}

// 5. Finance functions
export async function getExpenses(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiCall("GET", `/api/finance/${query}`);
}

export async function getFinanceSummary() {
  return apiCall("GET", "/api/finance/summary");
}

export async function createExpense(data: any) {
  return apiCall("POST", "/api/finance/", data);
}

export async function markExpensePaid(expenseId: string) {
  return apiCall("PATCH", `/api/finance/${expenseId}/pay`);
}

export async function deleteExpense(expenseId: string) {
  return apiCall("DELETE", `/api/finance/${expenseId}`);
}

// 6. Briefing functions
export async function getDailyBriefing() {
  return apiCall("GET", "/api/briefing/daily");
}

export async function getEmailActionItems() {
  return apiCall("GET", "/api/briefing/email-items");
}

// 7. Streak functions
export async function getStreak() {
  return apiCall("GET", "/api/streak/");
}

export async function submitDailyProgress(tasks_total: number, tasks_completed: number) {
  return apiCall("POST", "/api/streak/submit", { tasks_total, tasks_completed });
}

export async function getStreakHistory() {
  return apiCall("GET", "/api/streak/history");
}
