import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OwnerReauthModal } from './components/OwnerReauthModal';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import NewSaleScreen from './screens/NewSaleScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import AddAdjustStockScreen from './screens/AddAdjustStockScreen';
import StockListScreen from './screens/StockListScreen';
import SalesHistoryScreen from './screens/SalesHistoryScreen';
import ActivityLogScreen from './screens/ActivityLogScreen';
import PinChangeScreen from './screens/PinChangeScreen';

function AppShell() {
  const { ready } = useApp();

  if (!ready) {
    return (
      <div className="screen">
        <div className="screen-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <p style={{ color: 'var(--color-sub)' }}>Loading Pharmacy App…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sale/new"
          element={
            <ProtectedRoute>
              <NewSaleScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sale/receipt/:saleId"
          element={
            <ProtectedRoute>
              <ReceiptScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/add"
          element={
            <ProtectedRoute ownerOnly>
              <AddAdjustStockScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock/list"
          element={
            <ProtectedRoute>
              <StockListScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/history"
          element={
            <ProtectedRoute>
              <SalesHistoryScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute ownerOnly>
              <ActivityLogScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pin/change"
          element={
            <ProtectedRoute>
              <PinChangeScreen />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <OwnerReauthModal />
    </>
  );
}

export default function App({ Router = BrowserRouter }) {
  return (
    <AppProvider>
      <Router>
        <AppShell />
      </Router>
    </AppProvider>
  );
}
