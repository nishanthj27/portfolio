import portfolio from "@/data/portfolio.json";

export type PortfolioData = typeof portfolio;
export type Project = PortfolioData["projects"][number];
export type AssistantStatus = "idle" | "listening" | "thinking" | "speaking";
export type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  provider?: "groq" | "static";
};

export type NavigationAction = {
  type: "navigate";
  section: string;
  label: string;
};

const sectionAliases: Record<string, string[]> = {
  hero: ["home", "start", "top", "beginning"],
  assistant: ["assistant", "aria", "chat", "talk", "help"],
  about: ["about", "profile", "background", "story", "nishanth", "who"],
  education: ["education", "degree", "college", "university", "btech", "cgpa", "academic", "study"],
  skills: ["skills", "technologies", "tech", "stack", "capabilities", "abilities"],
  projects: ["projects", "builds", "work", "portfolio", "featured", "products"],
  experience: ["experience", "timeline", "career", "internship", "work history", "job"],
  research: ["research", "paper", "publication", "ieee", "achievements", "awards"],
  coding: ["coding", "leetcode", "github", "contributions", "stats", "dsa"],
  articles: ["blog", "articles", "writeups", "notes", "posts"],
  contact: ["contact", "email", "hire", "connect", "reach", "message"],
};

const projectAliases = portfolio.projects.reduce<Record<string, Project>>((acc, project) => {
  acc[project.slug] = project;
  acc[project.title.toLowerCase()] = project;
  project.title
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .forEach((word) => {
      acc[word] = project;
    });
  return acc;
}, {});

export function normalizePrompt(prompt: string) {
  return prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function findNavigationAction(prompt: string): NavigationAction | null {
  const normalized = normalizePrompt(prompt);
  const commandLike = /\b(open|show|go|navigate|scroll|take|view|launch|jump|bring)\b/.test(normalized);

  if (/\bresume\b/.test(normalized) && commandLike) {
    return { type: "navigate", section: "contact", label: "Opening contact console — resume download is there." };
  }

  for (const [section, aliases] of Object.entries(sectionAliases)) {
    if (aliases.some((alias) => normalized.includes(alias)) && commandLike) {
      return { type: "navigate", section, label: `Navigating to ${section} module.` };
    }
  }

  return null;
}

export function matchLocalIntent(prompt: string): string | null {
  const normalized = normalizePrompt(prompt);

  for (const [alias, project] of Object.entries(projectAliases)) {
    if (normalized.includes(alias)) return `project:${project.slug}`;
  }

  if (/\b(who|about|background|story|identity|nishanth|yourself|profile|introduce)\b/.test(normalized)) return "about";
  if (/\b(education|degree|college|university|btech|cgpa|academic|student|course|study|graduated)\b/.test(normalized)) return "education";
  if (/\b(project|built|builds|work|portfolio|featured|product|demo|live)\b/.test(normalized)) return "projects";
  if (/\b(skill|tech|stack|technology|framework|tool|know|capability|proficient|language|python|react)\b/.test(normalized)) return "skills";
  if (/\b(experience|intern|career|organization|job|role|deloitte|cloud)\b/.test(normalized)) return "experience";
  if (/\b(research|ieee|paper|publication|academic|journal)\b/.test(normalized)) return "research";
  if (/\b(achievement|award|certification|event|hackathon|honor|recognition)\b/.test(normalized)) return "achievements";
  if (/\b(contact|email|linkedin|github|hire|available|reach|connect)\b/.test(normalized)) return "contact";
  if (/\b(leetcode|coding|contribution|consistency|problem|dsa|algorithm)\b/.test(normalized)) return "coding";
  if (/\b(blog|article|writeup|note|summary|rag|agentic)\b/.test(normalized)) return "articles";
  if (/\b(resume|cv|download)\b/.test(normalized)) return "resume";
  if (/\b(hello|hi|hey|greet|start|what can|help me)\b/.test(normalized)) return "greeting";

  return null;
}

function projectReply(project: Project) {
  return [
    `**${project.title}** — ${project.category}`,
    project.summary,
    `**Problem:** ${project.problem}`,
    `**Solution:** ${project.solution}`,
    `**Stack:** ${project.tech.join(", ")}.`,
    `**Impact:** ${project.metrics}.`,
    `Live: ${project.liveUrl} | GitHub: ${project.githubUrl}`,
  ].join("\n\n");
}

export function localReply(prompt: string): string | null {
  const intent = matchLocalIntent(prompt);
  if (!intent) return null;

  if (intent.startsWith("project:")) {
    const slug = intent.replace("project:", "");
    const project = portfolio.projects.find((item) => item.slug === slug);
    return project ? projectReply(project) : null;
  }

  switch (intent) {
    case "greeting":
      return `ARIA online. I'm the AI assistant for Nishanth's portfolio. You can ask me about his **projects**, **skills**, **education**, **research**, **experience**, or say things like "Go to projects" to navigate. What would you like to know?`;

    case "about":
      return `**${portfolio.name}** — ${portfolio.roleLine}.\n\n${portfolio.about.story}\n\n**Mindset:** ${portfolio.about.mindset}\n\n**Research focus:** ${portfolio.about.researchInterests.slice(0, 4).join(", ")}.`;

    case "education":
      return [
        `**Education: ${portfolio.education.degree}**`,
        `Institution: ${portfolio.education.institution}`,
        `Duration: ${portfolio.education.duration} | CGPA: ${portfolio.education.cgpa}`,
        `Relevant coursework: ${portfolio.education.coursework.slice(0, 6).join(", ")}.`,
        `Key highlights: ${portfolio.education.highlights.slice(0, 3).join("; ")}.`,
      ].join("\n\n");

    case "projects":
      return `Nishanth has **${portfolio.projects.length} featured AI builds**: ${portfolio.projects.map((p) => `**${p.title}** (${p.category})`).join(", ")}.\n\nAsk about any project by name and I'll open its full case study.`;

    case "skills":
      return `**Core capability matrix:**\n\n${portfolio.skills.map((s) => `**${s.category}** (${s.level}%): ${s.items.slice(0, 3).join(", ")}`).join("\n")}`;

    case "experience":
      return portfolio.experience.map((item) => `**${item.role}** at ${item.organization} (${item.duration}):\n${item.summary}`).join("\n\n");

    case "research":
      return `**IEEE Publication:** ${portfolio.researchPaper.title} (${portfolio.researchPaper.venue}, ${portfolio.researchPaper.year}).\n\n${portfolio.researchPaper.abstract}\n\n**Research interests:** ${portfolio.about.researchInterests.join(", ")}.`;

    case "achievements":
      return `**Highlighted achievements:**\n\n${portfolio.achievements.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;

    case "contact":
      return `${portfolio.availability}\n\n**Email:** ${portfolio.email}\n**LinkedIn:** ${portfolio.linkedin}\n**GitHub:** ${portfolio.github}\n\nOr use the contact form in the Contact section to send a message directly.`;

    case "coding":
      return `**Coding signal:**\n\n${portfolio.coding.map((item) => `**${item.label}:** ${item.value} — ${item.detail}`).join("\n")}`;

    case "articles":
      return `**Field notes and articles:**\n\n${portfolio.articles.map((a) => `**${a.title}** (${a.type}) — ${a.summary}`).join("\n\n")}`;

    case "resume":
      return `The resume is available for download from the **Contact** section, or directly at \`${portfolio.resumeUrl}\`. Navigate there and hit the Download button.`;

    default:
      return null;
  }
}

export function buildStaticContext() {
  return JSON.stringify(
    {
      identity: {
        name: portfolio.name,
        role: portfolio.roleLine,
        tagline: portfolio.tagline,
        availability: portfolio.availability,
      },
      education: portfolio.education,
      about: portfolio.about,
      researchPaper: portfolio.researchPaper,
      projects: portfolio.projects.map(({ title, category, summary, tech, metrics, liveUrl, githubUrl }) => ({
        title,
        category,
        summary,
        tech,
        metrics,
        liveUrl,
        githubUrl,
      })),
      skills: portfolio.skills,
      experience: portfolio.experience,
      achievements: portfolio.achievements,
      coding: portfolio.coding,
      articles: portfolio.articles,
      contact: {
        email: portfolio.email,
        linkedin: portfolio.linkedin,
        github: portfolio.github,
      },
    },
    null,
    2,
  );
}