'use client';

import { useState } from 'react';

export default function DeleteButton({
  action,
  text = 'Delete',
  className = '',
  confirmMessage = 'Are you sure you want to delete this?'
}: {
  action: () => Promise<{ ok: boolean; error?: string }>;
  text?: string;
  className?: string;
  confirmMessage?: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeleting(true);
    try {
      const res = await action();
      if (!res.ok) {
        alert(res.error || 'Failed to delete');
      }
    } catch (e) {
      alert('An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`text-red-500 hover:text-red-400 disabled:opacity-50 text-sm font-medium ${className}`}
      type="button"
    >
      {isDeleting ? '...' : text}
    </button>
  );
}
