export type EventType = 'personal' | 'training' | 'group';

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  type: EventType;
  is_recurring?: boolean;
}

// Foglalási rendszer típusok
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type ConfirmationMode = 'auto' | 'manual';

export interface TrainerSettings {
  id: string;
  trainer_id: string;
  min_duration: number;
  max_duration: number;
  time_step: number;
  cancellation_policy?: string;
  confirmation_mode: ConfirmationMode;
  daily_booking_limit?: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  trainer_id: string;
  name: string;
  duration: number;
  price: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  trainer_id: string;
  service_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}
