// 🔹 A React 18-ban a "createRoot" módszert kell használni az alkalmazás indításához
import { createRoot } from 'react-dom/client';

// 🔹 Az alkalmazás fő komponensét (`App.tsx`) importáljuk
import App from './App.tsx';

// 🔹 Az alkalmazás stílusait tartalmazó CSS fájl
import './index.css';

// 🔹 Megkeresi az "index.html" fájlban lévő "root" nevű div-et, és abba helyezi a React alkalmazást
createRoot(document.getElementById("root")!).render(<App />);


/*
Miért fontos ez a fájl?
- Ez indítja el a React alkalmazást.
- Megkeresi a HTML-ben a root elemet, és oda rendereli az alkalmazást.
- Betölti az alkalmazás fő komponensét (App.tsx).
- Importálja az index.css fájlt, amely az oldalak kinézetét határozza meg.

Hogyan működik ez az egész?
- A böngésző megnyitja az index.html fájlt.
- A main.tsx megtalálja az ott lévő <div id="root"></div> elemet.
- A createRoot() ebbe a div-be tölti be az App.tsx-t, vagyis az egész React alkalmazást.
- Most már minden React komponens ezen belül fog megjelenni.
*/