import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, addHours, startOfWeek, endOfWeek, addDays, startOfDay, endOfDay, isToday, isWithinInterval } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import TrainerAvailabilityCalendar from '@/components/TrainerAvailabilityCalendar';

/**
 * Ez a komponens a Calendar oldalt egészíti ki az edzői elérhetőségek kezelésével
 * Az URL paraméterek alapján dönti el, hogy a naptárat vagy az elérhetőségi beállításokat jelenítse meg
 */
export default function CalendarWithAvailability() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAvailability, setShowAvailability] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<'month' | 'week' | 'day'>('month');
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Az URL paraméterek alapján állítjuk be, hogy az elérhetőségi beállításokat vagy a naptárat jelenítsük meg
  useEffect(() => {
    const availabilityParam = searchParams.get('availability');
    setShowAvailability(availabilityParam === 'true');
    
    const viewParam = searchParams.get('view') as 'month' | 'week' | 'day' | null;
    if (viewParam && ['month', 'week', 'day'].includes(viewParam)) {
      setActiveView(viewParam);
    }
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
  
  // Nézet váltása (hónap, hét, nap)
  const handleViewChange = (view: 'month' | 'week' | 'day') => {
    setActiveView(view);
    searchParams.set('view', view);
    setSearchParams(searchParams);
  };
  
  // Előző időszak
  const handlePrevious = () => {
    if (activeView === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (activeView === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (activeView === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    }
  };
  
  // Következő időszak
  const handleNext = () => {
    if (activeView === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (activeView === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (activeView === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    }
  };
  
  // Vissza a mai naphoz
  const handleToday = () => {
    setCurrentDate(new Date());
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
  
  // Havi nézet renderelése
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: hu });
    const endDate = endOfWeek(monthEnd, { locale: hu });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    const daysOfWeek = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysOfWeek.map((day, index) => (
            <div key={index} className="py-2 font-medium text-sm text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, dayIdx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={dayIdx}
                className={`
                  min-h-[80px] p-2 border rounded-md
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                  ${isToday(day) ? 'border-primary' : 'border-gray-200'}
                  hover:bg-gray-50 transition-colors
                `}
                onClick={() => {
                  setCurrentDate(day);
                  handleViewChange('day');
                }}
              >
                <div className={`text-right ${isToday(day) ? 'font-bold text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                {/* Itt jelenhetnek meg az események */}
                <div className="mt-1 space-y-1 text-xs">
                  {/* Példa esemény */}
                  {isCurrentMonth && dayIdx % 5 === 0 && (
                    <div className="bg-blue-100 text-blue-800 p-1 rounded truncate">
                      Példa esemény
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Heti nézet renderelése
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: hu });
    const weekEnd = endOfWeek(currentDate, { locale: hu });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-8 gap-1">
          <div className="border-b pb-2"></div>
          {days.map((day, dayIdx) => (
            <div 
              key={dayIdx} 
              className={`text-center border-b pb-2 ${isToday(day) ? 'font-bold text-primary' : ''}`}
              onClick={() => {
                setCurrentDate(day);
                handleViewChange('day');
              }}
            >
              <div className="text-sm">{format(day, 'EEE', { locale: hu })}</div>
              <div className={`text-lg ${isToday(day) ? 'text-primary' : ''}`}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-8 gap-1 h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <>
              <div key={`hour-${hour}`} className="text-xs text-right pr-2 pt-2 text-gray-500">
                {`${hour}:00`}
              </div>
              {days.map((day, dayIdx) => {
                const hourDate = new Date(day);
                hourDate.setHours(hour, 0, 0, 0);
                
                return (
                  <div 
                    key={`${dayIdx}-${hour}`} 
                    className={`border border-gray-100 h-12 ${
                      isToday(day) && new Date().getHours() === hour 
                        ? 'bg-blue-50' 
                        : ''
                    }`}
                  >
                    {/* Itt jelenhetnek meg az események */}
                    {dayIdx % 3 === 0 && hour === 10 && (
                      <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded m-1 truncate">
                        10:00 - 11:00 Példa esemény
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    );
  };
  
  // Napi nézet renderelése
  const renderDayView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className={`text-xl font-semibold ${isToday(currentDate) ? 'text-primary' : ''}`}>
            {format(currentDate, 'yyyy. MMMM d., EEEE', { locale: hu })}
          </h2>
        </div>
        
        <div className="space-y-1">
          {hours.map((hour) => {
            const hourDate = new Date(currentDate);
            hourDate.setHours(hour, 0, 0, 0);
            const isCurrentHour = new Date().getHours() === hour && isToday(currentDate);
            
            return (
              <div 
                key={hour} 
                className={`grid grid-cols-[80px_1fr] border rounded-md ${
                  isCurrentHour ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="text-right pr-4 py-3 text-gray-500 font-medium">
                  {`${hour}:00`}
                </div>
                <div className="py-3 px-4 min-h-[60px]">
                  {/* Itt jelenhetnek meg az események */}
                  {hour === 14 && (
                    <div className="bg-blue-100 text-blue-800 p-2 rounded">
                      14:00 - 15:30 Példa esemény
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Ma
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <CardTitle className="text-xl ml-2">
                  {activeView === 'month' && format(currentDate, 'yyyy. MMMM', { locale: hu })}
                  {activeView === 'week' && `${format(startOfWeek(currentDate, { locale: hu }), 'yyyy. MMM d.', { locale: hu })} - ${format(endOfWeek(currentDate, { locale: hu }), 'MMM d.', { locale: hu })}`}
                  {activeView === 'day' && format(currentDate, 'yyyy. MMMM d.', { locale: hu })}
                </CardTitle>
              </div>
              
              <Tabs value={activeView} onValueChange={(value) => handleViewChange(value as 'month' | 'week' | 'day')}>
                <TabsList>
                  <TabsTrigger value="month">Hónap</TabsTrigger>
                  <TabsTrigger value="week">Hét</TabsTrigger>
                  <TabsTrigger value="day">Nap</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          
          <CardContent>
            <div id="calendar-container">
              {activeView === 'month' && renderMonthView()}
              {activeView === 'week' && renderWeekView()}
              {activeView === 'day' && renderDayView()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
