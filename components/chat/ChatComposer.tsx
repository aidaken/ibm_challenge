"use client";

import { useState } from "react";

interface Props {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => Promise<void>;
}

export function ChatComposer({ disabled, placeholder, onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="safe-pb border-t border-[var(--divider)] bg-white px-3 py-2.5">
      {error ? (
        <p className="mb-2 text-xs text-red-600" role="alert" data-testid="composer-error">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          data-testid="chat-input"
          className="min-h-11 flex-1 rounded-full border border-[var(--divider)] bg-[var(--surface)] px-4 py-2.5 text-[15px] outline-none focus:border-[var(--accent)] focus:bg-white"
          value={text}
          disabled={disabled || sending}
          placeholder={placeholder ?? "Message"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <button
          type="button"
          data-testid="chat-send"
          disabled={disabled || sending || !text.trim()}
          onClick={() => void submit()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm transition active:bg-[var(--accent-pressed)] disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
