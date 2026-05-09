import { NextRequest, NextResponse } from "next/server";
import { buildStaticContext, localReply } from "@/lib/assistant";

type ProviderResult = {
  text: string;
  provider: "groq" | "static";
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const requestLog = new Map<string, number[]>();
const responseCache = new Map<string, ProviderResult>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

const SYSTEM_PROMPT = `You are ARIA, the concise AI assistant embedded inside Nishanth Jayaraman's portfolio OS.

Your role:
- Answer questions about Nishanth's background, education, projects, skills, experience, research, and availability
- Be specific, useful, and professional — you are part of a job-application portfolio viewed by US and Indian tech recruiters
- Use **bold** for key terms, project names, and important facts
- Keep responses under 280 words unless detail is explicitly requested
- If a fact is not in the provided portfolio context, say "That detail isn't in the current portfolio — Nishanth can add it." Do not guess or hallucinate.
- Highlight Nishanth's strengths when relevant: IEEE publication, AI product engineering, full-stack capability, GenAI expertise
- Be warm but professional — this is a premium AI product

Portfolio context:
`;

function getClientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((ts) => now - ts < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

function fallbackText(prompt: string) {
  return (
    localReply(prompt) ||
    "I can answer questions about Nishanth's projects, skills, education, research, experience, coding stats, and contact details. Try: **'Tell me about Herbica AI'**, **'What is his education?'**, or **'What technologies does he know?'**"
  );
}

async function askGroq(
  prompt: string,
  history: ConversationMessage[],
): Promise<ProviderResult | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const messages = [
    {
      role: "system" as const,
      content: SYSTEM_PROMPT + buildStaticContext(),
    },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: prompt },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 480,
      messages,
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? { text, provider: "groq" } : null;
}


export async function POST(request: NextRequest) {
  const key = getClientKey(request);

  if (isRateLimited(key)) {
    return NextResponse.json(
      {
        text: "Cooldown active — protecting the assistant from rapid requests. Try again in a moment, or ask a local question like **'Show projects'** or **'What are his skills?'**",
        provider: "static",
      },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
    history?: ConversationMessage[];
  } | null;

  const prompt = body?.prompt?.trim();
  const history: ConversationMessage[] = body?.history ?? [];

  if (!prompt) {
    return NextResponse.json(
      { text: "Send a question or command for ARIA.", provider: "static" },
      { status: 400 },
    );
  }

  // Try local static reply first (no API cost, zero latency)
  const staticAnswer = localReply(prompt);
  if (staticAnswer) {
    return NextResponse.json({ text: staticAnswer, provider: "static" });
  }

  // Cache check (only for stateless queries without history)
  if (history.length === 0) {
    const cacheKey = prompt.toLowerCase().slice(0, 120);
    const cached = responseCache.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  // Try AI providers in order: Groq → static fallback
  let result: ProviderResult | null = null;

  try { result = await askGroq(prompt, history); } catch { result = null; }

  const finalResult = result ?? {
    text: fallbackText(prompt),
    provider: "static" as const,
  };

  // Cache only static responses
  if (!result && history.length === 0) {
    responseCache.set(prompt.toLowerCase().slice(0, 120), finalResult);
  }

  return NextResponse.json(finalResult);
}