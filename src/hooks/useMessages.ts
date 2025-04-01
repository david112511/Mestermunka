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
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  }[];
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Beszélgetések lekérdezése
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    setConversationsLoading(true);
    setError(null);
    
    try {
      // Közvetlenül a conversations táblából kérdezzük le az adatokat
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
      
      // Azonosítjuk azokat a beszélgetéseket, amelyekben a felhasználó részt vesz
      let userConversationIds: string[] = [];
      
      try {
        // Lekérdezzük a conversation_participants táblából a felhasználó beszélgetéseit
        const { data: participantsData, error: participantsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id)
          .limit(100);
          
        if (participantsError) {
          console.error('Hiba a beszélgetés résztvevők lekérdezésekor:', participantsError);
        } else if (participantsData && participantsData.length > 0) {
          userConversationIds = participantsData.map(p => p.conversation_id);
        }
      } catch (error) {
        console.error('Hiba a beszélgetés résztvevők lekérdezésekor:', error);
      }
      
      // Ha nem találtunk beszélgetéseket, akkor minden beszélgetést megjelenítünk
      // Ez nem ideális, de jobb, mint ha semmit sem jelenítenénk meg
      const conversationsToProcess = userConversationIds.length > 0
        ? allConversations.filter(c => userConversationIds.includes(c.id))
        : allConversations;
      
      // Lekérdezzük a résztvevőket minden beszélgetéshez
      const processedConversations = await Promise.all(
        conversationsToProcess.map(async (conversation) => {
          try {
            // Lekérdezzük a résztvevőket
            const { data: participants, error: participantsError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conversation.id);
              
            if (participantsError) {
              console.error('Hiba a résztvevők lekérdezésekor:', participantsError);
              return conversation;
            }
            
            // Lekérdezzük a résztvevők profiladatait
            const participantIds = participants?.map(p => p.user_id) || [];
            
            if (participantIds.length === 0) {
              return conversation;
            }
            
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', participantIds);
              
            if (profilesError) {
              console.error('Hiba a profilok lekérdezésekor:', profilesError);
              return conversation;
            }
            
            // Lekérdezzük az utolsó üzenetet
            const { data: lastMessages, error: lastMessageError } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (lastMessageError) {
              console.error('Hiba az utolsó üzenet lekérdezésekor:', lastMessageError);
            }
            
            // Lekérdezzük az olvasatlan üzenetek számát
            const { data: unreadMessages, error: unreadError } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conversation.id)
              .eq('is_read', false)
              .not('sender_id', 'eq', user.id);
              
            if (unreadError) {
              console.error('Hiba az olvasatlan üzenetek lekérdezésekor:', unreadError);
            }
            
            return {
              ...conversation,
              participants: profiles || [],
              last_message: lastMessages && lastMessages.length > 0 ? lastMessages[0] : undefined,
              unread_count: unreadMessages ? unreadMessages.length : 0
            };
          } catch (error) {
            console.error('Hiba a beszélgetés feldolgozásakor:', error);
            return conversation;
          }
        })
      );
      
      setConversations(processedConversations);
      setConversationsLoading(false);
    } catch (error) {
      console.error('Hiba a beszélgetések lekérdezésekor:', error);
      setError('Nem sikerült betölteni a beszélgetéseket.');
      setConversationsLoading(false);
    }
  }, [user]);

  // Üzenetek lekérdezése
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;
    
    setLoading(true);
    setError(null);
    setCurrentConversationId(conversationId);
    
    try {
      // Üzenetek lekérdezése
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }
      
      // Küldők lekérdezése
      const senderIds = [...new Set(data.map(message => message.sender_id))];
      
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
      
      // Olvasottnak jelöljük az üzeneteket
      await markMessagesAsRead(conversationId);
      
    } catch (error) {
      console.error('Hiba az üzenetek lekérdezésekor:', error);
      setError('Nem sikerült betölteni az üzeneteket.');
      setLoading(false);
    }
  }, [user]);

  // Üzenet küldése
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
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
      fetchConversations();
      
      // Ha az aktuális beszélgetésben vagyunk, frissítjük az üzeneteket is
      if (currentConversationId === conversationId) {
        fetchMessages(conversationId);
      }
      
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
  }, [user, currentConversationId, fetchConversations, fetchMessages]);

  // Üzenetek olvasottnak jelölése
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .not('sender_id', 'eq', user.id)
        .eq('is_read', false);
        
      if (error) throw error;
      
      // Nem frissítjük automatikusan a beszélgetéseket
    } catch (error) {
      console.error('Hiba az üzenetek olvasottnak jelölésekor:', error);
    }
  }, [user]);

  // Új beszélgetés létrehozása vagy meglévő keresése
  const createOrFindConversation = useCallback(async (otherUserId: string) => {
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
      fetchConversations();
      
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
  }, [user, fetchConversations]);

  // Beszélgetések lekérdezése a komponens betöltésekor
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Nem iratkozunk fel az új üzenetekre, mert az végtelen ciklust okozhat
  // Helyette manuálisan frissítünk

  // Üzenet törlése
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      if (!user) throw new Error('A felhasználó nincs bejelentkezve');
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);
        
      if (error) throw error;
      
      // Frissítsük a beszélgetéseket a törlés után
      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Hiba az üzenet törlése közben:', error);
      throw error;
    }
  }, [user, fetchConversations]);

  // Üzenet szerkesztése
  const updateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      if (!user) throw new Error('A felhasználó nincs bejelentkezve');
      
      const { error } = await supabase
        .from('messages')
        .update({ content })
        .eq('id', messageId)
        .eq('sender_id', user.id);
        
      if (error) throw error;
      
      // Frissítsük a beszélgetéseket és az üzeneteket a szerkesztés után
      if (currentConversationId) {
        await fetchMessages(currentConversationId);
      }
      await fetchConversations();
      return true;
    } catch (error) {
      console.error('Hiba az üzenet szerkesztése közben:', error);
      throw error;
    }
  }, [user, fetchConversations, fetchMessages, currentConversationId]);

  // Reakciók kezelése
  const getMessageReactions = useCallback(async (messageId: string) => {
    if (!user) return [];
    
    try {
      // Először ellenőrizzük, hogy létezik-e a message_reactions tábla
      const { error: checkError } = await supabase
        .from('message_reactions')
        .select('id')
        .limit(1);
      
      // Ha a tábla nem létezik, használjuk a localStorage-ot
      if (checkError && checkError.message.includes('does not exist')) {
        console.log('message_reactions tábla nem létezik, localStorage használata');
        const localReactions = localStorage.getItem(`message_reactions_${messageId}`);
        return localReactions ? JSON.parse(localReactions) : [];
      }
      
      // Ha a tábla létezik, lekérdezzük a reakciókat
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Hiba a reakciók lekérdezése közben:', error);
      
      // Fallback: localStorage használata
      const localReactions = localStorage.getItem(`message_reactions_${messageId}`);
      return localReactions ? JSON.parse(localReactions) : [];
    }
  }, [user, supabase]);

  // Reakció hozzáadása
  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user) throw new Error('Nincs bejelentkezett felhasználó');
    
    try {
      // Először ellenőrizzük, hogy létezik-e a message_reactions tábla
      const { error: checkError } = await supabase
        .from('message_reactions')
        .select('id')
        .limit(1);
      
      // Ha a tábla nem létezik, használjuk a localStorage-ot
      if (checkError && checkError.message.includes('does not exist')) {
        console.log('message_reactions tábla nem létezik, localStorage használata');
        
        // Lekérjük a meglévő reakciókat
        const localReactions = localStorage.getItem(`message_reactions_${messageId}`);
        const reactions = localReactions ? JSON.parse(localReactions) : [];
        
        // Hozzáadjuk az új reakciót
        const newReaction = {
          id: Date.now().toString(),
          message_id: messageId,
          user_id: user.id,
          reaction,
          created_at: new Date().toISOString()
        };
        
        reactions.push(newReaction);
        
        // Mentjük a localStorage-ba
        localStorage.setItem(`message_reactions_${messageId}`, JSON.stringify(reactions));
        
        return newReaction;
      }
      
      // Ha a tábla létezik, hozzáadjuk a reakciót
      const { data, error } = await supabase
        .from('message_reactions')
        .insert([
          {
            message_id: messageId,
            user_id: user.id,
            reaction
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Hiba a reakció hozzáadása közben:', error);
      
      // Ha adatbázis hiba történt, próbáljuk meg localStorage-ba menteni
      if (error.message && (error.message.includes('does not exist') || error.code === '42P01')) {
        // Lekérjük a meglévő reakciókat
        const localReactions = localStorage.getItem(`message_reactions_${messageId}`);
        const reactions = localReactions ? JSON.parse(localReactions) : [];
        
        // Hozzáadjuk az új reakciót
        const newReaction = {
          id: Date.now().toString(),
          message_id: messageId,
          user_id: user.id,
          reaction,
          created_at: new Date().toISOString()
        };
        
        reactions.push(newReaction);
        
        // Mentjük a localStorage-ba
        localStorage.setItem(`message_reactions_${messageId}`, JSON.stringify(reactions));
        
        return newReaction;
      }
      
      throw error;
    }
  }, [user, supabase]);

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
    refreshConversations: fetchConversations,
    currentConversation: currentConversationId,
    setCurrentConversation: setCurrentConversationId,
    deleteMessage,
    updateMessage,
    addReaction,
    getMessageReactions
  };
};
