import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import TrainerAvailabilityCalendar from '@/components/TrainerAvailabilityCalendar';

/**
 * Ez a komponens a Calendar oldalt egészíti ki az edzői elérhetőségek kezelésével
 * Az URL paraméterek alapján dönti el, hogy a naptárat vagy az elérhetőségi beállításokat jelenítse meg
 */
export default function CalendarWithAvailability() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAvailability, setShowAvailability] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Az URL paraméterek alapján állítjuk be, hogy az elérhetőségi beállításokat vagy a naptárat jelenítsük meg
  useEffect(() => {
    const availabilityParam = searchParams.get('availability');
    setShowAvailability(availabilityParam === 'true');
  }, [searchParams]);

  // Váltás a naptár és az elérhetőségi beállítások között
  const toggleView = () => {
    const newValue = !showAvailability;
    setShowAvailability(newValue);
    
    // URL paraméter frissítése
    if (newValue) {
      searchParams.set('availability', 'true');
    } else {
      searchParams.delete('availability');
    }
    setSearchParams(searchParams);
  };

  // Ha a felhasználó nem edző, akkor nem jelenítjük meg az elérhetőségi beállításokat
  useEffect(() => {
    if (showAvailability && profile && !profile.is_trainer) {
      toast({
        title: 'Nincs jogosultságod',
        description: 'Az elérhetőségi beállítások csak edzők számára érhetők el.',
        variant: 'destructive',
      });
      setShowAvailability(false);
      searchParams.delete('availability');
      setSearchParams(searchParams);
    }
  }, [profile, showAvailability, searchParams, setSearchParams, toast]);

  return (
    <div className="space-y-4">
      {profile?.is_trainer && (
        <div className="flex justify-end">
          <Button onClick={toggleView} variant="outline">
            {showAvailability ? 'Vissza a naptárhoz' : 'Elérhetőségeim kezelése'}
          </Button>
        </div>
      )}

      {showAvailability && profile?.is_trainer ? (
        <TrainerAvailabilityCalendar />
      ) : (
        <div id="calendar-container">
          {/* Itt jelenik meg az eredeti naptár tartalom */}
        </div>
      )}
    </div>
  );
}
