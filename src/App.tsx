import { lazy, Suspense, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { RouterProvider } from '@/router/Router';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BagSheet } from '@/components/BagSheet';
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const ShopPage = lazy(() => import('@/pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const BagPage = lazy(() => import('@/pages/BagPage').then((m) => ({ default: m.BagPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const SellPage = lazy(() => import('@/pages/SellPage').then((m) => ({ default: m.SellPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const TermsPage = lazy(() => import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const RefundShippingPage = lazy(() => import('@/pages/legal/RefundShippingPage').then((m) => ({ default: m.RefundShippingPage })));
const SimplePage = lazy(() => import('@/pages/SimplePage').then((m) => ({ default: m.SimplePage })));
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const OrderPage = lazy(() => import('@/pages/OrderPage').then((m) => ({ default: m.OrderPage })));
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
import { HelmetProvider } from 'react-helmet-async';
import { Seo } from '@/components/Seo';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { isSupabaseConfigured } from '@/lib/supabase';

function ProductRoute() {
  const { slug = '' } = useParams();
  const id = slug.match(/([0-9a-f]{8}-[0-9a-f-]{27,})$/i)?.[1] ?? slug;
  return <ProductPage itemId={id} />;
}

function CategoryRoute() {
  const { category } = useParams();
  return <ShopPage initialCategory={category ?? null} />;
}

function StoreRoutes() {
  const [bagOpen, setBagOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--paper)' }}>
      <Seo />
      <Navbar onBagClick={() => setBagOpen(true)} />
      <main className="page-in flex-1">
        <Suspense fallback={<div className="page py-16" aria-label="Loading page"><div className="h-8 w-48 animate-pulse" style={{ background: 'var(--sunken)' }} /></div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop/:category" element={<CategoryRoute />} />
          <Route path="/product/:slug" element={<ProductRoute />} />
          <Route path="/item/:itemId" element={<LegacyProductRoute />} />
          <Route path="/cart" element={<BagPage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:id" element={<OrderPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders" element={<AccountPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/shipping" element={<RefundShippingPage />} />
          <Route path="/returns" element={<RefundShippingPage />} />
          <Route path="/refund-shipping" element={<RefundShippingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="*" element={<SimplePage title="Page not found" description="We couldn’t find that page. Explore the latest one-of-one pieces instead." action={{ label: 'Shop all pieces', to: '/shop' }} />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
      <BagSheet open={bagOpen} onClose={() => setBagOpen(false)} />
      <WhatsAppButton />
    </div>
  );
}

function LegacyProductRoute() {
  const { itemId = '' } = useParams();
  return <ProductPage itemId={itemId} />;
}

function App() {
  if (!isSupabaseConfigured) {
    return <main className="min-h-screen bg-paper px-6 py-16 flex items-center justify-center">
      <section className="max-w-xl w-full border p-8 md:p-12" style={{ borderColor: 'var(--hairline)' }}>
        <p className="label mb-4">ONEEEPIIECE · PREVIEW SETUP</p>
        <h1 className="font-display text-4xl mb-4" style={{ fontWeight: 400 }}>Connect the store to preview it.</h1>
        <p className="leading-relaxed mb-6" style={{ color: 'var(--ink-2)' }}>This storefront needs your Supabase project URL and public anon key to load products, accounts and the bag. Copy <code>.env.example</code> to <code>.env.local</code>, add those two values, then restart the dev server.</p>
        <p className="label">No service-role or Razorpay secret belongs in the browser.</p>
      </section>
    </main>;
  }
  return (
    <HelmetProvider>
      <RouterProvider>
        <AuthProvider>
          <CartProvider>
            <StoreRoutes />
          </CartProvider>
        </AuthProvider>
      </RouterProvider>
    </HelmetProvider>
  );
}

export default App;
