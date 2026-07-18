export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">{eyebrow}</p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
