
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
