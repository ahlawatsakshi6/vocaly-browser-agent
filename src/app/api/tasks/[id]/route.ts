import { NextResponse } from "next/server";

const API_ROOT = "https://api.browser-use.com/api/v2";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function apiHeaders(includeContentType = false) {
  return {
    "X-Browser-Use-API-Key": process.env.BROWSER_USE_API_KEY ?? "",
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
  };
}

async function safeJson(response: Response) {
  return response.json().catch(() => null);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!process.env.BROWSER_USE_API_KEY) return NextResponse.json({ error: "Browser Use is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });

  try {
    const taskResponse = await fetch(`${API_ROOT}/tasks/${id}`, { headers: apiHeaders(), cache: "no-store" });
    const task = await safeJson(taskResponse);
    if (!taskResponse.ok || !task) return NextResponse.json({ error: task?.detail ?? "Unable to load task." }, { status: taskResponse.status });

    let liveUrl: string | null = null;
    let recordingUrl: string | null = null;
    if (task.sessionId) {
      const sessionResponse = await fetch(`${API_ROOT}/sessions/${task.sessionId}`, { headers: apiHeaders(), cache: "no-store" });
      if (sessionResponse.ok) {
        const session = await safeJson(sessionResponse);
        liveUrl = session?.liveUrl ?? null;
        recordingUrl = session?.recordingUrl ?? null;
      }
    }

    return NextResponse.json({ ...task, liveUrl, recordingUrl });
  } catch {
    return NextResponse.json({ error: "Unable to reach the browser agent." }, { status: 502 });
  }
}

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!process.env.BROWSER_USE_API_KEY) return NextResponse.json({ error: "Browser Use is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid task ID." }, { status: 400 });

  try {
    const response = await fetch(`${API_ROOT}/tasks/${id}`, {
      method: "PATCH",
      headers: apiHeaders(true),
      body: JSON.stringify({ action: "stop_task_and_session" }),
      cache: "no-store",
    });
    const data = await safeJson(response);
    if (!response.ok) return NextResponse.json({ error: data?.detail ?? "Unable to stop task." }, { status: response.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unable to stop the browser agent." }, { status: 502 });
  }
}
