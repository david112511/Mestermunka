import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/use-toast';
import { motion } from 'framer-motion';
import { Label } from '../ui/label';
import { Eye, EyeOff, Mail, Lock, UserPlus } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

export const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Jelszó hiba",
        description: "A megadott jelszavak nem egyeznek.",
        variant: "destructive",
      });
      return;
    }
    
    if (!acceptTerms) {
      toast({
        title: "Feltételek elfogadása szükséges",
        description: "Kérjük, fogadja el a felhasználási feltételeket a regisztrációhoz.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      toast({
        title: "Sikeres regisztráció",
        description: "Kérjük, erősítse meg email címét a kiküldött linkkel.",
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

  return (
    <motion.form 
      initial="hidden"
      animate="visible"
      variants={formVariants}
      onSubmit={handleRegister} 
      className="space-y-5 py-4"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary/10 p-3 rounded-full">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="register-email">Email cím</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="register-email"
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
        <Label htmlFor="register-password">Jelszó</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="register-password"
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
        <p className="text-xs text-gray-500 mt-1">
          A jelszónak legalább 8 karakterből kell állnia.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-2">
        <Label htmlFor="confirm-password">Jelszó megerősítése</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            className="pl-10"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-start space-x-2 pt-2">
        <Checkbox 
          id="terms" 
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Elfogadom a feltételeket
          </label>
          <p className="text-xs text-gray-500">
            Elolvastam és elfogadom a felhasználási feltételeket és az adatvédelmi irányelveket.
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="pt-4">
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 transition-all shadow-md hover:shadow-lg" 
          disabled={loading}
        >
          {loading ? 'Regisztráció...' : 'Regisztráció'}
        </Button>
      </motion.div>
    </motion.form>
  );
};
