"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  SVGProps,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Download,
  ExternalLink,
  GraduationCap,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  AssistantMessage,
  AssistantStatus,
  PortfolioData,
  Project,
  findNavigationAction,
  localReply,
} from "@/lib/assistant";

// ─── Speech types ────────────────────────────────────────────────────────────
type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResult = { 0: SpeechRecognitionResultItem };
type SpeechRecognitionEvent = { results: { 0: SpeechRecognitionResult } };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
};
type BrowserWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };

type ContactFormState = { name: string; email: string; message: string };

// ─── Icons ───────────────────────────────────────────────────────────────────
function GithubIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.41 7.86 10.94.58.1.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18A11.02 11.02 0 0 1 12 6.05c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.42.36.78 1.07.78 2.16v3.14c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor" {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM.5 8h4.95v15.5H.5V8Zm8.45 0h4.74v2.12h.07c.66-1.25 2.27-2.57 4.68-2.57 5 0 5.93 3.29 5.93 7.57v8.38h-4.95v-7.43c0-1.77-.03-4.05-2.47-4.05-2.47 0-2.85 1.93-2.85 3.92v7.56H8.95V8Z" />
    </svg>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
const navItems: [string, string][] = [
  ["assistant", "Assistant"],
  ["about", "About"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["projects", "Projects"],
  ["experience", "Timeline"],
  ["research", "Research"],
  ["contact", "Contact"],
];

const suggestedPrompts = [
  "Tell me about Nishanth",
  "Explain Herbica AI",
  "What's his education?",
  "Show skills",
  "IEEE paper details",
  "How to contact?",
];

const statusLabel: Record<AssistantStatus, string> = {
  idle: "Online",
  listening: "Listening",
  thinking: "Synthesizing",
  speaking: "Speaking",
};

const providerBadge: Record<string, { label: string; color: string }> = {
  groq: { label: "Groq", color: "text-cyan-200 border-cyan-200/30 bg-cyan-200/10" },
  static: { label: "Local", color: "text-lime-200 border-lime-200/30 bg-lime-200/10" },
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function scrollToSection(section: string) {
  document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRichText(content: string) {
  return content.split("\n").map((line, li) => {
    if (!line.trim()) return <div key={`s-${li}`} className="h-2" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={`l-${li}`} className="mb-1.5 leading-relaxed">
        {parts.map((part, pi) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={`p-${pi}`} className="font-semibold text-cyan-200">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={`s-${pi}`}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

// ─── Shared UI ───────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mb-10 max-w-3xl">
      <div className="font-mono text-xs uppercase tracking-[0.34em] text-cyan-300/80">{eyebrow}</div>
      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-6xl">{title}</h2>
      {body ? <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">{body}</p> : null}
    </div>
  );
}

function PrimaryButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = "group inline-flex items-center gap-2 justify-center rounded-full border border-cyan-300/40 bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_38px_rgba(0,231,255,0.28)] transition hover:-translate-y-0.5 hover:bg-white";
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} onClick={onClick} type="button">{children}</button>;
}

function GhostButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = "inline-flex items-center gap-2 justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-200/10";
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} onClick={onClick} type="button">{children}</button>;
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-200/10 hover:text-cyan-100"
    >
      {children}
    </a>
  );
}

// ─── Scroll Progress Bar ─────────────────────────────────────────────────────
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-[100] h-[2px] origin-left bg-gradient-to-r from-cyan-300 via-violet-300 to-cyan-300"
    />
  );
}

// ─── Assistant Orb ───────────────────────────────────────────────────────────
function AssistantOrb({ status, onClick }: { status: AssistantStatus; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-5 right-5 z-50 h-20 w-20 rounded-full border border-cyan-200/30 bg-slate-950/80 backdrop-blur-2xl transition orb-${status}`}
      aria-label="Open ARIA assistant"
    >
      <span className="absolute inset-0 rounded-full border border-cyan-200/30 [animation:pulse-ring_2.8s_ease-out_infinite]" />
      <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.32),rgba(0,231,255,0.2)_30%,rgba(5,12,27,0.95)_70%)] font-mono text-xs font-bold text-cyan-100">
        ARIA
      </span>
      <span className="absolute -right-5.5 top-0 hidden rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300 md:block">
        {statusLabel[status]}
      </span>
    </button>
  );
}

// ─── Listening Orb ───────────────────────────────────────────────────────────
function ListeningMicOrb({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.94 }}
          className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex justify-center px-4"
          role="status"
          aria-live="polite"
        >
          <div className="glass-panel flex items-center gap-4 rounded-full px-5 py-4 shadow-[0_0_60px_rgba(168,255,96,0.22)]">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-lime-200/40 bg-lime-200/10 text-lime-100 orb-listening">
              <span className="absolute inset-0 rounded-full border border-lime-200/30 [animation:pulse-ring_1.6s_ease-out_infinite]" />
              <Mic className="relative h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-lime-200">Listening</div>
              <div className="mt-2 flex h-7 items-end gap-1.5">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <span key={bar} className="w-1.5 rounded-full bg-lime-200" style={{ animation: `waveform ${0.75 + bar * 0.08}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Mobile Nav ──────────────────────────────────────────────────────────────
function MobileNavOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[45] flex flex-col bg-slate-950/96 px-6 pt-24 pb-10 backdrop-blur-2xl lg:hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
          <nav className="flex flex-col gap-2">
            {navItems.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => { scrollToSection(id); onClose(); }}
                className="rounded-2xl px-5 py-4 text-left text-2xl font-semibold text-white transition hover:bg-white/[0.06] hover:text-cyan-200"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex gap-3 pt-8">
            <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(168,255,96,0.8)]" />
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">AI system online</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Assistant Console ───────────────────────────────────────────────────────
function AssistantConsole({
  data,
  status,
  setStatus,
  expanded,
  setExpanded,
}: {
  data: PortfolioData;
  status: AssistantStatus;
  setStatus: (s: AssistantStatus) => void;
  expanded: boolean;
  setExpanded: (e: boolean) => void;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
  {
    id: "welcome",
    role: "assistant",
    content:
      "ARIA online. I'm Nishanth's AI copilot.\n\n**What I can do:**\n• Explain his **IEEE research** on plant identification\n• Deep dive into **AI projects** (Herbica, Interview Agent, TN Kalvi Hub)\n• Summarize **skills**, **education**, and **experience**\n• Help you reach Nishanth via email or LinkedIn\n• Answer questions in voice mode\n\n**Quick starts:** Tell me about his research | Explain Herbica AI | What's his education? | How to contact?",
    provider: "static",
  },
]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef(new Map<string, string>());
  const cooldownRef = useRef(false);

  // Build conversation history for context-aware requests
  function buildHistory() {
    return messages
      .filter((m) => m.id !== "welcome")
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
  }, [messages, isThinking]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").slice(0, 300));
    utt.rate = 0.98;
    utt.onstart = () => setStatus("speaking");
    utt.onend = () => setStatus("idle");
    utt.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utt);
  }

  async function resolvePrompt(prompt: string): Promise<{ text: string; provider?: string }> {
    const nav = findNavigationAction(prompt);
    if (nav) { scrollToSection(nav.section); return { text: nav.label, provider: "static" }; }

    const local = localReply(prompt);
    if (local) return { text: local, provider: "static" };

    const cacheKey = prompt.toLowerCase().slice(0, 120);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) return { text: cached, provider: "static" };

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history: buildHistory() }),
    });
    const result = (await res.json()) as { text?: string; provider?: string };
    const text =
      result.text ||
      "I couldn't reach the AI layer — but local knowledge is still available. Ask about projects, skills, or education.";

    cacheRef.current.set(cacheKey, text);
    return { text, provider: result.provider };
  }

  function submitPrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt) return;

    if (cooldownRef.current) {
      setMessages((cur) => [...cur, { id: uid(), role: "assistant", content: "Cooldown active — just a moment." }]);
      return;
    }
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 900);

    setInput("");
    setMessages((cur) => [...cur, { id: uid(), role: "user", content: prompt }]);
    setStatus("thinking");
    setIsThinking(true);

    void (async () => {
      const { text, provider } = await resolvePrompt(prompt).catch(() => ({
        text: "The AI layer is unreachable — local portfolio OS is still online. Ask about projects, skills, education, or contact details.",
        provider: "static",
      }));
      setMessages((cur) => [
        ...cur,
        { id: uid(), role: "assistant", content: text, provider: provider as "groq" | "static" | undefined },
      ]);
      setIsThinking(false);
      setStatus("idle");
      speak(text);
    })();
  }

  function startVoice() {
    const w = window as BrowserWithSpeech;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setMessages((cur) => [...cur, { id: uid(), role: "assistant", content: "Voice input isn't supported in this browser. Text mode is fully online." }]);
      return;
    }
    const rec = new Recognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    let captured = false;
    rec.onresult = (e) => { captured = true; submitPrompt(e.results[0][0].transcript); };
    rec.onend = () => { if (!captured) setStatus("idle"); };
    rec.onerror = () => setStatus("idle");
    setStatus("listening");
    rec.start();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitPrompt(input);
  }

  return (
    <section id="assistant" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="ARIA.ASSISTANT"
        title="A portfolio you can interrogate."
        body="Hybrid AI with local intent routing, agentic navigation, and Llama 3.1 powered reasoning."
      />
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        {/* Left: Architecture panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          className="glass-panel rounded-[2rem] p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-cyan-300/80">Assistant Core</p>
              <h3 className="mt-3 text-3xl font-semibold text-white">Hybrid AI architecture</h3>
            </div>
            <div className={`h-16 w-16 rounded-full border border-cyan-200/30 bg-cyan-300/10 orb-${status}`} />
          </div>
          <div className="mt-8 grid gap-3">
            {[
              ["Local knowledge", "Structured JSON powers instant portfolio answers — zero API calls, zero latency."],
              ["Navigation actions", "Commands like 'open projects' or 'go to contact' scroll instantly inside the OS."],
              ["Groq AI", "Llama 3.1 via Groq handles open-ended questions with fast inference."],
              ["Graceful fallback", "If Groq is unavailable, the local knowledge layer keeps ARIA fully online."],
              ["Voice layer", "Web Speech API captures voice input; SpeechSynthesis reads answers back aloud."],
            ].map(([title, body], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">0{i + 1} / {title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Chat panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          className={`glass-panel rounded-[2rem] p-4 transition ${expanded ? "lg:scale-[1.02]" : ""}`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 pb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-300/10 font-mono text-xs text-cyan-100 orb-${status}`}>
                AI
              </div>
              <div>
                <h3 className="font-semibold text-white">ARIA Portfolio Copilot</h3>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200">{statusLabel[status]}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-200/40 hover:text-white"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Dock" : "Focus"}
            </button>
          </div>

          <div ref={chatScrollRef} className="h-[420px] overflow-y-auto px-2 py-5">
            <div className="space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-cyan-300 text-slate-950"
                        : "border border-white/10 bg-white/[0.045] text-slate-200"
                    }`}
                  >
                    {renderRichText(msg.content)}
                  </div>
                  {msg.role === "assistant" && msg.provider && msg.provider !== undefined && (
                    <span className={`mt-1 ml-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] ${providerBadge[msg.provider]?.color ?? ""}`}>
                      {providerBadge[msg.provider]?.label ?? msg.provider}
                    </span>
                  )}
                </motion.div>
              ))}
              {isThinking ? (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-3xl border border-white/10 bg-white/[0.045] px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 rounded-full bg-cyan-200" style={{ animation: `pulse ${0.9 + i * 0.2}s ease-in-out infinite` }} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 px-2 py-4">
            {suggestedPrompts.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => submitPrompt(prompt)}
                className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-3 py-1.5 text-xs text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-200/12"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2 px-2 pb-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${data.projects[0].title}, education, skills...`}
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/50"
            />
            <button
              type="button"
              onClick={startVoice}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                status === "listening"
                  ? "border-lime-200/40 bg-lime-200/10 text-lime-100"
                  : "border-white/10 bg-white/[0.04] text-cyan-100 hover:border-cyan-200/40"
              }`}
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{status === "listening" ? "Listening" : "Voice"}</span>
            </button>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-semibold text-slate-950 transition hover:bg-white">
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero({ data, openAssistant }: { data: PortfolioData; openAssistant: () => void }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], [0, 220]);

  return (
    <section id="hero" className="relative flex min-h-screen items-center overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="grid-horizon absolute inset-0 opacity-80" />
      <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-40 opacity-60" />
      <motion.div style={{ y }} className="absolute left-1/2 top-16 h-[420px] w-[62vw] -translate-x-1/2 rounded-[120px] bg-cyan-300/8 blur-3xl" />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-200/20 bg-cyan-200/[0.06] px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] text-cyan-100">
            <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_16px_rgba(168,255,96,0.8)]" />
            Open to Work · AI Engineer
          </div>
          <h1 className="mt-8 max-w-5xl text-5xl font-semibold tracking-normal text-white md:text-7xl lg:text-8xl">
            {data.name}
            <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-3xl tracking-normal text-transparent md:text-5xl lg:text-6xl">
              AI Workspace
            </span>
          </h1>
          <div className="mt-6 max-w-3xl font-mono text-sm uppercase leading-7 tracking-[0.18em] text-cyan-200/90">{data.roleLine}</div>
          <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-slate-300 md:text-xl">{data.tagline}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => scrollToSection("projects")}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              View Projects
            </PrimaryButton>
            <GhostButton onClick={openAssistant}>
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Talk to ARIA
            </GhostButton>
            <GhostButton href={data.resumeUrl}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Resume
            </GhostButton>
            <IconLink href={data.linkedin} label="Open LinkedIn profile">
              <LinkedinIcon className="h-5 w-5" />
            </IconLink>
            <IconLink href={data.github} label="Open GitHub profile">
              <GithubIcon className="h-5 w-5" />
            </IconLink>
          </div>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {data.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="font-mono text-2xl font-semibold text-cyan-200">{stat.value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{stat.label}</div>
                <div className="mt-1 text-xs text-slate-500">{stat.detail}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto aspect-[0.94] w-full max-w-[520px]">
          <div className="absolute inset-0 rounded-[2rem] border border-cyan-200/10" />
          <div className="absolute inset-7 rounded-[1.8rem] border border-violet-200/10" />
          <div className="absolute inset-14 rounded-[1.5rem] border border-cyan-200/20" />
          <div className="absolute inset-4 [animation:orbit_18s_linear_infinite]">
            <div className="absolute left-1/2 top-0 h-4 w-4 rounded-full bg-cyan-200 shadow-[0_0_24px_rgba(0,231,255,0.9)]" />
          </div>
          <div className="absolute inset-12 [animation:orbit_12s_linear_infinite_reverse]">
            <div className="absolute bottom-2 left-1/4 h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_24px_rgba(141,124,255,0.9)]" />
          </div>
          <div className="glass-panel absolute inset-12 flex flex-col items-center justify-center overflow-hidden rounded-[1.75rem] p-5 text-center sm:inset-16">
            <div className="relative h-full min-h-80 w-full overflow-hidden rounded-[1.3rem] border border-white/10">
              <Image
                src={data.profileImage}
                alt={`${data.name} profile photo`}
                fill
                priority
                className="object-cover object-[50%_22%]"
                sizes="(max-width: 1024px) 80vw, 420px"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-5 text-left">
                <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-cyan-200">Identity</div>
                <div className="mt-2 text-xl font-semibold text-white">{data.name}</div>
                <div className="mt-1 text-sm text-slate-300">{data.roleLine}</div>
              </div>
            </div>
          </div>
          <div className="glass-panel absolute bottom-8 left-0 rounded-3xl p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">IEEE</div>
            <div className="mt-2 text-sm text-cyan-100">Published Research</div>
          </div>
          <div className="glass-panel absolute right-0 top-10 rounded-3xl p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">Available</div>
            <div className="mt-2 text-sm text-lime-200">Open to Work</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── About ───────────────────────────────────────────────────────────────────
function AboutSection({ data }: { data: PortfolioData }) {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.IDENTITY"
        title="Builder, researcher, product engineer."
        body={data.about.story}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Mission", data.about.mission],
          ["Research Interests", data.about.researchInterests.join(" · ")],
          ["Builder Mindset", data.about.mindset],
          ["Availability", data.availability],
        ].map(([title, body], i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            viewport={{ once: true }}
            className="glass-panel rounded-[2rem] p-6"
          >
            <div className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-200">0{i + 1} / {title}</div>
            <p className="mt-4 leading-8 text-slate-300">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Education ───────────────────────────────────────────────────────────────
function EducationSection({ data }: { data: PortfolioData }) {
  const edu = data.education;
  return (
    <section id="education" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.EDUCATION"
        title="Academic foundation."
        body="Formal training in AI and Data Science combined with research, competitions, and real-world product engineering."
      />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Main degree card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel overflow-hidden rounded-[2rem] p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.08] text-cyan-200">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">Undergraduate Degree</div>
              <h3 className="mt-2 text-2xl font-semibold leading-snug text-white">{edu.degree}</h3>
              <p className="mt-1 text-cyan-100/80">{edu.institution}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">{edu.duration}</span>
                <span className="rounded-full border border-cyan-200/20 bg-cyan-200/[0.08] px-3 py-1 font-mono text-xs text-cyan-200">CGPA: {edu.cgpa}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">{edu.location}</span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">Key Highlights</div>
            <div className="mt-3 space-y-2">
              {edu.highlights.map((h) => (
                <div key={h} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  <span className="text-sm leading-6 text-slate-300">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Coursework panel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          viewport={{ once: true }}
          className="glass-panel rounded-[2rem] p-6"
        >
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">Relevant Coursework</div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {edu.coursework.map((course, i) => (
              <motion.div
                key={course}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-300"
              >
                <span className="mr-2 font-mono text-[10px] text-cyan-200">{String(i + 1).padStart(2, "0")}</span>
                {course}
              </motion.div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-violet-200/15 bg-violet-200/[0.06] p-4">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-violet-200">Program Focus</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Specialized in applying artificial intelligence and data science to real-world problems — from vision systems and NLP to agentic workflows and product engineering.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Skills ───────────────────────────────────────────────────────────────────
function SkillsSection({ data }: { data: PortfolioData }) {
  return (
    <section id="skills" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.CAPABILITIES"
        title="Skill matrix with product instincts."
        body="A dashboard view of the AI, engineering, and research capabilities behind the portfolio OS."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.skills.map((skill, i) => (
          <motion.div
            key={skill.category}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            viewport={{ once: true }}
            whileHover={{ y: -6, scale: 1.01 }}
            className="glass-panel rounded-[2rem] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">{skill.category}</h3>
              <span className="font-mono text-sm text-cyan-200">{skill.level}%</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${skill.level}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {skill.items.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────────
function ProjectCard({ project, onOpen }: { project: Project; onOpen: (p: Project) => void }) {
  return (
    <motion.article layout whileHover={{ y: -8 }} className="group glass-panel relative overflow-hidden rounded-[2rem] p-6">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl transition group-hover:bg-cyan-300/20" />
      <div className="relative">
        <div className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">{project.category}</div>
        <h3 className="mt-4 text-2xl font-semibold text-white">{project.title}</h3>
        <p className="mt-4 min-h-28 leading-7 text-slate-300">{project.summary}</p>
        <div className="mt-5 rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.05] p-3 font-mono text-xs text-cyan-100">
          {project.metrics}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {project.tech.slice(0, 5).map((tech) => (
            <span key={tech} className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-300">{tech}</span>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Quick View
          </button>
          <Link href={`/projects/${project.slug}`} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-200/40 hover:text-white">
            Case Study
          </Link>
          <a href={project.liveUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-cyan-200/40 hover:text-cyan-200" title="Live Demo">
            <ExternalLink className="h-4 w-4" />
          </a>
          <a href={project.githubUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-cyan-200/40 hover:text-cyan-200" title="GitHub">
            <GithubIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}

function ProjectsSection({ data, onOpen }: { data: PortfolioData; onOpen: (p: Project) => void }) {
  return (
    <section id="projects" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.PROJECTS"
        title="Featured builds as explorable modules."
        body="Each card opens like a product case file: problem, architecture, workflow, challenge log, outcomes, and future improvements."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.projects.map((project) => (
          <ProjectCard key={project.slug} project={project} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function TimelineSection({ data }: { data: PortfolioData }) {
  return (
    <section id="experience" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="SYSTEM.TIMELINE" title="Experience timeline." />
      <div className="relative ml-3 border-l border-cyan-200/20 pl-8">
        {data.experience.map((item, i) => (
          <motion.div
            key={`${item.role}-${item.organization}`}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            viewport={{ once: true }}
            className="relative mb-6 last:mb-0"
          >
            <span className="absolute -left-[43px] top-6 h-5 w-5 rounded-full border border-cyan-200/60 bg-slate-950 shadow-[0_0_22px_rgba(0,231,255,0.45)]" />
            <div className="glass-panel rounded-[2rem] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{item.role}</h3>
                  <p className="mt-1 text-cyan-200">{item.organization}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-300">
                  {item.duration}
                </span>
              </div>
              <p className="mt-4 leading-7 text-slate-300">{item.summary}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Research ─────────────────────────────────────────────────────────────────
function ResearchSection({ data }: { data: PortfolioData }) {
  return (
    <section id="research" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.RESEARCH"
        title="Research, achievements, and signal."
        body="Publications, certifications, awards, and evidence of consistent technical growth."
      />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/[0.07] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.22em] text-cyan-200">
            {data.researchPaper.venue} · {data.researchPaper.year}
          </div>
          <h3 className="mt-5 text-3xl font-semibold leading-snug text-white">{data.researchPaper.title}</h3>
          <p className="mt-4 leading-8 text-slate-300">{data.researchPaper.abstract}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {data.researchPaper.keywords.map((kw) => (
              <span key={kw} className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.05] px-3 py-1 text-xs text-cyan-100">
                {kw}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-violet-200/15 bg-violet-200/[0.06] p-4">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-violet-200">Research Interests</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.about.researchInterests.map((ri) => (
                <span key={ri} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{ri}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">Achievements</div>
          <div className="mt-5 space-y-3">
            {data.achievements.map((a) => (
              <div key={a} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-slate-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                {a}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Coding ───────────────────────────────────────────────────────────────────
function CodingSection({ data }: { data: PortfolioData }) {
  return (
    <section id="coding" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="SYSTEM.CODING" title="Competitive coding telemetry." />
      <div className="grid gap-4 md:grid-cols-4">
        {data.coding.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            viewport={{ once: true }}
            className="glass-panel rounded-[2rem] p-5"
          >
            <div className="font-mono text-3xl font-semibold text-cyan-200">{item.value}</div>
            <div className="mt-2 text-sm uppercase tracking-[0.18em] text-white">{item.label}</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.detail}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Tech & Articles ──────────────────────────────────────────────────────────
function TechAndArticlesSection({ data }: { data: PortfolioData }) {
  return (
    <section id="articles" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.KNOWLEDGE"
        title="Tech stack and field notes."
        body="A polished tool console paired with AI blogs, project writeups, research summaries, and learning notes."
      />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel overflow-hidden rounded-[2rem] p-6">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">Technology Orbit</div>
          <div className="mt-6 flex flex-wrap gap-2">
            {data.techStack.map((tech, i) => (
              <motion.span
                key={tech}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                viewport={{ once: true }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200"
              >
                {tech}
              </motion.span>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          {data.articles.map((article) => (
            <div key={article.title} className="glass-panel rounded-[2rem] p-5">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-violet-200">{article.type}</div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{article.title}</h3>
              <p className="mt-3 leading-7 text-slate-300">{article.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact ─────────────────────────────────────────────────────────────────
function ContactSection({ data }: { data: PortfolioData }) {
  const [form, setForm] = useState<ContactFormState>({ name: "", email: "", message: "" });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"error" | "success" | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateField(field: keyof ContactFormState, value: string) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setStatusTone(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = (await res.json()) as { error?: string; ok?: boolean };
        if (!res.ok) {
          setStatusTone("error");
          setStatusMessage(result.error || "The message could not be sent.");
          return;
        }
        setStatusTone("success");
        setStatusMessage("Message sent. Nishanth will get it in his inbox.");
        setForm({ name: "", email: "", message: "" });
      } catch {
        setStatusTone("error");
        setStatusMessage("Could not send right now. Please try again shortly.");
      }
    });
  }

  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="SYSTEM.CONNECT"
        title="Contact console."
        body="Ready for AI products, research collaborations, and product engineering conversations."
      />
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-200/20 bg-lime-200/[0.08] px-3 py-1.5 text-sm text-lime-100">
            <span className="h-2 w-2 rounded-full bg-lime-300" />
            Available · Open to Work
          </div>
          <h3 className="mt-6 text-4xl font-semibold tracking-tight text-white">Build something intelligent, useful, and unusually polished.</h3>
          <p className="mt-5 leading-8 text-slate-300">{data.availability}</p>
          <div className="mt-8 space-y-3">
            {[
              { label: "Email", value: data.email, href: `mailto:${data.email}`, icon: MessageCircle },
              { label: "LinkedIn", value: data.linkedin, href: data.linkedin, icon: LinkedinIcon },
              { label: "GitHub", value: data.github, href: data.github, icon: GithubIcon },
            ].map(({ label, value, href, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-100">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">{label}</div>
                    <a href={href} target={label === "Email" ? undefined : "_blank"} rel="noreferrer" className="mt-1 block break-all text-cyan-100 hover:text-white">
                      {value}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <PrimaryButton href={data.resumeUrl}>
              <Download className="h-4 w-4" />
              Download Resume
            </PrimaryButton>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-6">
          <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">Message Uplink</div>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              Name
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-200/50"
                placeholder="Your name"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-200/50"
                placeholder="you@company.com"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Message
              <textarea
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                className="min-h-36 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-cyan-200/50"
                placeholder="Tell me about the role or your AI idea..."
              />
            </label>
            <button type="submit" disabled={isPending} className="rounded-2xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
              {isPending ? "Sending..." : "Send Message"}
            </button>
            {statusMessage ? (
              <p className={`text-sm leading-6 ${statusTone === "success" ? "text-lime-200" : "text-rose-200"}`}>{statusMessage}</p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

// ─── Project Modal ────────────────────────────────────────────────────────────
function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  useEffect(() => {
    if (!project) return;
    function handler(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="glass-panel max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200">{project.category}</div>
                <h2 className="mt-3 text-4xl font-semibold text-white">{project.title}</h2>
              </div>
              <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["Problem", project.problem],
                ["Solution", project.solution],
                ["Challenges", project.challenges.join(" | ")],
                ["Future", project.future.join(" | ")],
              ].map(([title, body]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-300">{body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-3xl border border-cyan-200/15 bg-cyan-200/[0.05] p-5">
              <h3 className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">Architecture Workflow</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.architecture.map((step, i) => (
                  <span key={step} className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-sm text-slate-200">
                    {i + 1}. {step}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-lime-200/15 bg-lime-200/[0.04] p-4 font-mono text-sm text-lime-100">
              Impact: {project.metrics}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <GhostButton href={`/projects/${project.slug}`}>Open Full Case Study</GhostButton>
              <GhostButton href={project.githubUrl}>GitHub</GhostButton>
              <PrimaryButton href={project.liveUrl}>Live Demo</PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export function AiOSPortfolio({ data }: { data: PortfolioData }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>("idle");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function openAssistant() {
    setAssistantOpen(true);
    window.setTimeout(() => scrollToSection("assistant"), 30);
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ScrollProgressBar />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,231,255,0.09),transparent_36%)]" />

      {/* Nav */}
      <nav className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-3 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => scrollToSection("hero")} className="flex items-center gap-3 pl-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 font-mono text-xs font-bold text-slate-950">N</span>
            <span className="hidden font-mono text-xs uppercase tracking-[0.28em] text-cyan-100 sm:block">{data.systemName}</span>
          </button>
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollToSection(id)} className="rounded-full px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06] hover:text-white">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openAssistant} className="rounded-full border border-cyan-200/25 bg-cyan-200/[0.08] px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-200/15">
              Ask ARIA
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:text-white lg:hidden"
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <svg viewBox="0 0 16 12" className="h-4 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="0" y1="1" x2="16" y2="1" />
                <line x1="2" y1="6" x2="16" y2="6" />
                <line x1="4" y1="11" x2="16" y2="11" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <MobileNavOverlay open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <Hero data={data} openAssistant={openAssistant} />
      <AssistantConsole data={data} status={assistantStatus} setStatus={setAssistantStatus} expanded={assistantOpen} setExpanded={setAssistantOpen} />
      <AboutSection data={data} />
      <EducationSection data={data} />
      <SkillsSection data={data} />
      <ProjectsSection data={data} onOpen={setSelectedProject} />
      <TimelineSection data={data} />
      <ResearchSection data={data} />
      <CodingSection data={data} />
      <TechAndArticlesSection data={data} />
      <ContactSection data={data} />

      <footer className="border-t border-white/10 px-4 py-10">
  <div className="mx-auto max-w-7xl">
    {/* Last Updated Banner */}
    <div className="mb-8 rounded-2xl border border-cyan-200/15 bg-cyan-200/[0.06] p-4 text-center">
      <p className="text-sm text-slate-400">
        <span className="font-mono text-cyan-200">Last Updated:</span> May 2026 · Portfolio actively maintained
      </p>
    </div>

        {/* Footer text */}
          <div className="text-center text-sm text-slate-500">
            <span className="font-mono uppercase tracking-[0.28em] text-cyan-200">{data.systemName}</span>
            <span className="mx-3 text-slate-700">/</span>
            Built with Next.js, React, Tailwind CSS, Framer Motion, and Groq AI.
          <span className="mx-3 text-slate-700">/</span>
            <button type="button" onClick={() => scrollToSection("hero")} className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500 transition hover:text-cyan-200">
              Back to top ↑
            </button>
        </div>
        </div>
      </footer>

      <ListeningMicOrb visible={assistantStatus === "listening"} />
      <AssistantOrb status={assistantStatus} onClick={openAssistant} />
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </main>
  );
}