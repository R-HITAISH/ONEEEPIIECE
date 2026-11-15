import { Link, useRouter } from '@/router/Router';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, User, Menu, X, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { productPath } from '@/lib/utils';

type SearchSuggestion = { id: string; name: string; category: string };

export function Navbar({ onBagClick }: { onBagClick: () => void }) {
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();
  const { path, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  useEffect(() => {
    if (itemCount > 0) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 150);
      return () => clearTimeout(t);
    }
  }, [itemCount]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 1);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const term = searchText.trim();
    if (term.length < 2) { setSuggestions([]); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      supabase.from('items').select('id,name,category').eq('status', 'available').ilike('name', `%${term}%`).limit(5)
        .then(({ data }) => { if (active) setSuggestions((data ?? []) as SearchSuggestion[]); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [searchText]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = searchText.trim();
    if (term) navigate(`/shop?q=${encodeURIComponent(term)}`);
    setSuggestions([]);
    closeMobile();
  };

  const navItems = [
    { label: 'Shop', to: '/shop' },
    { label: 'Sell to us', to: '/sell' },
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="nav-bar sticky top-0 z-50" data-scrolled={scrolled}>
        <div className="max-w-[1280px] mx-auto px-[clamp(1.25rem,4vw,3rem)]">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center gap-8 md:gap-12">
              <Link to="/" className="flex items-center">
                <Logo height={36} />
              </Link>
              <nav className="hidden md:flex items-center gap-7">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="nav-link"
                    aria-current={path === item.to ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <form onSubmit={submitSearch} className="hidden sm:flex relative items-center" role="search">
              <label className="sr-only" htmlFor="site-search">Search pieces</label>
              <Search size={15} className="absolute left-3" aria-hidden="true" />
              <input id="site-search" className="input pl-9 pr-3" style={{ width: 'clamp(145px, 18vw, 240px)', minHeight: 40 }} placeholder="Search pieces" value={searchText} onChange={(event) => setSearchText(event.target.value)} onFocus={() => setAccountOpen(false)} />
              {suggestions.length > 0 && <div role="listbox" className="absolute top-full left-0 right-0 mt-2 bg-paper border shadow-lg p-1 z-50" style={{ borderColor: 'var(--hairline)' }}>
                {suggestions.map((suggestion) => <Link key={suggestion.id} role="option" to={productPath(suggestion.name, suggestion.id)} onClick={() => { setSearchText(''); setSuggestions([]); }} className="block px-3 py-2 hover:bg-[color:var(--sunken)]"><span className="block text-sm truncate">{suggestion.name}</span><span className="label">{suggestion.category}</span></Link>)}
              </div>}
            </form>

            <div className="flex items-center gap-4 md:gap-5">
              <div className="relative">
                <button type="button" onClick={() => setAccountOpen((open) => !open)} className="flex items-center gap-1.5 nav-link" aria-expanded={accountOpen} aria-haspopup="menu">
                  <User size={16} /><span className="hidden sm:inline">Account</span>
                </button>
                {accountOpen && <div role="menu" className="absolute right-0 top-full mt-3 min-w-48 bg-paper border shadow-lg p-2" style={{ borderColor: 'var(--hairline)' }}>
                  <Link role="menuitem" onClick={() => setAccountOpen(false)} to={user ? '/account' : '/auth'} className="block px-3 py-2 text-sm hover:bg-[color:var(--sunken)]">{user ? 'My account' : 'Sign in'}</Link>
                  {user && <>
                    <Link role="menuitem" onClick={() => setAccountOpen(false)} to="/account/orders" className="block px-3 py-2 text-sm hover:bg-[color:var(--sunken)]">Orders</Link>
                    <Link role="menuitem" onClick={() => setAccountOpen(false)} to="/wishlist" className="block px-3 py-2 text-sm hover:bg-[color:var(--sunken)]">Wishlist</Link>
                    <button role="menuitem" type="button" onClick={() => { void signOut(); setAccountOpen(false); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--sunken)]">Sign out</button>
                  </>}
                </div>}
              </div>

              <button
                onClick={onBagClick}
                className="relative flex items-center gap-1.5 nav-link"
                aria-label="Open bag"
              >
                <ShoppingBag size={16} />
                <span className="hidden sm:inline">Bag</span>
                {itemCount > 0 && (
                  <span className={`cart-badge absolute -top-2 -right-2 bg-brass text-paper text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${bump ? 'bump' : ''}`}>
                    {itemCount}
                  </span>
                )}
              </button>

              <button
                className="md:hidden flex items-center text-ink"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav sheet */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-paper" style={{ paddingTop: '64px' }}>
          <nav className="px-[clamp(1.25rem,4vw,3rem)] py-8">
            <form onSubmit={submitSearch} className="flex items-center gap-2 mb-5" role="search">
              <label className="sr-only" htmlFor="mobile-site-search">Search pieces</label>
              <input id="mobile-site-search" className="input" placeholder="Search pieces" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
              <button className="btn btn-primary" aria-label="Search"><Search size={16} /></button>
            </form>
            {suggestions.length > 0 && <div className="mb-5 border" style={{ borderColor: 'var(--hairline)' }}>
              {suggestions.map((suggestion) => <Link key={suggestion.id} to={productPath(suggestion.name, suggestion.id)} onClick={() => { setSearchText(''); setSuggestions([]); closeMobile(); }} className="block p-3 border-b" style={{ borderColor: 'var(--hairline)' }}>{suggestion.name}<span className="label block">{suggestion.category}</span></Link>)}
            </div>}
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeMobile}
                className="block py-4 text-2xl font-display text-ink border-b border-[color:var(--hairline)]"
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/account" onClick={closeMobile} className="block py-4 text-2xl font-display text-ink border-b border-[color:var(--hairline)]">Account</Link>
                <Link to="/account/orders" onClick={closeMobile} className="block py-4 text-2xl font-display text-ink border-b border-[color:var(--hairline)]">Orders</Link>
                <Link to="/wishlist" onClick={closeMobile} className="block py-4 text-2xl font-display text-ink border-b border-[color:var(--hairline)]">Wishlist</Link>
                <button onClick={() => { void signOut(); closeMobile(); navigate('/'); }} className="block w-full text-left py-4 text-2xl font-display text-ink border-b border-[color:var(--hairline)]">Sign out</button>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
