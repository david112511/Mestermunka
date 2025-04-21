import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Dumbbell, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

type UserTypeSelectionProps = {
  onSelect: (type: 'user' | 'trainer') => void;
};

export const UserTypeSelection = ({ onSelect }: UserTypeSelectionProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    hover: { 
      scale: 1.03, 
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      borderColor: "var(--primary)"
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={cardVariants}
        whileHover="hover"
      >
        <Card className="h-full border-2 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <CardHeader className="relative z-10">
            <div className="bg-blue-100 text-blue-700 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <User className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">Felhasználó</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Regisztráljon felhasználóként, ha személyi edzőt keres vagy követni szeretné az edzési folyamatát
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10">
            <div className="space-y-4">
              <ul className="space-y-2">
                {[
                  "Személyi edzők keresése és foglalása",
                  "Edzési terv és haladás követése",
                  "Személyre szabott táplálkozási tanácsok",
                  "Közösségi funkciók és támogatás"
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <div className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 group"
                onClick={() => onSelect('user')}
              >
                Felhasználóként folytatom
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        variants={cardVariants}
        whileHover="hover"
      >
        <Card className="h-full border-2 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <CardHeader className="relative z-10">
            <div className="bg-purple-100 text-purple-700 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
              <Dumbbell className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">Személyi Edző</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Regisztráljon edzőként, ha szolgáltatásait szeretné kínálni és új ügyfeleket szerezni
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10">
            <div className="space-y-4">
              <ul className="space-y-2">
                {[
                  "Szakmai profil létrehozása és kezelése",
                  "Ügyfélkör bővítése és foglalások kezelése",
                  "Edzéstervek és étrendek készítése",
                  "Közvetlen kommunikáció az ügyfelekkel"
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <div className="mr-2 h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 group"
                onClick={() => onSelect('trainer')}
              >
                Edzőként folytatom
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
