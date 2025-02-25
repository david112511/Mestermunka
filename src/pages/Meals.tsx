
import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import Navigation from '../components/Navigation';

const Meals = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const mealPlans = [
    {
      id: 1,
      title: "Fogyókúrás Étrend",
      description: "Kiegyensúlyozott étrend az egészséges és fenntartható fogyásért",
      duration: "4 hét",
      mealsPerDay: 5,
      price: "49",
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=600",
      category: "Fogyókúra",
    },
    {
      id: 2,
      title: "Izomépítő Terv",
      description: "Magas fehérjetartalmú étrend a sovány izomtömeg építéséhez",
      duration: "6 hét",
      mealsPerDay: 6,
      price: "59",
      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600",
      category: "Izomépítés",
    },
    {
      id: 3,
      title: "Vegán Fitness Terv",
      description: "Növényi alapú étrend a sportteljesítmény optimalizálásához",
      duration: "4 hét",
      mealsPerDay: 5,
      price: "45",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600",
      category: "Vegán",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Étrendek</h1>
          <p className="mt-4 text-xl text-gray-600">Fedezd fel személyre szabott étrendeinket, amelyek illeszkednek fitnesz céljaidhoz</p>
        </div>

        {/* Keresés Szekció */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Étrendek keresése..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="inline-flex items-center px-6 py-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter className="mr-2 h-5 w-5" />
            Szűrők
          </button>
        </div>

        {/* Étrendek Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {mealPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
              <img
                src={plan.image}
                alt={plan.title}
                className="w-full h-48 object-cover rounded-lg mb-6"
              />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.title}</h3>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>Időtartam: {plan.duration}</p>
                <p>Napi étkezések: {plan.mealsPerDay}</p>
                <p>Kategória: {plan.category}</p>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">{plan.price} €</span>
                <button className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
                  Részletek
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Meals;
