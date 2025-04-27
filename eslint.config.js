// Importálja az alap JavaScript és TypeScript szabályokat
import js from "@eslint/js";
import globals from "globals";  // Böngésző globális változók (window, document, stb.)
import reactHooks from "eslint-plugin-react-hooks";  // React Hookok ellenőrzése
import reactRefresh from "eslint-plugin-react-refresh";  // React Fast Refresh támogatás
import tseslint from "typescript-eslint";  // TypeScript-specifikus ESLint beállítások

// Az ESLint konfiguráció exportálása
export default tseslint.config(
  // **Mappa kihagyása az ellenőrzésből**
  { ignores: ["dist"] }, // A "dist" mappa kihagyása, mert ez a buildelt kód

  {
    // **Ajánlott ESLint szabályok alkalmazása**
    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    // **Milyen fájlokra vonatkozik az ESLint ellenőrzés**
    files: ["**/*.{ts,tsx}"], // Csak TypeScript fájlokra (ts, tsx)

    // **Nyelvi beállítások**
    languageOptions: {
      ecmaVersion: 2020, // ES2020 szintaxis támogatása
      globals: globals.browser, // Böngészőspecifikus globális változók (window, document)
    },

    // **ESLint pluginek**
    plugins: {
      "react-hooks": reactHooks, // React Hook használat ellenőrzése
      "react-refresh": reactRefresh, // React Fast Refresh támogatása
    },

    // **ESLint szabályok**
    rules: {
      ...reactHooks.configs.recommended.rules, // Ajánlott React Hook szabályok betöltése
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }, // Figyelmeztet, ha egy komponensen kívül mást exportálunk
      ],
      "@typescript-eslint/no-unused-vars": "off", // Nem figyelmeztet a nem használt változókra
    },
  }
);

/*
- Segít elkerülni a hibákat a React-ben, például amikor egy funkciót rossz helyen használunk.
- Gyorsabbá és kényelmesebbé teszi a fejlesztést, mert a változtatások azonnal frissülnek az oldalon.
- Nem ad felesleges figyelmeztetéseket a kódban, így csak a valódi problémákra kell figyelni.
- Csak a fontos fájlokat ellenőrzi, ezért gyorsabban fut és nem vizsgál fölösleges dolgokat.
*/
