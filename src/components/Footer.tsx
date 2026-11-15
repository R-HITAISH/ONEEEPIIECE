import { Link } from '@/router/Router';
import { Instagram, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Footer() {
  return (
    <footer className="hairline-t" style={{ backgroundColor: 'var(--paper)' }}>
      <div className="max-w-[1280px] mx-auto px-[clamp(1.25rem,4vw,3rem)] py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-start gap-12 md:gap-20">
          <div className="flex-shrink-0">
            <Logo height={36} />
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-8 flex-1">
            <div>
              <p className="label mb-3">Shop</p>
              <Link to="/shop" className="text-link block mb-2">All pieces</Link>
              <Link to="/sell" className="text-link block mb-2">Sell to us</Link>
              <Link to="/wishlist" className="text-link block">Wishlist</Link>
            </div>
            <div>
              <p className="label mb-3">Legal</p>
              <Link to="/terms" className="text-link block mb-2">Terms</Link>
              <Link to="/privacy" className="text-link block mb-2">Privacy</Link>
              <Link to="/shipping" className="text-link block mb-2">Shipping</Link>
              <Link to="/returns" className="text-link block mb-2">Returns &amp; exchanges</Link>
              <Link to="/contact" className="text-link block">Contact</Link>
            </div>
            <div>
              <p className="label mb-3">Connect</p>
              <a href="mailto:support@onepiece.in" className="text-link flex items-center gap-1.5 mb-2">
                <Mail size={13} />
                support@onepiece.in
              </a>
              <a
                href="https://instagram.com/onepiece"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link flex items-center gap-1.5"
              >
                <Instagram size={13} />
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="hairline-t mt-16 pt-8">
          <p className="label" style={{ color: 'var(--ink-2)' }}>
            &copy; 2026 ONEPIECE, Bengaluru
          </p>
        </div>
      </div>
    </footer>
  );
}
