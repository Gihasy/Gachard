const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function googleLogin(token: string) {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
}
