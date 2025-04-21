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
        // Lekérdezzük a profil adatokat
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, user_type, phone, bio')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfile({
            ...data,
            is_trainer: data.user_type === 'trainer'
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
