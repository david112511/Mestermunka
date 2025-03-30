import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  phone: string | null;
  bio: string | null;
  is_trainer: boolean;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Először lekérdezzük a profil adatokat
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, user_type, phone, bio')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // Ellenőrizzük, hogy a felhasználó edző-e
        const { data: trainerData, error: trainerError } = await supabase
          .from('trainer_profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile({
            ...data,
            is_trainer: !trainerError && trainerData !== null
          });
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return { profile, loading, error };
};
