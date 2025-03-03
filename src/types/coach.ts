// Ez határozza meg, hogy milyen adatokat kell tárolni egy edzőről.
// Biztosítja, hogy minden edzőobjektum ugyanazokat az adatokat tartalmazza.
// Segíti a kódellenőrzést, mert ha hiányzik egy adat, TypeScript hibát ad.
export interface Coach {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  price: string;
  experience: string;
  location: string;
  certifications: string[];
  availability: string;
  activeClients: number;
  successStories: number;
  description: string;
  languages: string[];
  email: string;
  phone: string;
  specializationAreas: string[];
  education: string[];
  fullBio: string;
}

// Ez határozza meg, hogy a felhasználó milyen feltételek alapján szűrheti az edzőket.
// Ha például valaki jógaoktatót keres Budapesten, aki angolul beszél és legalább 4.5 csillagos értékelése van, akkor ezt itt lehet megadni.
export interface FilterOptions {
  priceRange: number[];
  specializations: string[];
  experience: string;
  languages: string[];
  rating: number;
  minActiveClients: number;
  certifications: string[];
  education: string[];
  location: string[];
}

/* 
Mi a szerepe?
- Egységes formátumot ad az edzők adatainak.
- Lehetővé teszi, hogy az edzőket különböző szempontok szerint szűrjük.
- Megakadályozza a hibákat (pl. ha egy edzőnek nincs neve vagy hiányzik egy adat, TypeScript figyelmeztetést ad).
*/