import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0F766E] shadow-sm animate-pulse mb-3">
          <Activity className="w-7 h-7 animate-spin" />
        </div>
        <h3 className="font-bold text-sm text-[#0B1C30]">CareTrack EMR</h3>
        <p className="text-xs text-[#64748B] mt-0.5">Authenticating patient session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
