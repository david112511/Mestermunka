import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, ChevronRight, Users, Calendar, MessageCircle, Dumbbell, Award, Star, Heart, Clock, Zap, Trophy, Utensils, Target, Flame, Sparkles, Play, ArrowDown, Salad, Headphones, Smile, BarChart, ChevronDown } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import Footer from '../components/Footer';

const Index = () => {
  const navigate = useNavigate();
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  // Ezt a függvényt használjuk a regisztrációs párbeszédablak megnyitásához
  const handleRegister = () => {
    // Eseményt küldünk a Navigation komponensnek, hogy nyissa meg a regisztrációs párbeszédablakot
    const event = new CustomEvent('open-register-dialog');
    window.dispatchEvent(event);
  };

  const handleFindCoach = () => {
    navigate("/coaches");
  };

  const features = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Szakértő Edzők",
      description: "Kapcsolódj minősített fitness szakemberekhez, akik végigvezetnek az edzés útján.",
      color: "from-blue-600 to-indigo-700"
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Rugalmas Időpontok",
      description: "Foglalj edzéseket a számodra legmegfelelőbb időpontokban, bármikor módosíthatsz.",
      color: "from-purple-600 to-pink-700"
    },
    {
      icon: <Dumbbell className="h-8 w-8" />,
      title: "Személyre Szabott Étrendek",
      description: "Kapj egyedi táplálkozási terveket, amelyek kiegészítik edzésprogramodat.",
      color: "from-green-600 to-teal-700"
    }
  ];

  const testimonials = [
    {
      name: "Kovács Anna",
      role: "Rendszeres Felhasználó",
      avatar: "https://randomuser.me/api/portraits/women/12.jpg",
      quote: "A FitConnect teljesen megváltoztatta az edzéshez való hozzáállásomat. Az edzőm mindig elérhető, és a személyre szabott programok nagyszerűek!"
    },
    {
      name: "Nagy Péter",
      role: "Amatőr Sportoló",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      quote: "Hat hónap alatt több eredményt értem el, mint az előző két évben együttvéve. Köszönöm a motivációt és a szakértelmet!"
    },
    {
      name: "Szabó Júlia",
      role: "Kezdő Felhasználó",
      avatar: "https://randomuser.me/api/portraits/women/23.jpg",
      quote: "Sosem gondoltam volna, hogy élvezni fogom az edzést, de a FitConnect edzőim megmutatták, hogy ez lehetséges. Imádom!"
    }
  ];

  const stats = [
    {
      icon: <Users className="h-10 w-10" />,
      value: "10,000+",
      label: "Aktív Felhasználó",
      description: "Csatlakozz növekvő közösségünkhöz",
      color: "from-blue-600 to-blue-800"
    },
    {
      icon: <Award className="h-10 w-10" />,
      value: "500+",
      label: "Minősített Edző",
      description: "Szakértők, akik segítenek célod elérésében",
      color: "from-purple-600 to-purple-800"
    },
    {
      icon: <Clock className="h-10 w-10" />,
      value: "25,000+",
      label: "Havi Edzés",
      description: "Sikeres edzések a platformunkon",
      color: "from-pink-600 to-pink-800"
    },
    {
      icon: <Trophy className="h-10 w-10" />,
      value: "95%",
      label: "Elégedettség",
      description: "Felhasználóink ajánlanak minket",
      color: "from-amber-600 to-amber-800"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Asymmetric Design with Video */}
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              y: [0, -30, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"
          />
          <motion.div 
            animate={{ 
              y: [0, 30, 0],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity,
              repeatType: "reverse",
              delay: 1
            }}
            className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"
          />
        </div>

        <div className="max-w-7xl mx-auto px-8 py-24 flex flex-col lg:flex-row items-center justify-between relative z-10 h-full">
          {/* Left Content */}
          <div className="w-full lg:w-1/2 mb-16 lg:mb-0 pr-0 lg:pr-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pink-600 to-purple-700 text-white text-sm font-medium">
                <Zap className="h-4 w-4 mr-2" />
                Alakítsd át tested és életed
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            >
              Érd el <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">álmaid</span> formáját
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-300 mb-8 max-w-lg"
            >
              Kapcsolódj szakértő edzőkhöz, kövesd fejlődésed, és érd el fitnesz céljaidat személyre szabott útmutatással.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button 
                onClick={handleRegister}
                className="inline-flex items-center px-8 py-4 rounded-lg bg-gradient-to-r from-primary to-purple-600 text-white font-medium hover:from-primary/90 hover:to-purple-700 transition-all shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Kezdj Bele Most
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
              <motion.button 
                onClick={handleFindCoach}
                className="inline-flex items-center px-8 py-4 rounded-lg bg-white/10 backdrop-blur-sm text-white font-medium border border-white/20 hover:bg-white/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Nézd meg hogyan működik
                <Play className="ml-2 h-5 w-5" />
              </motion.button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 flex items-center"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${i * 10}.jpg`}
                    alt={`User ${i}`}
                    className="w-10 h-10 rounded-full border-2 border-gray-900"
                  />
                ))}
              </div>
              <div className="ml-4">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-400">Több mint 500 5-csillagos értékelés</p>
              </div>
            </motion.div>
          </div>
          
          {/* Right Content - Video or Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full lg:w-1/2 relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                alt="Fitness Training"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
                <div className="p-6">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-16 h-16 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-lg"
                  >
                    <Play className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </div>
            </div>
            
            {/* Floating Stats Card */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -bottom-10 -left-10 bg-white rounded-xl shadow-xl p-4 flex items-center gap-4 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Átlagos fejlődés</p>
                <p className="text-gray-900 font-bold text-xl">+64%</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll Down Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        >
          <p className="text-gray-400 mb-2">Görgess tovább</p>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="h-6 w-6 text-gray-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* Testimonials Section - Interactive Carousel */}
      <section className="py-32 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute top-0 left-0 w-full h-full opacity-10" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.1 }}
              animate={{ 
                y: [Math.random() * 100, Math.random() * -100, Math.random() * 100],
                x: [Math.random() * 100, Math.random() * -100, Math.random() * 100],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ 
                duration: 10 + Math.random() * 20, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className={`absolute rounded-full mix-blend-overlay filter blur-3xl opacity-20`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${300 + Math.random() * 400}px`,
                height: `${300 + Math.random() * 400}px`,
                background: `hsl(${260 + Math.random() * 60}, 70%, 60%)`,
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-20">
            <div className="w-full md:w-1/2 mb-12 md:mb-0">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium mb-6">
                  <Star className="h-4 w-4 mr-2 text-yellow-400" />
                  Sikertörténetek
                </span>
                <h2 className="text-5xl font-bold mb-6 leading-tight">
                  Hallgasd meg <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300">ügyfeleinket</span>
                </h2>
                <p className="text-xl text-indigo-100 mb-8 max-w-lg">
                  Ismerd meg azokat, akik már elérték céljaikat a FitConnect segítségével. Valódi emberek, valódi eredmények.
                </p>
                <div className="flex space-x-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  >
                    <ChevronRight className="h-6 w-6 transform rotate-180" />
                  </motion.button>
                </div>
              </motion.div>
            </div>
            
            <div className="w-full md:w-1/2 relative">
              <div className="relative z-10">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.name}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    className={`bg-white/10 backdrop-blur-md p-8 rounded-2xl mb-6 border border-white/10 ${
                      index === 0 ? 'relative z-20' : 
                      index === 1 ? 'absolute top-10 right-0 z-10 opacity-80 scale-90' : 
                      'absolute top-20 right-10 z-0 opacity-60 scale-80'
                    }`}
                  >
                    <div className="flex items-center mb-6">
                      <div className="relative">
                        <img 
                          src={testimonial.avatar} 
                          alt={testimonial.name} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        />
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-indigo-900"
                        />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-xl font-semibold">{testimonial.name}</h4>
                        <p className="text-indigo-200">{testimonial.role}</p>
                      </div>
                      <div className="ml-auto">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-indigo-100 text-lg leading-relaxed">"{testimonial.quote}"</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
            {[
              { icon: <CheckCircle className="h-8 w-8 text-green-400" />, value: "98%", label: "Elégedettségi Arány" },
              { icon: <Award className="h-8 w-8 text-yellow-400" />, value: "15+", label: "Év Tapasztalat" },
              { icon: <Users className="h-8 w-8 text-blue-400" />, value: "2500+", label: "Sikeres Átalakulás" },
              { icon: <Trophy className="h-8 w-8 text-purple-400" />, value: "50+", label: "Szakmai Díj" }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex justify-center mb-4">
                  {item.icon}
                </div>
                <motion.h3
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.3 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  viewport={{ once: true }}
                  className="text-4xl font-bold mb-2"
                >
                  {item.value}
                </motion.h3>
                <p className="text-indigo-200">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Horizontal Layout with Interactive Elements */}
      <section className="py-32 px-8 bg-gray-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between mb-20">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="w-full lg:w-1/2 mb-12 lg:mb-0 pr-0 lg:pr-20"
            >
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-6">
                <BarChart className="h-4 w-4 mr-2" />
                Számokban
              </span>
              <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Mérhető <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">eredmények</span> minden nap
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                A FitConnect platformon minden nap több ezer felhasználó éri el fitnesz céljait. Csatlakozz te is sikeres közösségünkhöz!
              </p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg"
              >
                Tudj meg többet
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
            </motion.div>
            
            <div className="w-full lg:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative overflow-hidden rounded-2xl shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`}></div>
                  <div className="relative z-10 p-8">
                    <div className="mb-4">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white`}>
                        {stat.icon}
                      </div>
                    </div>
                    <motion.h3
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="text-4xl font-bold text-gray-900 mb-2"
                    >
                      {stat.value}
                    </motion.h3>
                    <h4 className="text-xl font-semibold text-gray-700 mb-2">{stat.label}</h4>
                    <p className="text-gray-600">{stat.description}</p>
                    
                    <motion.div 
                      className="absolute bottom-0 right-0 w-24 h-24 opacity-10"
                      animate={{ 
                        rotate: [0, 10, 0, -10, 0],
                        scale: [1, 1.1, 1, 0.9, 1]
                      }}
                      transition={{ duration: 10, repeat: Infinity }}
                    >
                      {stat.icon}
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Asymmetric Design with Interactive Elements */}
      <section className="py-32 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-indigo-700"></div>
        
        {/* Animated Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [Math.random() * 50, Math.random() * -50, Math.random() * 50],
                rotate: [0, 180, 360],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 15 + Math.random() * 15, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="absolute bg-white opacity-10"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${20 + Math.random() * 30}px`,
                height: `${20 + Math.random() * 30}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            {/* Left Side - Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="w-full lg:w-1/2 mb-16 lg:mb-0 relative"
            >
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1549060279-7e168fcee0c2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                  alt="Fitness Transformation" 
                  className="rounded-2xl shadow-2xl border-4 border-white/20 max-w-md mx-auto"
                />
                
                {/* Floating Elements */}
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="absolute -top-10 -left-10 bg-white rounded-xl shadow-xl p-4 flex items-center gap-4 z-10"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Célelérési arány</p>
                    <p className="text-gray-900 font-bold text-xl">93%</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="absolute -bottom-10 -right-10 bg-white rounded-xl shadow-xl p-4 flex items-center gap-4 z-10"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Átlagos idő</p>
                    <p className="text-gray-900 font-bold text-xl">12 hét</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Right Side - Content */}
            <div className="w-full lg:w-1/2 text-white">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium mb-6">
                  <Zap className="h-4 w-4 mr-2" />
                  Kezdd El Most
                </span>
                <h2 className="text-5xl font-bold mb-6 leading-tight">
                  Készen állsz a <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">változásra?</span>
                </h2>
                <p className="text-xl text-indigo-100 mb-8 max-w-lg">
                  Csatlakozz azokhoz, akik már átalakították életüket szakértő edzőinkkel. A te utad most kezdődik!
                </p>
                
                <div className="space-y-6 mb-10">
                  {[
                    "Személyre szabott edzésterv és táplálkozási tanácsadás",
                    "Folyamatos támogatás és motiváció szakértő edzőktől",
                    "Rugalmas időbeosztás, amely illeszkedik életviteledhez"
                  ].map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center"
                    >
                      <div className="mr-4 bg-white/20 rounded-full p-1">
                        <CheckCircle className="h-5 w-5 text-yellow-300" />
                      </div>
                      <p className="text-lg">{item}</p>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button 
                    onClick={handleRegister}
                    className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-primary font-medium hover:bg-gray-100 transition-all shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Regisztrálj Most
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </motion.button>
                  <motion.button 
                    onClick={handleFindCoach}
                    className="inline-flex items-center px-8 py-4 rounded-lg bg-white/10 backdrop-blur-sm text-white font-medium border border-white/20 hover:bg-white/20 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Fedezd Fel Edzőinket
                    <Users className="ml-2 h-5 w-5" />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
