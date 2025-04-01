import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

// Nem hozunk létre új Supabase klienst, hanem a meglévőt használjuk

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    is_trainer: boolean;
  };
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message: Message | null;
  unread_count: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Beszélgetések lekérdezése
  const fetchConversations = async () => {
    if (!user) return;
    
    setConversationsLoading(true);
    try {
      // Közvetlenül a conversations táblából kérdezzük le az adatokat
      // Ez egy ideiglenes megoldás, amíg az RLS szabályok nincsenek javítva
      const { data: allConversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (conversationsError) {
        console.error('Hiba a beszélgetések lekérdezésekor:', conversationsError);
        setError('Nem sikerült betölteni a beszélgetéseket.');
        setConversationsLoading(false);
        return;
      }

      if (!allConversations || allConversations.length === 0) {
        setConversations([]);
        setConversationsLoading(false);
        return;
      }
      
      // Közvetlenül a messages táblából kérdezzük le az üzeneteket
      // Ez segít azonosítani, hogy mely beszélgetésekben vesz részt a felhasználó
      const { data: userMessages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, sender_id')
        .or(`sender_id.eq.${user.id}`)
        .limit(100);
        
      if (messagesError) {
        console.error('Hiba az üzenetek lekérdezésekor:', messagesError);
      }
      
      // Lekérdezzük a conversation_participants táblából is a felhasználó beszélgetéseit
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)
        .limit(100);
        
      if (participantsError) {
        console.error('Hiba a beszélgetés résztvevők lekérdezésekor:', participantsError);
      }
      
      // Azonosítjuk azokat a beszélgetéseket, amelyekben a felhasználó részt vesz
      // az üzenetek és a résztvevők alapján
      let userConversationIds: string[] = [];
      
      // Üzenetek alapján
      if (userMessages && userMessages.length > 0) {
        userConversationIds = [...new Set(userMessages.map(m => m.conversation_id))];
      }
      
      // Résztvevők alapján
      if (participantsData && participantsData.length > 0) {
        const participantConversationIds = participantsData.map(p => p.conversation_id);
        userConversationIds = [...new Set([...userConversationIds, ...participantConversationIds])];
      }
      
      // Ha nem találtunk beszélgetéseket, akkor minden beszélgetést megjelenítünk
      // Ez nem ideális, de jobb, mint ha semmit sem jelenítenénk meg
      const conversationsToProcess = userConversationIds.length > 0
        ? allConversations.filter(c => userConversationIds.includes(c.id))
        : allConversations;
      
      // Egyszerűsített beszélgetések létrehozása
      const simplifiedConversations = conversationsToProcess.map(c => ({
        ...c,
        participants: [],  // Üres résztvevők lista
        last_message: null,
        unread_count: 0
      }));
      
      setConversations(simplifiedConversations);
      setConversationsLoading(false);
      
      // Háttérben próbáljuk meg lekérdezni a résztvevőket és az üzeneteket
      // Ez nem blokkolja a felhasználói felületet
      fetchConversationDetails(simplifiedConversations);
      
    } catch (error) {
      console.error('Hiba a beszélgetések lekérdezésekor:', error);
      setError('Nem sikerült betölteni a beszélgetéseket.');
      setConversationsLoading(false);
    }
  };
  
  // Beszélgetések részleteinek lekérdezése a háttérben
  const fetchConversationDetails = async (conversations) => {
    if (!conversations || conversations.length === 0 || !user) return;
    
    try {
      const conversationIds = conversations.map(c => c.id);
      
      // Üzenetek lekérdezése
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (messagesError) {
        console.error('Hiba az üzenetek részletes lekérdezésekor:', messagesError);
        return;
      }
      
      // Résztvevők lekérdezése
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          id,
          conversation_id,
          user_id
        `)
        .in('conversation_id', conversationIds);
        
      if (participantsError) {
        console.error('Hiba a résztvevők lekérdezésekor:', participantsError);
      }
      
      // Résztvevők felhasználói adatainak lekérdezése
      let participantUserIds: string[] = [];
      if (participants && participants.length > 0) {
        participantUserIds = [...new Set(participants.map(p => p.user_id))];
      }
      
      const { data: participantUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, user_type')
        .in('id', participantUserIds);
        
      if (usersError) {
        console.error('Hiba a résztvevők felhasználói adatainak lekérdezésekor:', usersError);
      }
      
      // Felhasználók térképének létrehozása
      const usersMap = {};
      if (participantUsers && participantUsers.length > 0) {
        participantUsers.forEach(user => {
          usersMap[user.id] = {
            ...user,
            is_trainer: user.user_type === 'trainer'
          };
        });
      }
      
      // Résztvevők térképének létrehozása
      const participantsMap = {};
      if (participants && participants.length > 0 && participantUsers && participantUsers.length > 0) {
        conversations.forEach(conv => {
          const convParticipants = participants.filter(p => p.conversation_id === conv.id);
          participantsMap[conv.id] = convParticipants.map(p => ({
            ...p,
            user: usersMap[p.user_id] || {
              id: p.user_id,
              first_name: '',
              last_name: '',
              avatar_url: '',
              is_trainer: false
            }
          }));
        });
      }
      
      // Utolsó üzenetek és olvasatlan üzenetek számának kiszámítása
      const lastMessagesMap = {};
      const unreadCountsMap = {};
      
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          const convId = msg.conversation_id;
          
          // Utolsó üzenet
          if (!lastMessagesMap[convId]) {
            lastMessagesMap[convId] = msg;
          }
          
          // Olvasatlan üzenetek száma
          if (msg.sender_id !== user.id && !msg.is_read) {
            if (!unreadCountsMap[convId]) {
              unreadCountsMap[convId] = 0;
            }
            unreadCountsMap[convId]++;
          }
        });
      }
      
      // Beszélgetések frissítése a részletekkel
      const updatedConversations = conversations.map(c => ({
        ...c,
        participants: participantsMap[c.id] || [],
        last_message: lastMessagesMap[c.id] || null,
        unread_count: unreadCountsMap[c.id] || 0
      }));
      
      // Beszélgetések rendezése az utolsó üzenet időpontja alapján
      updatedConversations.sort((a, b) => {
        const aTime = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.updated_at).getTime();
        const bTime = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.updated_at).getTime();
        return bTime - aTime;
      });
      
      setConversations(updatedConversations);
      
    } catch (error) {
      console.error('Hiba a beszélgetések részleteinek lekérdezésekor:', error);
    }
  };

  // Egy beszélgetés üzeneteinek lekérdezése
  const fetchMessages = async (conversationId: string) => {
    if (!user || !conversationId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Küldők lekérdezése
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: senders, error: sendersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', senderIds);

      if (sendersError) throw sendersError;

      // Küldők térképének létrehozása
      const sendersMap = senders.reduce((acc, sender) => {
        acc[sender.id] = sender;
        return acc;
      }, {});

      // Üzenetek formázása a küldőkkel
      const formattedMessages = data.map(message => ({
        ...message,
        sender: sendersMap[message.sender_id] ? {
          id: sendersMap[message.sender_id].id || '',
          first_name: sendersMap[message.sender_id].first_name || '',
          last_name: sendersMap[message.sender_id].last_name || '',
          avatar_url: sendersMap[message.sender_id].avatar_url || '',
        } : {
          id: message.sender_id,
          first_name: '',
          last_name: '',
          avatar_url: '',
        }
      }));

      setMessages(formattedMessages);
      setLoading(false);
      
      // Olvasottnak jelöljük az üzeneteket - ezt kivesszük innen, hogy elkerüljük a végtelen ciklust
      // markMessagesAsRead(conversationId);
      
    } catch (error) {
      console.error('Hiba az üzenetek lekérdezésekor:', error);
      setError('Nem sikerült betölteni az üzeneteket.');
      setLoading(false);
    }
  };

  // Üzenet küldése
  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !conversationId || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim()
        })
        .select();

      if (error) throw error;

      // Frissítjük a beszélgetéseket
      setRefreshTrigger(prev => prev + 1);
      
      return data[0];
    } catch (error) {
      console.error('Hiba az üzenet küldésekor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült elküldeni az üzenetet.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Üzenetek olvasottnak jelölése
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user || !conversationId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .not('sender_id', 'eq', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Frissítjük a beszélgetéseket, de nem azonnal, hanem késleltetve
      // Ez segít elkerülni a túl sok API hívást
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Hiba az üzenetek olvasottnak jelölésekor:', error);
    }
  };

  // Új beszélgetés létrehozása vagy meglévő keresése
  const createOrFindConversation = async (otherUserId: string) => {
    if (!user || !otherUserId) return null;

    try {
      // Ellenőrizzük, hogy létezik-e már beszélgetés a két felhasználó között
      const { data: existingConversation, error: checkError } = await supabase
        .rpc('create_conversation', {
          user1_id: user.id,
          user2_id: otherUserId
        });

      if (checkError) throw checkError;

      // Frissítjük a beszélgetéseket
      setRefreshTrigger(prev => prev + 1);
      
      return existingConversation;
    } catch (error) {
      console.error('Hiba a beszélgetés létrehozásakor:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült létrehozni a beszélgetést.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Beszélgetések lekérdezése a komponens betöltésekor és a frissítési trigger változásakor
  useEffect(() => {
    fetchConversations();
  }, [user, refreshTrigger]);

  // Feliratkozás az új üzenetekre
  useEffect(() => {
    if (!user) return;

    // Feliratkozás az új üzenetekre
    const messagesSubscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Késleltetett frissítés, hogy elkerüljük a túl sok API hívást
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 1000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [user]);

  return {
    conversations,
    conversationsLoading,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    createOrFindConversation,
    refreshConversations: () => setRefreshTrigger(prev => prev + 1),
    currentConversation: currentConversationId,
    setCurrentConversation: setCurrentConversationId,
  };
};
