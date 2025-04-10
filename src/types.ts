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
