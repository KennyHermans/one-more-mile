import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Senseis from "./pages/Senseis";
import About from "./pages/About";
import Auth from "./pages/Auth";
import SenseiProfile from "./pages/SenseiProfile";
import Contact from "./pages/Contact";
import BecomeSensei from "./pages/BecomeSensei";
import MyApplications from "./pages/MyApplications";
import AdminApplications from "./pages/AdminApplications";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTrips from "./pages/AdminTrips";
import SenseiDashboard from "./pages/SenseiDashboard";
import SenseiTrips from "./pages/SenseiTrips";
import TripDetail from "./pages/TripDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/trip/:tripId" element={<TripDetail />} />
            <Route path="/senseis" element={<Senseis />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/become-sensei" element={<BecomeSensei />} />
            <Route path="/my-applications" element={<MyApplications />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/trips" element={<AdminTrips />} />
            <Route path="/sensei/dashboard" element={<SenseiDashboard />} />
            <Route path="/sensei/trips" element={<SenseiTrips />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sensei-profile" element={<SenseiProfile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
