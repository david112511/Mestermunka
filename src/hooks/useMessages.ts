import { useState, useEffect, useCallback, useRef } from 'react';
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
  message_type: 'text' | 'image' | 'video' | 'file' | 'emoji';
  file_url?: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
  thumbnail_url?: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  reply_to_id?: string;
  reply_to_content?: string;
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
  
  // Realtime csatornák referenciái
  const channelRef = useRef<any>(null);
  const conversationsChannelRef = useRef<any>(null);
  const [messagesChannel, setMessagesChannel] = useState<any>(null);
  const [conversationsChannel, setConversationsChannel] = useState<any>(null);
  
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
      // 1. Lekérdezzük a felhasználó beszélgetés-azonosítóit
      const { data: participantsData, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
        
      if (participantsError) {
        console.error('Hiba a beszélgetés résztvevők lekérdezésekor:', participantsError);
        setError('Nem sikerült betölteni a beszélgetéseket.');
        setConversationsLoading(false);
        return;
      }
      
      if (!participantsData || participantsData.length === 0) {
        setConversations([]);
        setConversationsLoading(false);
        return;
      }
      
      // Kigyűjtjük a beszélgetés azonosítókat
      const conversationIds = participantsData.map(p => p.conversation_id);
      
      // 2. Lekérdezzük a beszélgetéseket az azonosítók alapján
      const { data: userConversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });
        
      if (conversationsError) {
        console.error('Hiba a beszélgetések lekérdezésekor:', conversationsError);
        setError('Nem sikerült betölteni a beszélgetéseket.');
        setConversationsLoading(false);
        return;
      }
      
      if (!userConversations || userConversations.length === 0) {
        setConversations([]);
        setConversationsLoading(false);
        return;
      }
      
      // 3. Minden beszélgetéshez lekérdezzük a résztvevőket
      const processedConversations = await Promise.all(
        userConversations.map(async (conversation) => {
          try {
            // 3.1 Közvetlenül a Supabase REST API-t használjuk az RLS helyett
            const { data: allParticipants, error: allParticipantsError } = await supabase.rpc(
              'get_conversation_participants_for_user',
              { user_id_param: user.id, conversation_id_param: conversation.id }
            );
              
            if (allParticipantsError) {
              console.error('Hiba a résztvevők lekérdezésekor:', allParticipantsError);
              return {
                ...conversation,
                participants: [],
                last_message: undefined,
                unread_count: 0
              };
            }
            
            // 3.3 Lekérdezzük az utolsó üzenetet
            const { data: lastMessages, error: lastMessageError } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (lastMessageError) {
              console.error('Hiba az utolsó üzenet lekérdezésekor:', lastMessageError);
            }
            
            // 3.4 Lekérdezzük az olvasatlan üzenetek számát
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
              participants: allParticipants || [],
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
        // Feliratkozás a beszélgetés üzeneteire, hogy azonnal értesüljünk az új üzenetekről
        subscribeToMessages(conversationId);
        return;
      }
      
      // Üzenetek feldolgozása
      const processedMessages = await Promise.all(
        data.map(async (message) => {
          try {
            // Küldő adatainak lekérdezése
            const { data: senderData, error: senderError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', message.sender_id)
              .single();
              
            if (senderError) throw senderError;
            
            return {
              ...message,
              sender: senderData
            };
          } catch (error) {
            console.error('Hiba az üzenet feldolgozásakor:', error);
            return message;
          }
        })
      );
      
      setMessages(processedMessages);
      setLoading(false);
      
      // Üzenetek olvasottként jelölése
      if (user.id) {
        markMessagesAsReadInternal(conversationId);
      }
      
      // Feliratkozás a beszélgetés üzeneteire, hogy azonnal értesüljünk az új üzenetekről
      subscribeToMessages(conversationId);
      
    } catch (error) {
      console.error('Hiba az üzenetek lekérdezésekor:', error);
      setError('Nem sikerült betölteni az üzeneteket.');
      setLoading(false);
    }
  }, [user]);

  // Üzenetek olvasottnak jelölése (belső függvény a ciklikus függőség elkerülésére)
  const markMessagesAsReadInternal = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;
    
    try {
      // Próbáljuk meg először az RPC függvényt használni
      const { error: rpcError } = await supabase
        .rpc('mark_messages_as_read', {
          conversation_id_param: conversationId,
          user_id_param: user.id
        });
      
      // Ha az RPC nem működik, akkor használjuk a hagyományos módszert
      if (rpcError) {
        console.log('RPC függvény nem elérhető, hagyományos módszer használata:', rpcError);
        
        // Üzenetek olvasottnak jelölése
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .not('sender_id', 'eq', user.id)
          .eq('is_read', false);
          
        if (error) throw error;
        
        // Frissítjük az unread_count értéket az adatbázisban
        try {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ unread_count: 0 })
            .eq('id', conversationId);
            
          if (updateError) {
            console.error('Hiba az olvasatlan üzenetek számának frissítésekor:', updateError);
          }
        } catch (updateError) {
          console.error('Hiba az olvasatlan üzenetek számának frissítésekor:', updateError);
        }
      }
      
      // Frissítjük a beszélgetések listáját
      fetchConversations();
    } catch (error) {
      console.error('Hiba az üzenetek olvasottként jelölésekor:', error);
    }
  }, [user, fetchConversations]);

  // Feliratkozás egy beszélgetés üzeneteire
  const subscribeToMessages = useCallback((conversationId: string) => {
    if (!conversationId) return;
    
    // Először leíratkozunk az előző csatornáról, ha volt
    if (messagesChannel) {
      supabase.removeChannel(messagesChannel);
    }
    
    // Új csatorna létrehozása és feliratkozás
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          console.log('Új üzenet esemény:', payload);
          
          // Új üzenet érkezett
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            
            // Küldő adatainak lekérdezése
            const { data: senderData, error: senderError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMessage.sender_id)
              .single();
              
            if (senderError) {
              console.error('Hiba a küldő adatainak lekérdezésekor:', senderError);
              return;
            }
            
            // Üzenet hozzáadása a listához
            setMessages(prevMessages => [
              ...prevMessages,
              { ...newMessage, sender: senderData }
            ]);
            
            // Ha nem a saját üzenetünk, akkor jelöljük olvasottként
            if (newMessage.sender_id !== user?.id) {
              markMessagesAsReadInternal(conversationId);
            }
          }
          
          // Üzenet frissítve
          else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as Message;
            
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
              )
            );
          }
          
          // Üzenet törölve
          else if (payload.eventType === 'DELETE') {
            const deletedMessage = payload.old as Message;
            
            setMessages(prevMessages => 
              prevMessages.filter(msg => msg.id !== deletedMessage.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log(`Feliratkozás állapota a messages:${conversationId} csatornára:`, status);
      });
    
    // Csatorna mentése, hogy később leíratkozhassunk
    setMessagesChannel(channel);
    
  }, [user?.id, markMessagesAsReadInternal]);

  // Feliratkozás a beszélgetések változásaira
  const subscribeToConversations = useCallback(() => {
    if (!user?.id) return;
    
    // Először leíratkozunk az előző csatornáról, ha volt
    if (conversationsChannel) {
      supabase.removeChannel(conversationsChannel);
    }
    
    // Új csatorna létrehozása és feliratkozás
    const channel = supabase
      .channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        async (payload) => {
          console.log('Beszélgetés esemény:', payload);
          
          // Frissítjük a beszélgetések listáját
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log(`Feliratkozás állapota a conversations:${user.id} csatornára:`, status);
      });
    
    // Csatorna mentése, hogy később leíratkozhassunk
    setConversationsChannel(channel);
    
  }, [user?.id, fetchConversations]);

  // Üzenetküldés
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    messageType: 'text' | 'image' | 'video' | 'file' | 'emoji' = 'text',
    fileData?: {
      url?: string;
      type?: string;
      name?: string;
      size?: number;
      thumbnailUrl?: string;
    },
    replyData?: {
      reply_to_id: string;
      reply_to_content: string;
    }
  ) => {
    if (!user) return;
    
    try {
      // Üzenet létrehozása
      const messageData = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        is_read: false,
        message_type: messageType,
        file_url: fileData?.url || null,
        file_type: fileData?.type || null,
        file_name: fileData?.name || null,
        file_size: fileData?.size || null,
        thumbnail_url: fileData?.thumbnailUrl || null,
        reply_to_id: replyData?.reply_to_id || null,
        reply_to_content: replyData?.reply_to_content || null
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select();
        
      if (error) {
        console.error('Hiba az üzenet küldése közben:', error);
        throw new Error('Nem sikerült elküldeni az üzenetet.');
      }
      
      // Frissítjük a beszélgetés updated_at mezőjét
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
        
      if (updateError) {
        console.error('Hiba a beszélgetés frissítése közben:', updateError);
      }
      
      // Mivel realtime csatornákat használunk, nem kell újra lekérdezni az üzeneteket
      // A realtime csatorna automatikusan frissíti az üzeneteket
      
      return data;
    } catch (error) {
      console.error('Hiba az üzenet küldése közben:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült elküldeni az üzenetet.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Üzenetek olvasottnak jelölése
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    return markMessagesAsReadInternal(conversationId);
  }, [markMessagesAsReadInternal]);

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
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); // Csak a saját üzeneteinket törölhetjük
      
      if (error) {
        console.error('Hiba az üzenet törlésekor:', error);
        throw error;
      }
      
      // Frissítjük a helyi üzenetlistát
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      return true;
    } catch (error) {
      console.error('Hiba az üzenet törlése közben:', error);
      return false;
    }
  }, [user]);

  // Üzenet szerkesztése
  const updateMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!user) return;
    
    try {
      console.log(`Üzenet szerkesztése: ${messageId}, új tartalom: ${newContent}`);
      
      const { data, error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId)
        .eq('sender_id', user.id) // Csak a saját üzeneteinket szerkeszthetjük
        .select()
        .single();
      
      if (error) {
        console.error('Hiba az üzenet szerkesztésekor:', error);
        throw error;
      }
      
      console.log('Szerkesztett üzenet:', data);
      
      // Frissítjük a helyi üzenetlistát
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ));
      
      return data;
    } catch (error) {
      console.error('Hiba az üzenet szerkesztése közben:', error);
      throw error;
    }
  }, [user]);

  // Reakciók kezelése
  const getMessageReactions = useCallback(async (messageId: string) => {
    try {
      console.log(`Reakciók lekérdezése a(z) ${messageId} üzenethez`);
      
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
        return localReactions ? JSON.parse(localReactions) : [];
      }
      
      // Ha a tábla létezik, lekérjük a reakciókat
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);
      
      if (error) {
        console.error('Hiba a reakciók lekérdezésekor:', error);
        throw error;
      }
      
      console.log(`${data?.length || 0} reakció található a(z) ${messageId} üzenethez:`, data);
      
      return data || [];
    } catch (error) {
      console.error('Hiba a reakciók lekérdezésekor:', error);
      return [];
    }
  }, []);

  // Reakció hozzáadása
  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user) throw new Error('Nincs bejelentkezett felhasználó');
    
    try {
      console.log(`Reakció hozzáadása: ${reaction} a(z) ${messageId} üzenethez`);
      
      // Először ellenőrizzük, hogy létezik-e a message_reactions tábla
      const { error: checkError } = await supabase
        .from('message_reactions')
        .select('id')
        .limit(1);
      
      // Ha a tábla nem létezik vagy hiba történt, használjuk a localStorage-ot
      if (checkError) {
        console.error('Hiba a reakciók ellenőrzésekor:', checkError);
        
        // Lekérjük a meglévő reakciókat
        const localReactions = localStorage.getItem(`message_reactions_${messageId}`);
        const reactions = localReactions ? JSON.parse(localReactions) : [];
        
        // Ellenőrizzük, hogy a felhasználó már hozzáadott-e ilyen reakciót
        const existingReactionIndex = reactions.findIndex(r => 
          r.user_id === user.id && r.reaction === reaction
        );
        
        // Ha már létezik ilyen reakció, töröljük
        if (existingReactionIndex !== -1) {
          reactions.splice(existingReactionIndex, 1);
          localStorage.setItem(`message_reactions_${messageId}`, JSON.stringify(reactions));
          return null;
        }
        
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
      
      // Ellenőrizzük, hogy a felhasználó már hozzáadott-e ilyen reakciót
      const { data: existingReactions } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction', reaction);
      
      // Ha már létezik ilyen reakció, töröljük
      if (existingReactions && existingReactions.length > 0) {
        console.log('Meglévő reakció törlése:', existingReactions[0].id);
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existingReactions[0].id);
        
        if (deleteError) {
          console.error('Hiba a reakció törlésekor:', deleteError);
          throw deleteError;
        }
        
        console.log('Reakció sikeresen törölve');
        return null;
      }
      
      // Ha nem létezik, hozzáadjuk
      console.log('Új reakció hozzáadása az adatbázishoz');
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
      
      if (error) {
        console.error('Hiba a reakció beszúrásakor:', error);
        throw error;
      }
      
      console.log('Reakció sikeresen hozzáadva:', data);
      return data;
    } catch (error) {
      console.error('Hiba a reakció hozzáadása közben:', error);
      return null;
    }
  }, [user]);

  // Feliratkozás az üzenet reakciók változásaira
  const subscribeToMessageReactions = useCallback((messageId: string, callback: (reactions: any[]) => void) => {
    if (!messageId) return;
    
    console.log(`Feliratkozás a message_reactions:${messageId} csatornára...`);
    
    // Ellenőrizzük, hogy van-e már ilyen csatorna
    try {
      // Csatorna létrehozása és feliratkozás
      const channel = supabase
        .channel(`message_reactions:${messageId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
            filter: `message_id=eq.${messageId}`
          },
          async (payload) => {
            console.log('Reakció esemény:', payload);
            
            try {
              // Lekérjük az összes reakciót az üzenethez
              const reactions = await getMessageReactions(messageId);
              console.log(`Frissített reakciók a(z) ${messageId} üzenethez:`, reactions);
              
              // Visszahívjuk a callback függvényt az új reakciókkal
              callback(reactions);
            } catch (error) {
              console.error(`Hiba a reakciók lekérdezésekor a(z) ${messageId} üzenethez:`, error);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Feliratkozás állapota a message_reactions:${messageId} csatornára:`, status);
          
          // Ellenőrizzük, hogy a csatorna sikeresen feliratkozott-e
          if (status === 'CHANNEL_ERROR') {
            console.error(`Hiba a feliratkozáskor a message_reactions:${messageId} csatornára. Állapot:`, status);
          }
        });
      
      return channel;
    } catch (error) {
      console.error(`Hiba a message_reactions:${messageId} csatorna létrehozásakor:`, error);
      return null;
    }
  }, [getMessageReactions]);

  // Feliratkozás a beszélgetések frissítéseire
  useEffect(() => {
    if (user) {
      // Beszélgetések lekérdezése
      fetchConversations();
      
      // Feliratkozás a beszélgetések változásaira
      subscribeToConversations();
      
      return () => {
        // Leiratkozás a csatornáról
        if (conversationsChannel) {
          supabase.removeChannel(conversationsChannel);
        }
      };
    }
  }, [user, fetchConversations, subscribeToConversations]);

  // Feliratkozás az aktuális beszélgetés üzeneteire
  useEffect(() => {
    if (user && currentConversationId) {
      // Üzenetek lekérdezése
      fetchMessages(currentConversationId);
      
      return () => {
        // Leiratkozás a csatornáról
        if (messagesChannel) {
          supabase.removeChannel(messagesChannel);
        }
      };
    }
  }, [user, currentConversationId, fetchMessages]);

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
    getMessageReactions,
    subscribeToMessageReactions
  };
};
