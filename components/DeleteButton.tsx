'use client';

import { useState } from 'react';

interface DeleteButtonProps {
  action: () => Promise<{ ok: boolean; error?: string }>;
  text?: string;
  className?: string;
  confirmMessage?: string;
}

export default function DeleteButton({
  action,
  text = 'Удалить',
  className = 'rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50',
  confirmMessage = 'Вы уверены, что хотите удалить это?',
}: DeleteButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (!window.confirm(confirmMessage)) return;
        setPending(true);
        try {
          const res = await action();
          if (!res.ok) {
            alert('Ошибка: ' + (res.error || 'Неизвестная ошибка'));
          }
        } catch (e: any) {
          alert('Ошибка: ' + e.message);
        } finally {
          setPending(false);
        }
      }}
      className={className}
    >
      {pending ? '...' : text}
    </button>
  );
}
