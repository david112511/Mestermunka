import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Coaches from "./pages/Coaches";
import Community from "./pages/Community";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Calendar from "./pages/Calendar";
import Messages from "./pages/Messages";
import PersonalProfile from "./pages/Personal_profile";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/coaches" element={<Coaches />} />
                <Route path="/community" element={<Community />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/personal-profile/:userId" element={<PersonalProfile />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:userId" element={<Messages />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/" element={<Community />} />
               
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
