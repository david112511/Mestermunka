import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Star, MapPin, Clock, Users, Award, TrendingUp, ChevronRight, ArrowRight, Sparkles, Dumbbell, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Footer from '../components/Footer';
import CoachSearchBar from '../components/coaches/CoachSearchBar';
import CoachFilters from '../components/coaches/CoachFilters';
import CoachList from '../components/coaches/CoachList';
import CoachDetails from '../components/coaches/CoachDetails';
import { Coach, FilterOptions } from '@/types/coach';
import { useCoachData } from '@/hooks/useCoachData';
import { useCoachFilters } from '@/hooks/useCoachFilters';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { ensureAvatarsBucketExists } from '@/services/coachService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Coaches = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  
  // Initialize filter options
  const filterOptions = useFilterOptions();
  
  // Fetch coach data using our simplified hook
  const { coaches, loading, error, fetchCoaches } = useCoachData();
  
  // Initialize default filters
  const initialFilters: FilterOptions = {
    priceRange: [0, 100],
    specializations: [],
    experience: '',
    languages: [],
    rating: 0,
    minActiveClients: 0,
    certifications: [],
    education: [],
    location: []
  };
  
  // Setup filtering
  const { 
    searchTerm, 
    setSearchTerm, 
    filters, 
    setFilters, 
    filteredCoaches,
    resetFilters
  } = useCoachFilters(coaches, initialFilters);

  // Ensure avatars bucket exists when component mounts
  useEffect(() => {
    ensureAvatarsBucketExists()
      .catch(error => {
        console.error("Failed to ensure avatars bucket exists:", error);
        toast({
          title: "Hiba történt",
          description: "A profilképek tárolója nem jött létre megfelelően.",
          variant: "destructive",
        });
      });
  }, [toast]);

  // Featured coaches - top 3 by rating
  const featuredCoaches = [...coaches]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);

  // Popular specializations
  const specializations = [
    { name: "Személyi Edző", count: 24, icon: "💪" },
    { name: "Jóga Oktató", count: 18, icon: "🧘" },
    { name: "Táplálkozási Tanácsadó", count: 15, icon: "🥗" },
    { name: "Futás Edző", count: 12, icon: "🏃" },
    { name: "CrossFit Edző", count: 10, icon: "🏋️" },
    { name: "Úszás Oktató", count: 8, icon: "🏊" }
  ];

  // Filter coaches by specialization for tabs
  const getCoachesBySpecialization = (specialization: string) => {
    if (specialization === 'all') return filteredCoaches;
    return filteredCoaches.filter(coach => 
      coach.specialty?.toLowerCase().includes(specialization.toLowerCase())
    );
  };

  // Get coaches based on active tab
  const displayedCoaches = getCoachesBySpecialization(activeTab);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - Asymmetric design with floating elements */}
      <section className="relative pt-4 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
        
        {/* Floating elements */}
        <motion.div 
          className="absolute top-40 right-20 w-16 h-16 rounded-full bg-yellow-400/20 z-0"
          animate={{ 
            y: [0, -15, 0], 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        <motion.div 
          className="absolute bottom-20 left-40 w-24 h-24 rounded-full bg-primary/10 z-0"
          animate={{ 
            y: [0, 20, 0], 
            scale: [1, 1.2, 1],
            rotate: [0, -10, 0]
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                Találd Meg a <span className="text-primary">Tökéletes Edzőt</span> Céljaidhoz
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                Válogass szakértő edzőink között és kezdd el utad a fittebb, egészségesebb élet felé
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                  onClick={() => document.getElementById('coach-search')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Search className="h-5 w-5" />
                  Edzők keresése
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="h-5 w-5 mr-2" />
                  Szűrők
                </Button>
              </div>
              
              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <motion.div 
                  className="bg-white rounded-xl p-4 shadow-sm"
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                >
                  <p className="text-4xl font-bold text-primary">{coaches.length}+</p>
                  <p className="text-gray-600">Szakértő Edző</p>
                </motion.div>
                <motion.div 
                  className="bg-white rounded-xl p-4 shadow-sm"
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                >
                  <p className="text-4xl font-bold text-primary">15+</p>
                  <p className="text-gray-600">Szakterület</p>
                </motion.div>
                <motion.div 
                  className="bg-white rounded-xl p-4 shadow-sm"
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                >
                  <p className="text-4xl font-bold text-primary">98%</p>
                  <p className="text-gray-600">Elégedettség</p>
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div 
              className="lg:w-1/2 relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                alt="Edzők" 
                className="rounded-2xl shadow-xl w-full h-[500px] object-cover"
              />
              
              {/* Floating testimonial card */}
              <motion.div 
                className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-lg max-w-xs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <img 
                    src="https://randomuser.me/api/portraits/women/44.jpg" 
                    alt="Felhasználó" 
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">Kovács Anna</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  "Az edzőm segítségével 3 hónap alatt elértem a célomat. Fantasztikus élmény volt!"
                </p>
              </motion.div>
              
              {/* Floating stats card */}
              <motion.div 
                className="absolute -top-6 -right-6 bg-white rounded-xl p-4 shadow-lg"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Aktív ügyfelek</p>
                    <p className="font-bold text-xl">1,200+</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Search and Filter Section - Horizontal cards with gradient backgrounds */}
      <section id="coach-search" className="py-16 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-gray-900">Keress a Preferenciáid Szerint</h2>
            <p className="mt-4 text-xl text-gray-600">
              Találd meg a tökéletes edzőt, aki segít elérni céljaidat
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-2xl shadow-lg p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CoachSearchBar 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onShowFilters={() => setShowFilters(true)}
            />
          </motion.div>

          <CoachFilters
            open={showFilters}
            onOpenChange={setShowFilters}
            filters={filters}
            onFiltersChange={setFilters}
            options={filterOptions}
          />
          
          {/* Popular specializations */}
          <motion.div 
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Népszerű Szakterületek</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {specializations.map((spec, index) => (
                <motion.div
                  key={index}
                  className={`bg-white rounded-xl p-4 shadow-sm border-2 cursor-pointer transition-all
                    ${activeTab === spec.name.toLowerCase() ? 'border-primary' : 'border-transparent hover:border-primary/30'}`}
                  onClick={() => setActiveTab(spec.name.toLowerCase())}
                  whileHover={{ y: -5 }}
                >
                  <div className="text-4xl mb-2">{spec.icon}</div>
                  <h4 className="font-medium text-gray-900">{spec.name}</h4>
                  <p className="text-sm text-gray-500">{spec.count} edző</p>
                </motion.div>
              ))}
            </div>
            
            <div className="flex justify-center mt-6">
              <Button 
                variant="ghost" 
                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={() => setActiveTab('all')}
              >
                Összes szakterület megtekintése
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Featured Coaches Section - 3D card layout */}
      {featuredCoaches.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-primary/20 text-primary hover:bg-primary/30 border-none">
                <Sparkles className="h-4 w-4 mr-1" /> Kiemelt Edzők
              </Badge>
              <h2 className="text-3xl font-bold text-gray-900">Legnépszerűbb Szakértőink</h2>
              <p className="mt-4 text-xl text-gray-600">Ismerd meg legjobb értékelésű edzőinket</p>
            </motion.div>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {featuredCoaches.map((coach, index) => (
                <motion.div
                  key={coach.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all hover:scale-105"
                  variants={itemVariants}
                  whileHover={{ 
                    y: -10,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                >
                  <div className="relative">
                    <img 
                      src={coach.image || `https://randomuser.me/api/portraits/${index % 2 === 0 ? 'men' : 'women'}/${index + 20}.jpg`}
                      alt={coach.name || "Edző"}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md">
                      <div className="flex items-center text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="ml-1 text-gray-900 font-medium">{coach.rating || 5}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                      <h3 className="text-xl font-bold text-white">{coach.name || "Névtelen Edző"}</h3>
                      <p className="text-white/80">{coach.specialty || "Általános edző"}</p>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{coach.location || "Budapest"}</span>
                    </div>
                    
                    <p className="text-gray-600 line-clamp-2 mb-4">{coach.description || "Nincs megadott leírás"}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(coach.certifications || []).slice(0, 2).map((cert, i) => (
                        <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                          {cert}
                        </span>
                      ))}
                      {(coach.certifications || []).length > 2 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                          +{(coach.certifications || []).length - 2} további
                        </span>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <p className="text-2xl font-bold text-gray-900">{coach.price || "0"} Ft/óra</p>
                      <Button 
                        className="bg-primary hover:bg-primary/90 text-white"
                        onClick={() => setSelectedCoach(coach)}
                      >
                        Részletek
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}
      
      {/* Coach List Section - Interactive grid layout */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="flex justify-between items-end mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Összes Elérhető Edző</h2>
              <p className="mt-2 text-gray-600">
                {activeTab !== 'all' 
                  ? `${displayedCoaches.length} edző a(z) "${activeTab}" kategóriában` 
                  : `${filteredCoaches.length} edző a szűrési feltételek alapján`}
              </p>
            </div>
            
            {filteredCoaches.length !== coaches.length && (
              <Button 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary/10"
                onClick={resetFilters}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Szűrők törlése
              </Button>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <CoachList 
              coaches={displayedCoaches}
              onSelectCoach={(coach) => setSelectedCoach(coach)}
              loading={loading}
              error={error}
              onResetFilters={resetFilters}
              onReload={fetchCoaches}
              allCoachesLength={coaches.length}
            />
          </motion.div>
          
          <CoachDetails
            coach={selectedCoach}
            onClose={() => setSelectedCoach(null)}
          />
        </div>
      </section>
      
      {/* Become a Coach CTA Section - Asymmetric design */}
      <section className="py-16 bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute right-0 top-0 h-full w-1/2 translate-x-1/2 transform text-primary/10" fill="currentColor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="0,0 90,0 50,100 0,100" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-4xl font-bold text-gray-900">Te is Edző Vagy?</h2>
              <p className="mt-6 text-xl text-gray-600">
                Csatlakozz a FitConnect közösségéhez és találj új ügyfeleket egyszerűen
              </p>
              
              <motion.div 
                className="mt-8 space-y-4"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {[
                  "Hozd létre saját edzői profilod",
                  "Állítsd be elérhető időpontjaidat",
                  "Fogadj ügyfeleket és növeld bevételed",
                  "Építs személyes márkát és szerezz visszajelzéseket"
                ].map((item, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-3 text-lg text-gray-600">{item}</p>
                  </div>
                ))}
              </motion.div>
              
              <div className="mt-10">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Regisztrálj Edzőként
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              className="lg:w-1/2 relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <img 
                src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                alt="Edző" 
                className="rounded-2xl shadow-xl w-full h-[500px] object-cover"
              />
              
              {/* Floating stats cards */}
              <motion.div 
                className="absolute -top-6 -left-6 bg-white rounded-xl p-4 shadow-lg"
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Regisztrált Edzők</p>
                    <p className="font-bold text-xl">{coaches.length}+</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Átlagos Értékelés</p>
                    <div className="flex items-center">
                      <p className="font-bold text-xl mr-2">4.8</p>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Coaches;
