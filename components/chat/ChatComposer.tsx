// ShiftFix — written by IBM Bob

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
    <div className="border-t border-slate-200 bg-white p-3">
      {error ? (
        <p className="mb-2 text-xs text-red-600" role="alert" data-testid="composer-error">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <input
          data-testid="chat-input"
          className="flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white"
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
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
