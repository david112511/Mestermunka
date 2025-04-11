import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export type NotificationType = 'message' | 'appointment' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  content: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  reference_id?: string; // pl. üzenet_id, appointment_id
  reference_type?: string; // pl. 'message', 'appointment'
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const channelRef = useRef<any>(null);

  // Értesítések lekérdezése
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Lekérdezzük az értesítéseket
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Hiba az értesítések lekérdezésekor:', error);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az értesítéseket.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Ha nincsenek értesítések, üres tömböt állítunk be
      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      // Összegyűjtjük a küldők azonosítóit
      const senderIds = notificationsData
        .filter(notification => notification.sender_id)
        .map(notification => notification.sender_id);
      
      // Ha vannak küldők, lekérdezzük az adataikat
      let sendersData: any[] = [];
      if (senderIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', senderIds);
        
        if (profilesError) {
          console.error('Hiba a küldők adatainak lekérdezésekor:', profilesError);
        } else {
          sendersData = profiles || [];
        }
      }
      
      // Összekapcsoljuk az értesítéseket a küldők adataival
      const notificationsWithSenders = notificationsData.map(notification => {
        if (!notification.sender_id) return notification;
        
        const sender = sendersData.find(sender => sender.id === notification.sender_id);
        return {
          ...notification,
          sender: sender || null
        };
      });
      
      // Beállítjuk az értesítéseket
      setNotifications(notificationsWithSenders);
      
      // Megszámoljuk az olvasatlan értesítéseket
      const unread = notificationsWithSenders.filter(notification => !notification.is_read).length;
      setUnreadCount(unread);
      
      setLoading(false);
    } catch (error) {
      console.error('Hiba az értesítések lekérdezésekor:', error);
      setLoading(false);
    }
  }, [user, toast]);

  // Értesítés megjelölése olvasottként
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Hiba az értesítés olvasottként jelölésekor:', error);
        return;
      }
      
      // Frissítjük a helyi állapotot
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Frissítjük az olvasatlan értesítések számát
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Hiba az értesítés olvasottként jelölésekor:', error);
    }
  }, [user]);

  // Összes értesítés megjelölése olvasottként
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) {
        console.error('Hiba az összes értesítés olvasottként jelölésekor:', error);
        return;
      }
      
      // Frissítjük a helyi állapotot
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Frissítjük az olvasatlan értesítések számát
      setUnreadCount(0);
    } catch (error) {
      console.error('Hiba az összes értesítés olvasottként jelölésekor:', error);
    }
  }, [user]);

  // Értesítés törlése
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Hiba az értesítés törlésekor:', error);
        return;
      }
      
      // Frissítjük a helyi állapotot
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
      
      // Ha az értesítés olvasatlan volt, frissítjük az olvasatlan értesítések számát
      const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Hiba az értesítés törlésekor:', error);
    }
  }, [user, notifications]);

  // Értesítés létrehozása (ezt főleg a szerver oldalon használjuk, de teszteléshez hasznos lehet)
  const createNotification = useCallback(async (
    userId: string,
    content: string,
    type: NotificationType,
    referenceId?: string,
    referenceType?: string,
    senderId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            content,
            type,
            reference_id: referenceId,
            reference_type: referenceType,
            sender_id: senderId,
            is_read: false
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Hiba az értesítés létrehozásakor:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Hiba az értesítés létrehozásakor:', error);
      return null;
    }
  }, []);

  // Feliratkozás az értesítésekre, amikor a felhasználó bejelentkezik
  useEffect(() => {
    if (!user) return;
    
    // Értesítések lekérdezése
    fetchNotifications();
    
    // Feliratkozás az értesítések változásaira
    const setupChannel = () => {
      // Ha már van csatorna, eltávolítjuk
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      // Új csatorna létrehozása
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('Értesítés esemény:', payload);
            
            // Ha új értesítés érkezett
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification;
              
              // Ha van sender_id, lekérjük a küldő adatait
              if (newNotification.sender_id) {
                const { data: senderData, error: senderError } = await supabase
                  .from('profiles')
                  .select('id, first_name, last_name, avatar_url')
                  .eq('id', newNotification.sender_id)
                  .single();
                
                if (!senderError && senderData) {
                  newNotification.sender = senderData;
                }
              }
              
              // Hozzáadjuk az új értesítést a listához
              setNotifications(prev => [newNotification, ...prev]);
              
              // Növeljük az olvasatlan értesítések számát
              setUnreadCount(prev => prev + 1);
              
              // Megjelenítünk egy toast üzenetet
              toast({
                title: 'Új értesítés',
                description: newNotification.content,
                variant: 'default',
              });
            }
            // Ha egy értesítést olvasottként jelöltek
            else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification;
              
              // Frissítjük a helyi állapotot
              setNotifications(prev => 
                prev.map(notification => 
                  notification.id === updatedNotification.id 
                    ? { ...notification, ...updatedNotification } 
                    : notification
                )
              );
              
              // Ha olvasottként jelölték, frissítjük az olvasatlan értesítések számát
              if (updatedNotification.is_read && !payload.old.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
            // Ha egy értesítést töröltek
            else if (payload.eventType === 'DELETE') {
              const deletedNotification = payload.old as Notification;
              
              // Frissítjük a helyi állapotot
              setNotifications(prev => 
                prev.filter(notification => notification.id !== deletedNotification.id)
              );
              
              // Ha az értesítés olvasatlan volt, frissítjük az olvasatlan értesítések számát
              if (!deletedNotification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`Feliratkozás állapota a notifications:${user.id} csatornára:`, status);
        });
      
      // Beállítjuk a csatornát
      channelRef.current = channel;
    };
    
    setupChannel();
    
    // Leiratkozás a csatornáról, amikor a komponens unmountol
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, toast]); // Hozzáadtuk a toast-ot a függőségi listához

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  };
};
