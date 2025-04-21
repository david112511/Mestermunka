import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';

interface TrainerSettings {
  id: string;
  trainer_id: string;
  confirmation_mode: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
}

const BookingConfirmationSettings = () => {
  const [confirmationMode, setConfirmationMode] = useState<'auto' | 'manual'>('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Beállítások betöltése
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('trainer_settings')
          .select('*')
          .eq('trainer_id', user.id)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            // Ha nincs még beállítás, használjuk az alapértelmezett 'manual' értéket
            setConfirmationMode('manual');
          } else {
            console.error('Hiba a beállítások betöltésekor:', error);
            toast({
              title: 'Hiba történt',
              description: 'Nem sikerült betölteni a beállításokat.',
              variant: 'destructive',
            });
          }
        } else if (data) {
          setConfirmationMode(data.confirmation_mode || 'manual');
        }
      } catch (error) {
        console.error('Hiba a beállítások betöltésekor:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [user, toast]);

  // Beállítások mentése
  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Ellenőrizzük, hogy van-e már beállítás
      const { data: existingSettings, error: checkError } = await supabase
        .from('trainer_settings')
        .select('id')
        .eq('trainer_id', user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      let result;
      
      if (existingSettings) {
        // Meglévő beállítás frissítése
        result = await supabase
          .from('trainer_settings')
          .update({
            confirmation_mode: confirmationMode,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSettings.id);
      } else {
        // Új beállítás létrehozása
        result = await supabase
          .from('trainer_settings')
          .insert({
            trainer_id: user.id,
            confirmation_mode: confirmationMode,
            min_duration: 30,
            max_duration: 120,
            time_step: 15,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      toast({
        title: 'Beállítások mentve',
        description: 'A foglalások megerősítési módja sikeresen frissítve.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Hiba a beállítások mentésekor:', error);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült menteni a beállításokat.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-50 border border-gray-200">
        <CardContent className="pt-6 flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-50 border border-gray-200">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <RadioGroup 
            value={confirmationMode} 
            onValueChange={(value) => setConfirmationMode(value as 'auto' | 'manual')}
            className="space-y-4"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="manual" id="manual" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="manual" className="font-medium">Manuális megerősítés</Label>
                <p className="text-sm text-gray-500">
                  Minden foglalást manuálisan kell megerősítened. A foglalások "Függőben" állapotban maradnak, amíg jóvá nem hagyod őket.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="auto" id="auto" className="mt-1" />
              <div className="grid gap-1.5">
                <Label htmlFor="auto" className="font-medium">Automatikus megerősítés</Label>
                <p className="text-sm text-gray-500">
                  A rendszer automatikusan megerősíti a foglalásokat. Minden új foglalás azonnal "Megerősítve" állapotba kerül.
                </p>
              </div>
            </div>
          </RadioGroup>
          
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mentés...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Beállítások mentése
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingConfirmationSettings;
