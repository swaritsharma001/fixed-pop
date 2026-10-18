import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from './AuthPages.jsx';
import { BrandingPage, DashboardPage, IntegrationPage, OrdersPage, PaymentsPage, SettingsPage, UnmatchedPage } from './MerchantPages.jsx';
import { PaymentLinksPage } from './PaymentLinksPage.jsx';
import { AdminPage } from './AdminPage.jsx';
import { PrivateArea } from './MerchantShell.jsx';
import PayCheckout from './PayCheckout.jsx';
import PrivacyPage from './PrivacyPage.jsx';
import { hasSession } from './api.js';

export default function App() {
  return (
    <Routes>
      <Route path="/pay/:orderId" element={<PayCheckout />} />
      <Route path="/checkout/:orderId" element={<PayCheckout />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/developer" element={<IntegrationPage isPublic={true} />} />
      <Route path="/guide" element={<IntegrationPage isPublic={true} />} />
      <Route element={<PrivateArea />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/payment-links" element={<PaymentLinksPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/unmatched" element={<UnmatchedPage />} />
        <Route path="/branding" element={<BrandingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/docs" element={<IntegrationPage />} />
        <Route path="/integration" element={<Navigate to="/docs" replace />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
      <Route path="/" element={<Navigate to={hasSession() ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={hasSession() ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
