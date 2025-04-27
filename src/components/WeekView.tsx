import React from 'react';
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Event } from '@/types';

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
  setActiveView: (view: 'month' | 'week' | 'day') => void;
  getEventTypeColor: (type: string) => string;
}

export default function WeekView({
  currentDate,
  events,
  onSelectDay,
  onSelectEvent,
  setActiveView,
  getEventTypeColor
}: WeekViewProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-1">
        <div className="border-b pb-2"></div>
        {eachDayOfInterval({
          start: startOfWeek(currentDate, { locale: hu, weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { locale: hu, weekStartsOn: 1 })
        }).map((day, dayIdx) => (
          <div 
            key={dayIdx} 
            className={`text-center border-b pb-2 ${isSameDay(day, new Date()) ? 'font-bold text-primary' : ''}`}
            onClick={() => {
              onSelectDay(day);
              setActiveView('day');
            }}
          >
            <div className="text-sm">{format(day, 'EEE', { locale: hu })}</div>
            <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-8 gap-1 h-[600px] overflow-y-auto">
        {Array.from({ length: 14 }, (_, i) => i + 7).map((hour) => (
          <React.Fragment key={`hour-${hour}`}>
            <div className="text-xs text-right pr-2 pt-2 text-gray-500">
              {`${hour}:00`}
            </div>
            {eachDayOfInterval({
              start: startOfWeek(currentDate, { locale: hu, weekStartsOn: 1 }),
              end: endOfWeek(currentDate, { locale: hu, weekStartsOn: 1 })
            }).map((day, dayIdx) => {
              const hourDate = new Date(day);
              hourDate.setHours(hour, 0, 0, 0);
              
              // Események az adott órához és naphoz
              const hourEvents = events.filter(event => {
                const eventStart = parseISO(event.start_time);
                const eventEnd = parseISO(event.end_time);
                return isSameDay(day, eventStart) && 
                       eventStart.getHours() <= hour && 
                       eventEnd.getHours() >= hour;
              });
              
              return (
                <div 
                  key={`${dayIdx}-${hour}`} 
                  className={`border border-gray-100 h-12 relative ${
                    isSameDay(day, new Date()) && new Date().getHours() === hour 
                      ? 'bg-blue-50' 
                      : ''
                  }`}
                  onClick={() => {
                    const newDate = new Date(day);
                    newDate.setHours(hour, 0, 0, 0);
                    onSelectDay(newDate);
                  }}
                >
                  {hourEvents.map((event, eventIndex) => (
                    <div 
                      key={eventIndex}
                      className={`absolute inset-0 m-0.5 p-1 rounded text-xs text-white ${getEventTypeColor(event.type)} overflow-hidden`}
                      style={{
                        opacity: 0.9,
                        zIndex: 10
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
