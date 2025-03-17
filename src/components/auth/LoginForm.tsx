
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../ui/use-toast';
import { Link } from '../ui/link';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
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

  if (resetMode) {
    return (
      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Email cím"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Feldolgozás...' : 'Jelszó visszaállítása'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setResetMode(false)}
            className="w-1/2"
          >
            Vissza
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <Input
          type="email"
          placeholder="Email cím"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col space-y-2">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
        </Button>
        <Button 
          type="button" 
          variant="link" 
          className="text-sm self-end"
          onClick={() => setResetMode(true)}
        >
          Elfelejtette jelszavát?
        </Button>
      </div>
    </form>
  );
};
