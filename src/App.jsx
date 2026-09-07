import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import MedicalHistory from './pages/MedicalHistory';
import VisitDetails from './pages/VisitDetails';
import AddVisit from './pages/AddVisit';
import MyReports from './pages/MyReports';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/patient/login" element={<Navigate to="/login" replace />} />

            <Route path="/register" element={<Register />} />
            <Route path="/patient/register" element={<Navigate to="/register" replace />} />

            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/patient/verify-otp" element={<Navigate to="/verify-otp" replace />} />

            {/* Protected Patient Portal Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="patient/dashboard" element={<Navigate to="/dashboard" replace />} />

              <Route path="history" element={<MedicalHistory />} />
              <Route path="patient/history" element={<Navigate to="/history" replace />} />
              <Route path="history/:id" element={<VisitDetails />} />

              <Route path="add-visit" element={<AddVisit />} />
              <Route path="history/add" element={<Navigate to="/add-visit" replace />} />

              <Route path="reports" element={<MyReports />} />
              <Route path="patient/reports" element={<Navigate to="/reports" replace />} />
              <Route path="reports/upload" element={<Navigate to="/add-visit" replace />} />

              <Route path="profile" element={<Profile />} />
              <Route path="patient/profile" element={<Navigate to="/profile" replace />} />

              <Route path="settings" element={<Settings />} />
              <Route path="patient/settings" element={<Navigate to="/settings" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
