import portfolio from "@/data/portfolio.json";

export type PortfolioData = typeof portfolio;
export type Project = PortfolioData["projects"][number];
export type AssistantStatus = "idle" | "listening" | "thinking" | "speaking";
export type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export type NavigationAction = {
  type: "navigate";
  section: string;
  label: string;
};

const sectionAliases: Record<string, string[]> = {
  hero: ["home", "start", "top"],
  assistant: ["assistant", "aria", "chat", "talk"],
  about: ["about", "profile", "background", "story", "nishanth"],
  skills: ["skills", "technologies", "tech", "stack", "capabilities"],
  projects: ["projects", "builds", "work", "portfolio", "featured"],
  experience: ["experience", "timeline", "career", "internship", "work history"],
  research: ["research", "paper", "publication", "ieee", "achievements", "awards"],
  coding: ["coding", "leetcode", "github", "contributions", "stats"],
  articles: ["blog", "articles", "writeups", "notes"],
  contact: ["contact", "email", "hire", "connect", "reach"],
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
  const commandLike = /\b(open|show|go|navigate|scroll|take|view|launch)\b/.test(normalized);

  if (/\bresume\b/.test(normalized)) {
    return { type: "navigate", section: "contact", label: "Opening resume and contact console." };
  }

  for (const [section, aliases] of Object.entries(sectionAliases)) {
    if (aliases.some((alias) => normalized.includes(alias)) && commandLike) {
      return { type: "navigate", section, label: `Opening ${section} module.` };
    }
  }

  return null;
}

export function matchLocalIntent(prompt: string): string | null {
  const normalized = normalizePrompt(prompt);

  for (const [alias, project] of Object.entries(projectAliases)) {
    if (normalized.includes(alias)) return `project:${project.slug}`;
  }

  if (/\b(who|about|background|story|identity|nishanth|yourself|profile)\b/.test(normalized)) return "about";
  if (/\b(project|built|builds|work|portfolio|featured|product)\b/.test(normalized)) return "projects";
  if (/\b(skill|tech|stack|technology|framework|tool|know|capability)\b/.test(normalized)) return "skills";
  if (/\b(experience|intern|career|organization|job|role)\b/.test(normalized)) return "experience";
  if (/\b(research|ieee|paper|publication|academic)\b/.test(normalized)) return "research";
  if (/\b(achievement|award|certification|event|hackathon)\b/.test(normalized)) return "achievements";
  if (/\b(contact|email|linkedin|github|hire|available|reach)\b/.test(normalized)) return "contact";
  if (/\b(leetcode|coding|contribution|consistency|problem)\b/.test(normalized)) return "coding";
  if (/\b(blog|article|writeup|note|summary)\b/.test(normalized)) return "articles";
  if (/\b(resume|cv)\b/.test(normalized)) return "resume";

  return null;
}

function projectReply(project: Project) {
  return [
    `${project.title} is a ${project.category} project.`,
    project.summary,
    `Problem: ${project.problem}`,
    `Solution: ${project.solution}`,
    `Stack: ${project.tech.join(", ")}.`,
    `Impact: ${project.metrics}.`,
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
    case "about":
      return `${portfolio.name} is an ${portfolio.roleLine}. ${portfolio.about.story}\n\nResearch focus: ${portfolio.about.researchInterests.slice(0, 5).join(", ")}.`;
    case "projects":
      return `Nishanth has ${portfolio.projects.length} featured AI builds: ${portfolio.projects.map((project) => project.title).join(", ")}.\n\nAsk about any one project and I can open its case-study context.`;
    case "skills":
      return `Core capability matrix: ${portfolio.skills.map((skill) => `${skill.category} (${skill.items.slice(0, 3).join(", ")})`).join("; ")}.`;
    case "experience":
      return portfolio.experience.map((item) => `${item.role} at ${item.organization} (${item.duration}): ${item.summary}`).join("\n\n");
    case "research":
      return `Research and publication module: ${portfolio.achievements[0]}. Main themes include ${portfolio.about.researchInterests.join(", ")}.`;
    case "achievements":
      return `Highlighted achievements: ${portfolio.achievements.join("; ")}.`;
    case "contact":
      return `${portfolio.availability}\n\nEmail: ${portfolio.email}\nLinkedIn: ${portfolio.linkedin}\nGitHub: ${portfolio.github}`;
    case "coding":
      return `Coding signal: ${portfolio.coding.map((item) => `${item.label}: ${item.value}`).join("; ")}.`;
    case "articles":
      return `Article console: ${portfolio.articles.map((item) => `${item.title} (${item.type})`).join("; ")}.`;
    case "resume":
      return `Resume module is linked from the contact console. If the resume file is added at ${portfolio.resumeUrl}, the button will download it directly.`;
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
      about: portfolio.about,
      projects: portfolio.projects.map(({ title, category, summary, tech, metrics }) => ({
        title,
        category,
        summary,
        tech,
        metrics,
      })),
      skills: portfolio.skills,
      experience: portfolio.experience,
      achievements: portfolio.achievements,
      coding: portfolio.coding,
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
