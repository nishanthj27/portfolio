import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import portfolio from "@/data/portfolio.json";

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const requestLog = new Map<string, number[]>();

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const key = getClientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Too many messages in a short time. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as ContactPayload | null;
  const name = body?.name?.trim() || "";
  const email = body?.email?.trim() || "";
  const message = body?.message?.trim() || "";
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ error: "Please share a little more detail in your message." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
  const to = process.env.CONTACT_TO_EMAIL || portfolio.email;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Contact email is not configured yet. Add RESEND_API_KEY in your environment to enable sending." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Portfolio message from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
          <h2 style="margin-bottom: 16px;">New portfolio contact message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Message:</strong></p>
          <div style="white-space: pre-wrap; border-left: 4px solid #22d3ee; padding-left: 12px;">${safeMessage}</div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "The message could not be sent right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
