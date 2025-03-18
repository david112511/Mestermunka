import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Location {
  id: string;
  name: string;
}

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('locations')
          .select('id, name')
          .order('name');
          
        if (error) throw error;
        
        setLocations(data || []);
      } catch (err: any) {
        console.error('Error fetching locations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return { locations, loading, error };
};
