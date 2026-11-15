import { Link } from '@/router/Router';

export function SimplePage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; to: string };
}) {
  return (
    <section className="page py-20 md:py-28" aria-labelledby="page-title">
      <div className="max-w-2xl mx-auto text-center">
        <p className="label mb-4">ONEEEPIIECE</p>
        <h1 id="page-title" className="font-display" style={{ fontWeight: 400 }}>{title}</h1>
        <p className="mt-4 mb-8" style={{ color: 'var(--ink-2)' }}>{description}</p>
        {action && <Link to={action.to} className="btn btn-primary">{action.label}</Link>}
      </div>
    </section>
  );
}
