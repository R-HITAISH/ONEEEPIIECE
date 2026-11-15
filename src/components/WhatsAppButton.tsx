import { MessageCircle } from 'lucide-react';
import { brand } from '@/content/brand';

export function WhatsAppButton() {
  const number = brand.whatsappNumber.replace(/\D/g, '');
  if (!number) return null;
  const message = encodeURIComponent('Hi ONEPIECE, I have a question about a piece.');
  return <a href={`https://wa.me/${number}?text=${message}`} target="_blank" rel="noreferrer" aria-label="Chat with ONEPIECE on WhatsApp" className="fixed z-30 right-4 bottom-24 md:bottom-6 w-12 h-12 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--hairline)' }}><MessageCircle size={19} /></a>;
}
