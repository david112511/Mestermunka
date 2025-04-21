import { Link } from 'react-router-dom';
import { UserProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Calendar, 
  Settings, 
  LogOut, 
  ChevronDown,
  Clock,
  MessageCircle,
  Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef, useReducer } from 'react';

interface ProfileMenuProps {
  profile: UserProfile | null;
}

export const ProfileMenu = ({ profile }: ProfileMenuProps) => {
  const { toast } = useToast();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    fetchNotifications
  } = useNotifications();
  
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLButtonElement>(null);
  const prevNotificationsLengthRef = useRef(notifications.length);
  
  // Kényszerített újrarendereléshez
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  // Figyelünk a notifications változására
  useEffect(() => {
    console.log('ProfileMenu: Notifications változott:', notifications.length, 'db');
    
    // Ha új értesítés érkezett és nem az első betöltés
    if (notifications.length > prevNotificationsLengthRef.current) {
      console.log('ProfileMenu: Új értesítés érkezett!');
      
      // Kényszerített újrarenderelés
      forceUpdate();
      
      // Ha a popover nincs nyitva, vizuálisan jelezhetjük az új értesítést
      if (!isPopoverOpen && popoverRef.current) {
        // Animáció a csengő ikonhoz
        popoverRef.current.classList.add('animate-bounce');
        setTimeout(() => {
          if (popoverRef.current) {
            popoverRef.current.classList.remove('animate-bounce');
          }
        }, 1000);
      }
    }
    
    // Frissítjük a korábbi értesítések számát
    prevNotificationsLengthRef.current = notifications.length;
  }, [notifications, isPopoverOpen]);
  
  // Időzített frissítés - 5 másodpercenként ellenőrizzük az értesítéseket
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 5000); // 5 másodpercenként
    
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);
  
  // Amikor a popover kinyílik, frissítjük az értesítéseket
  const handlePopoverOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open) {
      // Frissítjük az értesítéseket, amikor kinyitjuk a menüt
      fetchNotifications();
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Sikeres kijelentkezés",
        description: "Viszlát legközelebb!",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!profile) return 'U';
    
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    } else if (firstName) {
      return firstName.charAt(0);
    } else {
      return 'U';
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
        window.location.href = `/messages/${notification.sender_id}`;
      } else {
        window.location.href = '/messages';
      }
    } else if (notification.type === 'appointment' && notification.reference_id) {
      // Ha időpontfoglalás értesítés, akkor a naptárhoz navigálunk
      window.location.href = '/calendar';
    }
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
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:bg-gray-700/30 px-3 py-2 rounded-lg transition-colors">
          <Avatar className="h-8 w-8 border border-primary/20">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.first_name || 'Felhasználó'} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:inline-block text-white">
            {profile?.first_name || 'Felhasználó'}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-300" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1 border border-gray-200 shadow-lg rounded-lg bg-white">
          <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100 mb-1">
            {profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name}`
              : 'Felhasználó'
            }
          </div>
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              <User className="mr-2 h-4 w-4 text-primary" />
              <span>Profilom</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/calendar" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <span>Naptáram</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/messages" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              <MessageCircle className="mr-2 h-4 w-4 text-primary" />
              <span>Üzenetek</span>
            </Link>
          </DropdownMenuItem>
          {profile?.is_trainer && (
            <DropdownMenuItem asChild>
              <Link to="/calendar?availability=true" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                <span>Elérhetőségeim</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/settings" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              <Settings className="mr-2 h-4 w-4 text-primary" />
              <span>Beállítások</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 bg-gray-100" />
          <DropdownMenuItem 
            onClick={handleLogout} 
            className="px-3 py-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md my-1 focus:bg-red-50 focus:text-red-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Kijelentkezés</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Értesítések ikon */}
      <Popover onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <button 
            ref={popoverRef}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-700/30 hover:bg-gray-700/50 transition-colors relative"
          >
            <Bell className="h-5 w-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-white border-0 shadow-lg rounded-lg" align="end">
          <div className="flex items-center justify-between p-4">
            <h4 className="text-sm font-medium">Értesítések</h4>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-muted-foreground hover:text-gray-900"
              >
                Összes olvasottnak jelölése
              </button>
            )}
          </div>
          <Separator />
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Nincsenek értesítések
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
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
                    <button
                      className="h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <span className="sr-only">Törlés</span>
                      <span className="h-3 w-3">×</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};
