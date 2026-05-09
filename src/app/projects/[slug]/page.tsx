import Link from "next/link";
import { notFound } from "next/navigation";
import portfolio from "@/data/portfolio.json";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return portfolio.projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const project = portfolio.projects.find((item) => item.slug === slug);

  if (!project) return {};

  return {
    title: `${project.title} | Nishanth OS Case Study`,
    description: project.summary,
  };
}

export default async function ProjectCaseStudy({ params }: PageProps) {
  const { slug } = await params;
  const project = portfolio.projects.find((item) => item.slug === slug);

  if (!project) notFound();

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex items-center justify-between rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-2xl">
          <Link href="/#projects" className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-100">
            Back to OS
          </Link>
          <span className="hidden text-sm text-slate-400 sm:inline">{portfolio.systemName} / Case File</span>
        </nav>

        <section className="glass-panel overflow-hidden rounded-[2.5rem] p-6 md:p-10">
          <div className="font-mono text-xs uppercase tracking-[0.32em] text-cyan-200">{project.category}</div>
          <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">{project.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{project.summary}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {project.tech.map((tech) => (
              <span key={tech} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200">
                {tech}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {[
            ["Problem Statement", project.problem],
            ["Solution", project.solution],
            ["Results", project.results.join(" | ")],
            ["Future Improvements", project.future.join(" | ")],
          ].map(([title, body]) => (
            <article key={title} className="glass-panel rounded-[2rem] p-6">
              <h2 className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-200">{title}</h2>
              <p className="mt-4 leading-8 text-slate-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 glass-panel rounded-[2rem] p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-200">Architecture Workflow</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {project.architecture.map((step, index) => (
              <div key={step} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                <div className="font-mono text-2xl text-cyan-200">{String(index + 1).padStart(2, "0")}</div>
                <div className="mt-3 text-white">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 glass-panel rounded-[2rem] p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-200">Challenge Log</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {project.challenges.map((challenge) => (
              <div key={challenge} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-slate-300">
                {challenge}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-3xl border border-cyan-200/15 bg-cyan-200/[0.05] p-5 font-mono text-sm text-cyan-100">
            Metrics: {project.metrics}
          </div>
        </section>
      </div>
    </main>
  );
}
