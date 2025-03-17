// A defineConfig függvényt importáljuk a Vite-ból, amely segít a konfiguráció létrehozásában.
import { defineConfig } from "vite";

// A @vitejs/plugin-react-swc egy Vite plugin, amely lehetővé teszi a React és az SWC gyors transpilálását.
import react from "@vitejs/plugin-react-swc";

// A path modult importáljuk, amely egy beépített Node.js modul, és az aliasok kezelésére fogjuk használni.
import path from "path";
export default defineConfig(() => ({
  // Fejlesztői szerver beállításai
  server: {
    host: "::",  // Engedélyezi a szerver futtatását minden elérhető hálózati interfészen.
    port: 3000,  
  },

  // **Pluginok beállítása**
  plugins: [
    react(), // Engedélyezi a React támogatást Vite alatt, SWC transpilert használva.
  ],

  // **Aliasok beállítása**
  resolve: {
    alias: {
      // Az "@" alias lehetővé teszi, hogy a fájlokat könnyebben importáljuk.
      // Például: import MyComponent from "@/components/MyComponent";
      // Ez helyettesíti a hosszú relatív import utakat, pl.: "../../components/MyComponent".
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

/*
Miért fontosak ezek a beállítások?
- Vite gyors build rendszert biztosít, amely sokkal gyorsabb, mint a Webpack.
- React + SWC transpilálás – Az SWC egy szupergyors JavaScript transpiláló, amely gyorsabb, mint a Babel.
- Fejlesztői szerver a 8080-as porton – Az alkalmazást a böngészőben http://localhost:8080/ címen éred el.
- Aliasok (@) segítenek a tiszta importokban, így nem kell hosszú relatív útvonalakat használni.
*/