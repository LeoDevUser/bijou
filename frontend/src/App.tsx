import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Register from './pages/Register'
import Orders from './pages/Orders'
import Payment from './pages/Payment'
import Admin from './pages/Admin'
import Account from './pages/Account'
import Collections from './pages/Collections'
import About from './pages/About'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Faq from './pages/Faq'
import Shipping from './pages/Shipping'

const ADMIN_URL = import.meta.env.VITE_ADMIN_PAGE ?? '';

function AdminRoute() {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  return isAdmin ? <Admin /> : <Navigate to="/" replace />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ThemeProvider>
        <LanguageProvider>
        <CurrencyProvider>
        <CartProvider>
          <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bijou-site-bg)', color: 'var(--bijou-site-text)' }}>
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/shop/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/shipping" element={<Shipping />} />
                <Route path="/account" element={<AuthRoute><Account /></AuthRoute>} />
                <Route path={`/${ADMIN_URL}`} element={<AdminRoute />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </CartProvider>
        </CurrencyProvider>
        </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
