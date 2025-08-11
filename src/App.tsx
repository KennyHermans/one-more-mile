import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAccessGuard } from "@/components/ui/admin-access-guard";
import { DashboardAccessGuard } from "@/components/ui/dashboard-access-guard";
import { EnhancedMobileNavigation } from "@/components/ui/enhanced-mobile-navigation";
import { queryClient } from "@/lib/query-client";
import { PerformanceErrorBoundary } from "@/components/ui/performance-error-boundary";
import { performanceMonitor } from "@/lib/performance-monitor";
import { SkipToContent, useKeyboardNavigation, useHighContrastMode, useReducedMotion } from "@/components/ui/accessibility-improvements";

import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Senseis from "./pages/Senseis";

import Auth from "./pages/Auth";
import SenseiProfile from "./pages/SenseiProfile";
import SenseiPublicProfile from "./pages/SenseiPublicProfile";
import Contact from "./pages/Contact";
import BecomeSensei from "./pages/BecomeSensei";
import AdminApplications from "./pages/AdminApplications";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTrips from "./pages/AdminTrips";
import AdminSenseiLevels from "./pages/AdminSenseiLevels";
import SenseiDashboard from "./pages/SenseiDashboard";
import TripDetail from "./pages/TripDetail";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CancellationPolicy from "./pages/CancellationPolicy";
import NotFound from "./pages/NotFound";
import { AiAssistant } from "@/components/ui/ai-assistant";



const App = () => {
  // Initialize performance monitoring
  React.useEffect(() => {
    // Track initial page load
    performanceMonitor.measureFunction('app-initialization', () => {
      console.log('App initialized with performance monitoring');
    });
  }, []);

  // Initialize accessibility features
  useKeyboardNavigation();
  useHighContrastMode();
  useReducedMotion();

  return (
    <PerformanceErrorBoundary enablePerformanceTracking={true}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <SkipToContent />
              <EnhancedMobileNavigation />
              <main id="main-content">
                <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/trip/:tripId" element={<TripDetail />} />
            <Route path="/senseis" element={<Senseis />} />
            <Route path="/about" element={<Navigate to="/#values" replace />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/become-sensei" element={<BecomeSensei />} />
            <Route path="/admin/dashboard" element={<AdminAccessGuard><AdminDashboard /></AdminAccessGuard>} />
            <Route path="/admin/applications" element={<AdminAccessGuard><AdminApplications /></AdminAccessGuard>} />
            <Route path="/admin/trips" element={<AdminAccessGuard><AdminTrips /></AdminAccessGuard>} />
            <Route path="/admin/sensei-levels" element={<AdminAccessGuard><AdminSenseiLevels /></AdminAccessGuard>} />
            <Route path="/sensei/dashboard" element={<DashboardAccessGuard requiredRole="sensei"><SenseiDashboard /></DashboardAccessGuard>} />
            <Route path="/customer/dashboard" element={<DashboardAccessGuard requiredRole="customer"><CustomerDashboard /></DashboardAccessGuard>} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sensei-profile" element={<SenseiProfile />} />
            <Route path="/senseis/:senseiId" element={<SenseiPublicProfile />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-cancel" element={<PaymentCancel />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <AiAssistant />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </PerformanceErrorBoundary>
  );
};

export default App;
