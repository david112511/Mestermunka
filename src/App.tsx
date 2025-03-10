// Értesítések megjelenítésére szolgáló komponensek
import { Toaster } from "@/components/ui/toaster";  
import { Toaster as Sonner } from "@/components/ui/sonner";  

// Tooltip-ek (kis lebegő információs ablakok) működéséhez kell
import { TooltipProvider } from "@/components/ui/tooltip";  

// Az adatok gyorsabb lekérdezéséhez használt eszköz (TanStack Query)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";  

// Az oldalak közötti navigációt biztosító eszköz (React Router)
import { BrowserRouter, Routes, Route } from "react-router-dom";  

// Az autentikációs (bejelentkezési) rendszer szolgáltatója
import { AuthProvider } from "./contexts/AuthContext";  

// Az alkalmazás egyes oldalai
import Index from "./pages/Index";  // Főoldal
import NotFound from "./pages/NotFound";  // 404-es hibaoldal (ha az oldal nem található)
import Coaches from "./pages/Coaches";  // Edzők listázása
import Community from "./pages/Community";  // Közösségi oldal

// Létrehozza az adatlekérdezés kezelésére szolgáló klienst
const queryClient = new QueryClient();

const App = () => (
  // 🔹 Az egész alkalmazásban lehetővé teszi az adatlekérdezéseket
  <QueryClientProvider client={queryClient}>
  
    {/* 🔹 Az autentikációs rendszer elérhetővé teszi a felhasználói adatokat */}
    <AuthProvider>
    
      {/* 🔹 A tooltip-ek (lebegő információs ablakok) működését biztosítja */}
      <TooltipProvider>
      
        {/* Kétféle értesítéskezelő rendszer beállítása */}
        <Toaster />  
        <Sonner />  

        {/* Az oldal navigációját kezeli */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />  {/* 🔹 Főoldal */}
            <Route path="/coaches" element={<Coaches />} />  {/* 🔹 Edzők oldala */}
            <Route path="/community" element={<Community />} />  {/* 🔹 Közösségi oldal */}
            <Route path="*" element={<NotFound />} />  {/* 🔹 Ha az oldal nem létezik, a 404-es oldal jelenik meg */}
          </Routes>
        </BrowserRouter>
        
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;  // Az App komponenst elérhetővé teszi más fájlok számára

/* 
Az oldal szerepe:
- Lehetővé teszi az oldalak közötti váltást (React Router).
- Kezeli az értesítéseket (Toaster, Sonner).
- Biztosítja az autentikációs rendszert (AuthProvider).
- Gyorsabb adatlekérdezést tesz lehetővé (QueryClientProvider).
- Tooltip-ek (kis lebegő információk) működését biztosítja (TooltipProvider).

Hogyan működik ez az alkalmazás?
- A BrowserRouter segítségével a felhasználó navigálhat az oldalak között.
- Ha a felhasználó az /coaches oldalra megy, a Coaches komponens töltődik be.
- Ha az URL nem létezik, a NotFound (404) oldal jelenik meg.
- A QueryClientProvider gyorsítja az API lekérdezéseket, így az oldal gyorsabban tölt be.
- Az AuthProvider lehetővé teszi a bejelentkezési állapot tárolását az egész alkalmazásban.
*/

