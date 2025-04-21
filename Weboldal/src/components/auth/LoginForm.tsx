import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/use-toast';
import { Link } from '../ui/link';
import { motion } from 'framer-motion';
import { Label } from '../ui/label';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: "Sikeres bejelentkezés",
        description: "Üdvözöljük újra!",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Hiányzó email cím",
        description: "Kérjük, adja meg az email címét a jelszó visszaállításához.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Update the redirectTo to use an absolute URL
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      toast({
        title: "Jelszó visszaállítási link elküldve",
        description: "Kérjük, ellenőrizze email fiókját a további instrukciókért.",
      });
      setResetMode(false);
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  if (resetMode) {
    return (
      <motion.form 
        initial="hidden"
        animate="visible"
        variants={formVariants}
        onSubmit={handlePasswordReset} 
        className="space-y-6 py-4"
      >
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-center">Jelszó visszaállítása</h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            Adja meg email címét, és küldünk egy jelszó visszaállítási linket.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          <Label htmlFor="reset-email">Email cím</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              id="reset-email"
              type="email"
              className="pl-10"
              placeholder="pelda@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-2 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setResetMode(false)}
            className="w-1/3 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza
          </Button>
          <Button 
            type="submit" 
            className="w-2/3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700" 
            disabled={loading}
          >
            {loading ? 'Feldolgozás...' : 'Jelszó visszaállítása'}
          </Button>
        </motion.div>
      </motion.form>
    );
  }

  return (
    <motion.form 
      initial="hidden"
      animate="visible"
      variants={formVariants}
      onSubmit={handleLogin} 
      className="space-y-5 py-4"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="email">Email cím</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="email"
            type="email"
            className="pl-10"
            placeholder="pelda@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="password">Jelszó</Label>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            className="pl-10 pr-10"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col space-y-4 pt-2">
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 transition-all shadow-md hover:shadow-lg" 
          disabled={loading}
        >
          {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
        </Button>
        
        <Button 
          type="button" 
          variant="link" 
          className="text-sm self-center text-gray-600 hover:text-primary"
          onClick={() => setResetMode(true)}
        >
          Elfelejtette jelszavát?
        </Button>
      </motion.div>
    </motion.form>
  );
};
