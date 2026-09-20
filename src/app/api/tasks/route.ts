import { NextResponse } from "next/server";

const API_ROOT = "https://api.browser-use.com/api/v2";

function headers() {
  return {
    "X-Browser-Use-API-Key": process.env.BROWSER_USE_API_KEY ?? "",
    "Content-Type": "application/json",
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({ detail: response.statusText }));
  if (!response.ok) {
    const message = typeof body?.detail === "string" ? body.detail : "Browser Use request failed";
    throw new Error(message);
  }
  return body;
}

export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.BROWSER_USE_API_KEY) });
}

export async function POST(request: Request) {
  if (!process.env.BROWSER_USE_API_KEY) {
    return NextResponse.json(
      { error: "Browser Use is not connected. Add BROWSER_USE_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { task?: unknown } | null;
  const task = typeof body?.task === "string" ? body.task.trim() : "";
  if (!task) return NextResponse.json({ error: "Describe a browser task first." }, { status: 400 });
  if (task.length > 4000) return NextResponse.json({ error: "Task is too long." }, { status: 400 });

  try {
    const response = await fetch(`${API_ROOT}/tasks`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        task,
        llm: "browser-use-2.0",
        maxSteps: 60,
        vision: true,
        thinking: true,
        highlightElements: true,
        sessionSettings: {
          browserScreenWidth: 1440,
          browserScreenHeight: 900,
          enableRecording: true,
        },
        metadata: { source: "vocaly-web" },
        systemPromptExtension:
          "You are controlled by a user through a voice-first browser workspace. Complete research, comparison, navigation, and form filling. Never finalize a purchase, submit a booking, send a message, or perform another irreversible action. Stop on the final confirmation screen and clearly ask the user to review and take over.",
      }),
      cache: "no-store",
    });
    const data = await parseResponse(response);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start browser agent." }, { status: 502 });
  }
}
