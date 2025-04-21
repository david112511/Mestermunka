import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Event } from '@/types';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
  getEventTypeColor: (type: string) => string;
}

export default function DayView({
  currentDate,
  events,
  onSelectDay,
  onSelectEvent,
  getEventTypeColor
}: DayViewProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className={`text-xl font-semibold ${isSameDay(currentDate, new Date()) ? 'text-primary' : ''}`}>
          {format(currentDate, 'yyyy. MMMM d., EEEE', { locale: hu })}
        </h2>
      </div>
      
      <div className="space-y-1">
        {Array.from({ length: 14 }, (_, i) => i + 7).map((hour) => {
          const hourDate = new Date(currentDate);
          hourDate.setHours(hour, 0, 0, 0);
          const isCurrentHour = new Date().getHours() === hour && isSameDay(currentDate, new Date());
          
          // Események az adott órához
          const hourEvents = events.filter(event => {
            const eventStart = parseISO(event.start_time);
            const eventEnd = parseISO(event.end_time);
            return isSameDay(currentDate, eventStart) && 
                  eventStart.getHours() <= hour && 
                  eventEnd.getHours() >= hour;
          });
          
          return (
            <div 
              key={hour} 
              className={`grid grid-cols-[80px_1fr] border rounded-md ${
                isCurrentHour ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
              }`}
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setHours(hour, 0, 0, 0);
                onSelectDay(newDate);
              }}
            >
              <div className="text-right pr-4 py-3 text-gray-500 font-medium">
                {`${hour}:00`}
              </div>
              <div className="py-3 px-4 min-h-[60px]">
                {hourEvents.map((event, eventIndex) => (
                  <div 
                    key={eventIndex}
                    className={`${getEventTypeColor(event.type)} text-white p-2 rounded mb-2`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs">
                      {format(parseISO(event.start_time), 'HH:mm')} - {format(parseISO(event.end_time), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
