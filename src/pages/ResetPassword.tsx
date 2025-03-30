
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is coming from a reset password link
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking session:', error.message);
        toast({
          title: "Hiba történt",
          description: "Nem sikerült ellenőrizni a munkamenetet. Kérjük, próbálja meg újra.",
          variant: "destructive",
        });
        navigate('/');
      }
      
      // If no session or user, redirect to login
      if (!data.session) {
        toast({
          title: "Érvénytelen vagy lejárt link",
          description: "Kérjük, kérjen új jelszó-visszaállítási linket.",
          variant: "destructive",
        });
        navigate('/login');
      }
    };

    checkSession();
  }, [navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (newPassword !== confirmPassword) {
      setError('A két jelszó nem egyezik meg.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A jelszónak legalább 6 karakter hosszúnak kell lennie.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      
      toast({
        title: "Jelszó sikeresen megváltoztatva",
        description: "Most már bejelentkezhet az új jelszavával.",
      });
      
      // Sign out user after password change
      await supabase.auth.signOut();
      
      // Redirect to login page
      navigate('/');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Jelszó visszaállítása</h1>
          <p className="mt-2 text-gray-600">Kérjük, adja meg új jelszavát</p>
        </div>
        
        <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                Új jelszó
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Jelszó megerősítése
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Feldolgozás...' : 'Jelszó megváltoztatása'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
