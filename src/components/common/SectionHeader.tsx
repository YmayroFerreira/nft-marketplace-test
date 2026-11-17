interface SectionHeaderProps {
  id?: string
  title: string
  subtitle?: string
}

export function SectionHeader({ id, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 id={id} className="text-[28px] font-bold text-text-primary">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
    </div>
  )
}
