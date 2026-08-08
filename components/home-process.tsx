const STEPS = [
  {
    number: "01",
    title: "Upload File",
    description: "Upload directly from your browser.",
    badge: "Any file type",
  },
  {
    number: "02",
    title: "Get a Link",
    description: "Get a share link and direct source URL.",
    badge: "Short URL + Direct source",
  },
  {
    number: "03",
    title: "Use Anywhere",
    description: "Use source URLs in websites, apps, documentation and projects.",
    badge: "Developer-ready",
  },
  {
    number: "04",
    title: "Manage",
    description: "Organize files into folders and manage links from your dashboard.",
    badge: "Full control",
  },
  {
    number: "05",
    title: "Auto Expiry",
    description: "Choose an expiry and let temporary files disappear automatically.",
    badge: "Secure & automatic",
  },
] as const;

export function HomeProcess() {
  return (
    <section
      id="how-it-works"
      className="relative hidden scroll-mt-24 overflow-hidden py-20 sm:py-24 md:block"
    >
      <div className="relative mx-auto max-w-[1400px] px-5">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5 lg:gap-4">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="fade-in-up panel group flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-success-soft font-mono text-sm font-semibold text-primary transition-transform duration-300 group-hover:scale-110">
                {step.number}
              </span>

              <h3 className="mt-4 text-[15px] font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>

              <span className="mt-auto inline-flex w-fit items-center rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                {step.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
