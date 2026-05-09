import { NextRequest, NextResponse } from "next/server";
import { buildStaticContext, localReply } from "@/lib/assistant";

type ProviderResult = {
  text: string;
  provider: "groq" | "openrouter" | "static";
};

const requestLog = new Map<string, number[]>();
const responseCache = new Map<string, ProviderResult>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

function getClientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
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
    "I can answer questions about Nishanth's projects, skills, research, experience, coding stats, and contact details. Try: 'Explain Herbica AI', 'Show AI projects', or 'What technologies does he know?'"
  );
}

async function askGroq(prompt: string): Promise<ProviderResult | null> {
  if (!process.env.GROQ_API_KEY) return null;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: 0.35,
      max_tokens: 420,
      messages: [
        {
          role: "system",
          content:
            "You are ARIA, the concise AI assistant inside Nishanth's futuristic portfolio OS. Answer only from the provided portfolio context. Be useful, premium, and specific. If something is not in the context, say it is a placeholder or not yet provided.",
        },
        { role: "system", content: `Portfolio context:\n${buildStaticContext()}` },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? { text, provider: "groq" } : null;
}

async function askOpenRouter(prompt: string): Promise<ProviderResult | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Nishanth AI OS Portfolio",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
      temperature: 0.35,
      max_tokens: 420,
      messages: [
        {
          role: "system",
          content:
            "You are ARIA, the concise AI assistant inside Nishanth's futuristic portfolio OS. Answer only from the provided portfolio context. If a fact is missing, say it is not yet provided.",
        },
        { role: "system", content: `Portfolio context:\n${buildStaticContext()}` },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? { text, provider: "openrouter" } : null;
}

export async function POST(request: NextRequest) {
  const key = getClientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json(
      {
        text: "Cooldown active. I am protecting the assistant from too many rapid requests. Try again in a moment, or use the navigation commands locally.",
        provider: "static",
      },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { prompt?: string } | null;
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ text: "Send a question or command for ARIA.", provider: "static" }, { status: 400 });
  }

  const staticAnswer = localReply(prompt);
  if (staticAnswer) return NextResponse.json({ text: staticAnswer, provider: "static" });

  const cacheKey = prompt.toLowerCase();
  const cached = responseCache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  let result: ProviderResult | null = null;

  try {
    result = await askGroq(prompt);
  } catch {
    result = null;
  }

  if (!result) {
    try {
      result = await askOpenRouter(prompt);
    } catch {
      result = null;
    }
  }

  const finalResult = result || { text: fallbackText(prompt), provider: "static" as const };
  responseCache.set(cacheKey, finalResult);
  return NextResponse.json(finalResult);
}
