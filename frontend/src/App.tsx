import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ShopLayout from './components/layout/ShopLayout';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

// New Pages
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';

function App() {
    return (
        <Router>
            <Routes>
                <Route element={<ShopLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/products/:slug" element={<ProductDetailPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/activate" element={<ActivateAccountPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfilePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/cart"
                        element={
                            <ProtectedRoute>
                                <CartPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/checkout"
                        element={
                            <ProtectedRoute>
                                <CheckoutPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <OrderHistoryPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders/:id"
                        element={
                            <ProtectedRoute>
                                <OrderDetailPage />
                            </ProtectedRoute>
                        }
                    />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
