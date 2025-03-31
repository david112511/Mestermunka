-- Appointment status enum
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');

-- Trainer availability table
CREATE TABLE IF NOT EXISTS trainer_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 (Sunday) to 6 (Saturday)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

-- Create index on trainer_id
CREATE INDEX idx_trainer_availability_trainer_id ON trainer_availability(trainer_id);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_appointment_time CHECK (start_time < end_time),
  CONSTRAINT different_users CHECK (client_id != trainer_id)
);

-- Create indexes
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_trainer_id ON appointments(trainer_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);

-- Add RLS policies
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Trainer availability policies
CREATE POLICY "Trainers can view their own availability"
  ON trainer_availability
  FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert their own availability"
  ON trainer_availability
  FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own availability"
  ON trainer_availability
  FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own availability"
  ON trainer_availability
  FOR DELETE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Users can view trainer availability"
  ON trainer_availability
  FOR SELECT
  USING (is_available = true);

-- Appointments policies
CREATE POLICY "Clients can view their own appointments"
  ON appointments
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view appointments where they are the trainer"
  ON appointments
  FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can insert their own appointments"
  ON appointments
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own appointments with pending or confirmed status"
  ON appointments
  FOR UPDATE
  USING (auth.uid() = client_id AND (status = 'pending' OR status = 'confirmed'));

CREATE POLICY "Trainers can update appointments where they are the trainer"
  ON appointments
  FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients can cancel their own appointments"
  ON appointments
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (status = 'cancelled');

-- Create function to check if appointment time is within trainer availability
CREATE OR REPLACE FUNCTION check_appointment_availability()
RETURNS TRIGGER AS $$
DECLARE
  day_of_week INTEGER;
  start_time TIME;
  end_time TIME;
  availability_exists BOOLEAN;
BEGIN
  -- Get day of week and time from appointment
  day_of_week := EXTRACT(DOW FROM NEW.start_time);
  start_time := NEW.start_time::TIME;
  end_time := NEW.end_time::TIME;
  
  -- Check if trainer has availability for this time slot
  SELECT EXISTS (
    SELECT 1 FROM trainer_availability
    WHERE trainer_id = NEW.trainer_id
    AND day_of_week = EXTRACT(DOW FROM NEW.start_time)
    AND start_time <= NEW.start_time::TIME
    AND end_time >= NEW.end_time::TIME
    AND is_available = true
  ) INTO availability_exists;
  
  IF NOT availability_exists THEN
    RAISE EXCEPTION 'Appointment time is outside of trainer availability';
  END IF;
  
  -- Check for overlapping appointments
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE trainer_id = NEW.trainer_id
    AND id != NEW.id  -- Skip the current appointment when updating
    AND status != 'cancelled' AND status != 'rejected'
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Appointment overlaps with an existing appointment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment validation
CREATE TRIGGER validate_appointment
BEFORE INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION check_appointment_availability();

-- Create function to update calendar events when appointments change
CREATE OR REPLACE FUNCTION sync_appointments_to_events()
RETURNS TRIGGER AS $$
BEGIN
  -- For new appointments or status changes
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    -- Only create/update events for confirmed appointments
    IF NEW.status = 'confirmed' THEN
      -- Insert or update the event
      INSERT INTO events (
        title,
        description,
        start_time,
        end_time,
        location,
        type,
        trainer_id,
        client_id,
        appointment_id
      ) VALUES (
        NEW.title,
        NEW.description,
        NEW.start_time,
        NEW.end_time,
        NEW.location,
        'training',
        NEW.trainer_id,
        NEW.client_id,
        NEW.id
      )
      ON CONFLICT (appointment_id)
      DO UPDATE SET
        title = NEW.title,
        description = NEW.description,
        start_time = NEW.start_time,
        end_time = NEW.end_time,
        location = NEW.location,
        updated_at = NOW();
    ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      -- If status changed from confirmed to something else, delete the event
      DELETE FROM events WHERE appointment_id = NEW.id;
    END IF;
  END IF;
  
  -- For deleted appointments
  IF TG_OP = 'DELETE' THEN
    DELETE FROM events WHERE appointment_id = OLD.id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing appointments to events
CREATE TRIGGER sync_appointments
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW
EXECUTE FUNCTION sync_appointments_to_events();

-- Add appointment_id to events table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'appointment_id'
  ) THEN
    ALTER TABLE events ADD COLUMN appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE CASCADE;
  END IF;
END $$;
