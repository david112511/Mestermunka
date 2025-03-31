-- create_availability_exceptions_table.sql
-- Ez a függvény létrehozza a trainer_availability_exceptions táblát, ha még nem létezik

CREATE OR REPLACE FUNCTION create_availability_exceptions_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ellenőrizzük, hogy a tábla létezik-e
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trainer_availability_exceptions'
  ) THEN
    -- Létrehozzuk a táblát
    CREATE TABLE public.trainer_availability_exceptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      trainer_id UUID NOT NULL,
      exception_date DATE NOT NULL,
      original_slot_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      
      CONSTRAINT fk_trainer_id
        FOREIGN KEY (trainer_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE
    );
    
    -- RLS beállítása
    ALTER TABLE public.trainer_availability_exceptions ENABLE ROW LEVEL SECURITY;
    
    -- Hozzáférési szabályok
    CREATE POLICY "Trainers can view their own exceptions"
      ON public.trainer_availability_exceptions
      FOR SELECT
      USING (auth.uid() = trainer_id);
      
    CREATE POLICY "Trainers can insert their own exceptions"
      ON public.trainer_availability_exceptions
      FOR INSERT
      WITH CHECK (auth.uid() = trainer_id);
      
    CREATE POLICY "Trainers can update their own exceptions"
      ON public.trainer_availability_exceptions
      FOR UPDATE
      USING (auth.uid() = trainer_id)
      WITH CHECK (auth.uid() = trainer_id);
      
    CREATE POLICY "Trainers can delete their own exceptions"
      ON public.trainer_availability_exceptions
      FOR DELETE
      USING (auth.uid() = trainer_id);
  END IF;
END;
$$;
