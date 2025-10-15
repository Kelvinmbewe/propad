interface Props {
  label: string
  description: string
}

export const PolicyBadge = ({ label, description }: Props) => (
  <div className="rounded-xl border border-brand-primary/20 bg-white p-4 shadow-sm">
    <h4 className="text-sm font-semibold uppercase tracking-wider text-brand-primary">{label}</h4>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </div>
)
