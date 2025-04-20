import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export type NotificationType = 'message' | 'appointment' | 'system';

// Értesítés interfész definiálása a tényleges adatbázis szerkezet alapján
export interface Notification {
  id: string;
  user_id: string;
  content: string;
  type: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
  is_read: boolean;
  sender_id?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  } | null;
}

// Kompatibilitási osztály a kódban használt mezőnevek kezelésére
export class NotificationWithCompat implements Notification {
  id: string;
  user_id: string;
  content: string;
  type: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
  is_read: boolean;
  sender_id?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  } | null;
  
  constructor(notification: Notification) {
    this.id = notification.id;
    this.user_id = notification.user_id;
    this.content = notification.content;
    this.type = notification.type;
    this.reference_id = notification.reference_id;
    this.reference_type = notification.reference_type;
    this.created_at = notification.created_at;
    this.is_read = notification.is_read;
    this.sender_id = notification.sender_id;
    this.sender = notification.sender;
  }
  
  // Getter a subject mezőhöz (a type mezőt használjuk)
  get subject(): string {
    return this.type;
  }
  
  // Getter a title mezőhöz (a type mezőt használjuk)
  get title(): string {
    return this.type;
  }
  
  // Getter a message mezőhöz (a content mező már létezik)
  get message(): string {
    return this.content;
  }
  
  // Getter a related_to mezőhöz (a reference_type mezőt használjuk)
  get related_to(): string | undefined {
    return this.reference_type;
  }
  
  // Getter a related_id mezőhöz (a reference_id mezőt használjuk)
  get related_id(): string | undefined {
    return this.reference_id;
  }
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<NotificationWithCompat[]>([]);
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
        console.error('Hiba részletei:', error.message, error.details, error.hint);
        toast({
          title: 'Hiba történt',
          description: 'Nem sikerült betölteni az értesítéseket: ' + error.message,
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
      
      // Konvertáljuk az értesítéseket a kompatibilitási osztályba
      console.log('Eredeti értesítés adatok:', notificationsData);
      
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
      
      // Összekapcsoljuk az értesítéseket a küldők adataival és konvertáljuk NotificationWithCompat osztályba
      const notificationsWithSenders = notificationsData.map(notification => {
        let notificationWithSender = { ...notification };
        
        if (notification.sender_id) {
          const sender = sendersData.find(sender => sender.id === notification.sender_id);
          notificationWithSender.sender = sender || null;
        }
        
        // Konvertáljuk NotificationWithCompat osztályba
        return new NotificationWithCompat(notificationWithSender as Notification);
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
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Frissítjük a helyi állapotot
      setNotifications(prev =>
        prev.map(n => {
          if (n.id === notificationId) {
            const updatedNotification = { ...n, is_read: true, updated_at: new Date().toISOString() };
            return new NotificationWithCompat(updatedNotification);
          }
          return n;
        })
      );
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
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      
      // Frissítjük a helyi állapotot
      setNotifications(prev =>
        prev.map(n => {
          const updatedNotification = { ...n, is_read: true, updated_at: new Date().toISOString() };
          return new NotificationWithCompat(updatedNotification);
        })
      );
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

  // Új értesítés létrehozása
  const createNotification = useCallback(async (
    userId: string,
    notificationType: string,
    content: string,
    referenceType?: string,
    referenceId?: string,
    senderId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            type: notificationType,
            content,
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
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Konvertáljuk az új értesítést NotificationWithCompat osztályba
            const rawNotification = payload.new as Notification;
            const newNotification = new NotificationWithCompat(rawNotification);
            
            console.log('Valós idejű értesítés érkezett:', rawNotification);
            
            // Frissítjük a helyi állapotot
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Megjelenítünk egy toast értesítést
            toast({
              title: newNotification.subject, // Használjuk a subject mezőt title helyett
              description: newNotification.content, // Használjuk a content mezőt message helyett
              variant: 'default',
            });
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
  }, [user, toast, fetchNotifications]); // Hozzáadtuk a fetchNotifications-t is a függőségi listához

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
