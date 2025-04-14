import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';
import { UserTypeSelection } from './auth/UserTypeSelection';
import { TrainerRegistrationForm } from './auth/TrainerRegistrationForm';
import { useToast } from './ui/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { ProfileMenu } from './auth/ProfileMenu';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registrationType, setRegistrationType] = useState<'selection' | 'user' | 'trainer'>('selection');
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();

  // Eseményfigyelő hozzáadása a regisztrációs párbeszédablak megnyitásához
  useEffect(() => {
    const handleOpenRegisterDialog = () => {
      setRegisterOpen(true);
      setRegistrationType('selection');
    };

    // Eseményfigyelő hozzáadása
    window.addEventListener('open-register-dialog', handleOpenRegisterDialog);

    // Eseményfigyelő eltávolítása a komponens eltávolításakor
    return () => {
      window.removeEventListener('open-register-dialog', handleOpenRegisterDialog);
    };
  }, []);

  const navItems = [
    { name: 'Edzők', path: '/coaches' },
    { name: 'Közösség', path: '/community' },
    { name: 'Naptár', path: '/calendar' },
    { name: 'Üzenetek', path: '/messages' },
  ];

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Sikeres kijelentkezés",
        description: "Viszlát legközelebb!",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUserTypeSelect = (type: 'user' | 'trainer') => {
    setRegistrationType(type === 'user' ? 'user' : 'trainer');
  };

  const renderRegistrationContent = () => {
    if (registrationType === 'selection') {
      return <UserTypeSelection onSelect={handleUserTypeSelect} />;
    } else if (registrationType === 'trainer') {
      return <TrainerRegistrationForm />;
    } else {
      return <RegisterForm />;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white backdrop-blur-lg z-50 border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-1 flex items-center justify-between">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">FitnessConnect360</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-200 hover:text-primary transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              
              {user ? (
                <div className="flex items-center space-x-4">
                  <ProfileMenu profile={profile} />
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-gray-600 text-white bg-gray-700/50 hover:bg-gray-700/70 hover:border-primary hover:shadow-md hover:shadow-primary/20 transition-all duration-200">
                        <User className="mr-2 h-4 w-4" />
                        Bejelentkezés
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-xl border-0">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center">Üdvözöljük újra!</DialogTitle>
                        <DialogDescription className="text-center text-gray-500">
                          Jelentkezzen be fiókjába.
                        </DialogDescription>
                      </DialogHeader>
                      <LoginForm />
                    </DialogContent>
                  </Dialog>

                  <Dialog 
                    open={registerOpen} 
                    onOpenChange={(open) => {
                      setRegisterOpen(open);
                      if (!open) setRegistrationType('selection');
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Regisztráció
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-xl border-0">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center">Regisztráció</DialogTitle>
                        <DialogDescription className="text-center text-gray-500">
                          {registrationType === 'selection' 
                            ? 'Válassza ki a fiók típusát'
                            : registrationType === 'trainer'
                            ? 'Regisztráljon személyi edzőként'
                            : 'Hozza létre felhasználói fiókját'}
                        </DialogDescription>
                      </DialogHeader>
                      {renderRegistrationContent()}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            {/* Mobil menü gomb */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              >
                <span className="sr-only">Menü megnyitása</span>
                {isOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobil menü */}
      <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden bg-gray-800 shadow-lg`}>
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-200 hover:bg-gray-700 hover:border-primary hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          {user ? (
            <div className="px-3 py-2">
              <ProfileMenu profile={profile} />
            </div>
            
          ) : (
            <div className="px-3 py-2 space-y-2">
              <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-gray-600 text-white bg-gray-700/50 hover:bg-gray-700/70 hover:border-primary hover:shadow-md hover:shadow-primary/20 transition-all duration-200">
                    <User className="mr-2 h-4 w-4" />
                    Bejelentkezés
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-xl shadow-xl border-0">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Üdvözöljük újra!</DialogTitle>
                    <DialogDescription className="text-center text-gray-500">
                      Jelentkezzen be fiókjába.
                    </DialogDescription>
                  </DialogHeader>
                  <LoginForm />
                </DialogContent>
              </Dialog>

              <Dialog 
                open={registerOpen} 
                onOpenChange={(open) => {
                  setRegisterOpen(open);
                  if (!open) setRegistrationType('selection');
                }}
              >
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Regisztráció
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-white rounded-xl shadow-xl border-0">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center">Regisztráció</DialogTitle>
                    <DialogDescription className="text-center text-gray-500">
                      {registrationType === 'selection' 
                        ? 'Válassza ki a fiók típusát'
                        : registrationType === 'trainer'
                        ? 'Regisztráljon személyi edzőként'
                        : 'Hozza létre felhasználói fiókját'}
                    </DialogDescription>
                  </DialogHeader>
                  {renderRegistrationContent()}
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
