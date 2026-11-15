import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { RouterProvider } from '@/router/Router';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BagSheet } from '@/components/BagSheet';
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductPage } from '@/pages/ProductPage';
import { BagPage } from '@/pages/BagPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { SellPage } from '@/pages/SellPage';
import { AboutPage } from '@/pages/AboutPage';
import { AuthPage } from '@/pages/AuthPage';
import { AccountPage } from '@/pages/AccountPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { RefundShippingPage } from '@/pages/legal/RefundShippingPage';
import { SimplePage } from '@/pages/SimplePage';
import { WishlistPage } from '@/pages/WishlistPage';
import { OrderPage } from '@/pages/OrderPage';
import { ContactPage } from '@/pages/ContactPage';
import { AdminPage } from '@/pages/AdminPage';

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
      <Navbar onBagClick={() => setBagOpen(true)} />
      <main className="page-in flex-1">
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
      </main>
      <Footer />
      <BagSheet open={bagOpen} onClose={() => setBagOpen(false)} />
    </div>
  );
}

function LegacyProductRoute() {
  const { itemId = '' } = useParams();
  return <ProductPage itemId={itemId} />;
}

function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <CartProvider>
          <StoreRoutes />
        </CartProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
