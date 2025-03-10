import { motion } from "framer-motion";
import { ArrowRight, Star, Users, Calendar, Utensils, ChevronRight, CheckCircle, Trophy, Users2, Target, Award, Clock } from "lucide-react";
import Navigation from "../components/Navigation";

const Index = () => {
  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Szakértő Edzők",
      description: "Kapcsolódj minősített fitness szakemberekhez, akik végigvezetnek az edzés útján.",
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Rugalmas Időbeosztás",
      description: "Foglalj edzéseket a saját időbeosztásodhoz igazítva, egyszerű átütemezési lehetőségekkel.",
    },
    {
      icon: <Utensils className="h-6 w-6" />,
      title: "Személyre Szabott Étrend",
      description: "Kérj egyénre szabott étkezési terveket, amelyek illeszkednek a céljaidhoz és preferenciáidhoz.",
    },
  ];

  const stats = [
    {
      icon: <Users2 className="h-8 w-8" />,
      value: "5000+",
      label: "Elégedett Ügyfél",
      description: "Akik már elérték céljaikat velünk"
    },
    {
      icon: <Award className="h-8 w-8" />,
      value: "150+",
      label: "Minősített Edző",
      description: "Szakértő oktatók a fejlődésedért"
    },
    {
      icon: <Target className="h-8 w-8" />,
      value: "98%",
      label: "Sikeres Célelérés",
      description: "Ügyfeleink elégedettségi rátája"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      value: "24/7",
      label: "Folyamatos Támogatás",
      description: "Mindig melletted állunk"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-20 sm:pt-24 lg:pt-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight"
          >
            Alakítsd Át Fitnesz Utazásod
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Kapcsolódj szakértő edzőkhöz, kövesd fejlődésed, és érd el fitnesz céljaidat személyre szabott útmutatással.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors" onClick={() => window.location.href="http://localhost:8080/community"}>
              Kezdj Bele
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="inline-flex items-center px-6 py-3 rounded-lg bg-secondary text-gray-900 font-medium hover:bg-secondary/90 transition-colors" onClick={() => window.location.href="http://localhost:8080/coaches"}>
              Találj Edzőt
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mt-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-200 hover:border-primary/20 hover:shadow-lg transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mt-32 px-4 bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Hogyan Működik</h2>
            <p className="mt-4 text-xl text-gray-600">Kezdj bele három egyszerű lépésben</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Találd Meg az Edződ",
                description: "Böngéssz minősített edzőink között és találd meg a számodra megfelelőt."
              },
              {
                step: "2",
                title: "Foglalj Időpontot",
                description: "Ütemezd be edzéseidet a neked megfelelő időpontokra."
              },
              {
                step: "3",
                title: "Érd El Céljaid",
                description: "Dolgozz együtt edződdel és kövesd nyomon fejlődésed."
              }
            ].map((item, index) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="mt-32 px-4 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">A Számok Magukért Beszélnek</h2>
            <p className="mt-4 text-xl text-gray-600">Csatlakozz sikeres közösségünkhöz</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-primary/20 hover:shadow-lg transition-all text-center"
              >
                <div className="mb-4 flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {stat.icon}
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</h3>
                <h4 className="text-lg font-semibold text-primary mb-2">{stat.label}</h4>
                <p className="text-gray-600">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Készen Állsz a Kezdésre?</h2>
          <p className="text-xl mb-8 opacity-90">Csatlakozz azokhoz, akik már átalakították életüket szakértő edzőinkkel.</p>
          <button className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-primary font-medium hover:bg-gray-100 transition-colors">
            Kezdd El Most
            <ChevronRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Index;
