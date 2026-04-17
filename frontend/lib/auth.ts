export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("sage_token");
}

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sage_token", token);
  }
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("sage_token");
  }
}

export function handleOAuthCallback(router: any): void {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      saveToken(token);
      router.push("/dashboard");
    }
  }
}
