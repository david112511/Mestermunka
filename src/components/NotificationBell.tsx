import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    fetchNotifications
  } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [localUnreadCount, setLocalUnreadCount] = useState<number>(0);
  const isInitialMount = useRef(true);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Frissítjük a lokális állapotot, amikor a notifications változik
  useEffect(() => {
    console.log('Notifications változott:', notifications.length, 'db');
    
    // Mindig frissítsük a lokális állapotot, amikor a notifications változik
    setLocalNotifications(notifications);
    setLocalUnreadCount(unreadCount);
    
    // Ha ez nem az első betöltés, ellenőrizzük, hogy van-e új értesítés
    if (!isInitialMount.current) {
      // Ha a popover nincs nyitva, vizuálisan jelezhetjük az új értesítést
      if (!open && bellRef.current) {
        // Itt akár animációt is hozzáadhatnánk a csengő ikonhoz
        bellRef.current.classList.add('animate-ring');
        setTimeout(() => {
          if (bellRef.current) {
            bellRef.current.classList.remove('animate-ring');
          }
        }, 1000);
      }
    } else {
      isInitialMount.current = false;
    }
  }, [notifications, unreadCount, open]);

  // Amikor a popover kinyílik, frissítjük az értesítéseket
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Frissítjük az értesítéseket, amikor kinyitjuk a menüt
      fetchNotifications();
    }
  };

  // Értesítés kezelése kattintáskor
  const handleNotificationClick = (notification: any) => {
    // Megjelöljük olvasottként
    markAsRead(notification.id);
    
    // Navigálunk a megfelelő oldalra az értesítés típusa alapján
    if (notification.type === 'message' && notification.reference_id) {
      // Ha üzenet értesítés, akkor a beszélgetéshez navigálunk
      if (notification.sender_id) {
        navigate(`/messages/${notification.sender_id}`);
      } else {
        navigate('/messages');
      }
    } else if (notification.type === 'appointment' && notification.reference_id) {
      // Ha időpontfoglalás értesítés, akkor a naptárhoz navigálunk
      navigate('/calendar');
    } else {
      // Egyéb esetben a kezdőlapra navigálunk
      navigate('/');
    }
    
    // Bezárjuk a popover-t
    setOpen(false);
  };

  // Értesítés ikon megjelenítése
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'appointment':
        return '📅';
      case 'system':
        return '🔔';
      default:
        return '🔔';
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          ref={bellRef}
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {localUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
              {localUnreadCount > 9 ? '9+' : localUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4">
          <h4 className="text-sm font-medium">Értesítések</h4>
          {localUnreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllAsRead()}
              className="text-xs text-muted-foreground"
            >
              Összes olvasottnak jelölése
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {localNotifications.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nincsenek értesítések
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {localNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                    !notification.is_read ? 'bg-muted/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.sender ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={notification.sender.avatar_url} alt={`${notification.sender.first_name} ${notification.sender.last_name}`} />
                      <AvatarFallback>
                        {notification.sender.first_name.charAt(0)}
                        {notification.sender.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <span>{getNotificationIcon(notification.type)}</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      {notification.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.created_at), 'MMM d, HH:mm', { locale: hu })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <span className="sr-only">Törlés</span>
                    <span className="h-3 w-3">×</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
