interface Props {
  text: string;
}

export function SystemCard({ text }: Props) {
  return (
    <div className="flex justify-center px-2 py-1" data-testid="system-card">
      <div className="max-w-[92%] rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-3 py-2 text-center text-[13px] font-medium leading-snug text-[var(--accent-deep)]">
        {text}
      </div>
    </div>
  );
}
