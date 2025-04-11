import React from 'react';
import { format, isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
  getEventTypeColor: (type: string) => string;
  selectedDate: Date | null;
}

export default function MonthView({
  currentDate,
  events,
  onSelectDay,
  onSelectEvent,
  getEventTypeColor,
  selectedDate
}: MonthViewProps) {
  // Hónap napjainak listája
  const daysInMonth = React.useMemo(() => {
    // Meghatározzuk a hónap első napját
    const firstDay = startOfMonth(currentDate);
    // Meghatározzuk a hónap első hetének első napját (hétfő)
    const startDate = startOfWeek(firstDay, { locale: hu, weekStartsOn: 1 });
    // Meghatározzuk a hónap utolsó napját
    const lastDay = endOfMonth(currentDate);
    // Meghatározzuk a hónap utolsó hetének utolsó napját (vasárnap)
    const endDate = endOfWeek(lastDay, { locale: hu, weekStartsOn: 1 });
    
    // Visszaadjuk a napok listáját
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Nap eseményeinek lekérése
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_time);
      return isSameDay(eventDate, day);
    });
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Hét napjai */}
      {['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map((day, index) => (
        <div key={index} className="text-center font-medium text-gray-500 py-2">
          {day}
        </div>
      ))}
      
      {/* Naptár napjai */}
      {daysInMonth.map((day, index) => {
        const dayEvents = getEventsForDay(day);
        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isCurrentMonth = isSameMonth(day, currentDate);
        
        return (
          <div
            key={index}
            className={`
              min-h-[100px] border rounded-lg p-2 transition-colors
              ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
              ${isToday ? 'border-primary' : 'border-gray-200'}
              ${isSelected ? 'ring-2 ring-primary ring-opacity-50' : ''}
              hover:border-primary cursor-pointer
            `}
            onClick={() => onSelectDay(day)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {dayEvents.length}
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 mt-1">
              {dayEvents.slice(0, 3).map((event, eventIndex) => (
                <div
                  key={eventIndex}
                  className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${getEventTypeColor(event.type)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(event);
                  }}
                >
                  {format(parseISO(event.start_time), 'HH:mm')} {event.title}
                </div>
              ))}
              
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 pl-1">
                  +{dayEvents.length - 3} további
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
