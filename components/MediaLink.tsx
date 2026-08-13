'use client';

export default function MediaLink({ href, text }: { href: string; text: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-xs text-neon hover:underline" 
      onClick={e => e.stopPropagation()}
    >
      {text}
    </a>
  );
}
