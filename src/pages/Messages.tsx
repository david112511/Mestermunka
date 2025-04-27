import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  memo,
  useMemo
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, Conversation, Message } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import FileUploader from '@/components/FileUploader';
import EmojiPicker from '@/components/EmojiPicker';
import { 
  Send, 
  Search, 
  User, 
  Clock, 
  Loader2, 
  ChevronLeft,
  MessageSquare,
  MessageCircle,
  Check,
  CheckCheck,
  Trash,
  MoreVertical,
  Edit,
  Smile,
  Plus,
  X,
  Paperclip,
  Reply,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, differenceInDays, differenceInMinutes } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/components/ui/use-toast';
import ConversationList from '@/components/ConversationList';

// ...

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showConversationList, setShowConversationList] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showEmojiKeyboard, setShowEmojiKeyboard] = useState<string | null>(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [commonEmojis] = useState(['😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '✨', '🙏', '👏', '🤝', '🤗', '🤩', '😎', '🥳']);
  const [messageReactions, setMessageReactions] = useState<{[key: string]: any[]}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { 
    conversations, 
    conversationsLoading, 
    messages, 
    loading, 
    error, 
    sendMessage, 
    fetchMessages, 
    setCurrentConversation,
    currentConversation,
    deleteMessage,
    updateMessage,
    addReaction,
    getMessageReactions,
    markMessagesAsRead,
    subscribeToMessageReactions
  } = useMessages();

  // Képernyőméret figyelése
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) {
        setShowConversationList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Üzenetküldés kezelése
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || !newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      await sendMessage(currentConversation, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Hiba az üzenet küldése közben:', error);
      toast({
        variant: "destructive",
        title: "Hiba történt",
        description: "Az üzenet küldése sikertelen volt. Kérjük, próbáld újra.",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Üzenet törlés kezelése
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    try {
      await deleteMessage(messageToDelete.id);
      setMessageToDelete(null);
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Hiba az üzenet törlése közben:', error);
      toast({
        title: "Hiba történt",
        description: error?.message || 'Ismeretlen hiba történt az üzenet törlése közben.',
        variant: "destructive",
      });
    }
  };

  // Üzenet szerkesztése
  const handleEditMessage = (message: Message) => {
    console.log('handleEditMessage called with message:', message);
    console.log('Előző editingMessage állapot:', editingMessage);
    
    // Explicit módon állítjuk be az editingMessage állapotot
    setEditingMessage(prevState => {
      console.log('setEditingMessage callback, előző állapot:', prevState);
      console.log('Új állapot beállítása:', message);
      return message;
    });
    
    // Görgetés a chat input mezőhöz
    setTimeout(() => {
      console.log('Görgetés a chat input mezőhöz');
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      
      // Ellenőrizzük, hogy a textarea fókuszálva van-e
      if (document.activeElement instanceof HTMLTextAreaElement) {
        console.log('Textarea már fókuszálva van');
      } else {
        console.log('Textarea nincs fókuszálva');
        // Próbáljuk meg manuálisan fókuszálni a textarea-t
        const textarea = document.querySelector('textarea');
        if (textarea) {
          console.log('Textarea manuális fókuszálása');
          textarea.focus();
        }
      }
    }, 100);
  };

  // Válasz üzenetre
  const handleReplyToMessage = (message: Message) => {
    console.log('handleReplyToMessage called with message:', message);
    console.log('Előző replyingToMessage állapot:', replyingToMessage);
    
    // Beállítjuk a válaszolandó üzenetet
    setReplyingToMessage(prevState => {
      console.log('setReplyingToMessage callback, előző állapot:', prevState);
      console.log('Új állapot beállítása:', message);
      return message;
    });
    
    // Görgetés a chat input mezőhöz
    setTimeout(() => {
      console.log('Görgetés a chat input mezőhöz');
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
      
      // Fókuszáljuk a textarea-t
      const textarea = document.querySelector('textarea');
      if (textarea) {
        console.log('Textarea manuális fókuszálása');
        textarea.focus();
      }
    }, 100);
  };

  // Gépelés jelzés kezelése
  const handleTyping = () => {
    setIsTyping(true);
    
    // Töröljük a korábbi időzítőt, ha van
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Állítsunk be egy új időzítőt
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  // Beszélgetés kiválasztása
  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversation(conversationId);
    if (isMobileView) {
      setShowConversationList(false);
    }
  };

  // Vissza gomb kezelése mobilnézetben
  const handleBackToList = () => {
    setShowConversationList(true);
  };

  // Görgetés az üzenetek aljára
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messagesEndRef, scrollAreaRef]);

  // Üzenetek görgetése az aljára
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Üzenetek lekérdezése, amikor a kiválasztott beszélgetés megváltozik
  useEffect(() => {
    let isMounted = true;
    
    const loadMessages = async () => {
      if (currentConversation && isMounted) {
        // Először lekérdezzük az üzeneteket
        await fetchMessages(currentConversation);
        
        // Majd olvasottnak jelöljük őket
        if (isMounted) {
          await markMessagesAsRead(currentConversation);
        }
      }
    };
    
    loadMessages();
    
    return () => {
      isMounted = false;
    };
  }, [currentConversation, fetchMessages, markMessagesAsRead]);

  // Másik résztvevő adatainak lekérése egy beszélgetésből
  const getOtherParticipant = (conversation: Conversation) => {
    if (!conversation.participants || conversation.participants.length === 0) {
      return null;
    }
    return conversation.participants.find(p => p.id !== user?.id) || null;
  };

  // Beszélgetések szűrése a keresés alapján
  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = getOtherParticipant(conversation);
    
    if (!otherParticipant) return false;
    
    const fullName = `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Beszélgetés idejének formázása
  const formatConversationTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: hu });
    } else if (isYesterday(date)) {
      return 'Tegnap ' + format(date, 'HH:mm', { locale: hu });
    } else {
      return format(date, 'yyyy.MM.dd. HH:mm', { locale: hu });
    }
  };

  // Üzenet idejének formázása
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: hu });
    } else if (isYesterday(date)) {
      return 'Tegnap ' + format(date, 'HH:mm', { locale: hu });
    } else {
      return format(date, 'yyyy.MM.dd. HH:mm', { locale: hu });
    }
  };

  // Dátum elválasztó megjelenítése az üzenetek között
  const shouldShowDateSeparator = (message: Message, index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(message.created_at);
    const prevDate = new Date(messages[index - 1].created_at);
    
    return !isSameDay(currentDate, prevDate);
  };

  // Dátum formázása az elválasztóhoz
  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = differenceInDays(now, date);
    
    if (isToday(date)) {
      return 'Ma';
    } else if (isYesterday(date)) {
      return 'Tegnap';
    } else if (diffDays < 7) {
      return format(date, 'EEEE', { locale: hu });
    } else {
      return format(date, 'yyyy. MMMM d.', { locale: hu });
    }
  };

  // Reakciók lekérdezése és feliratkozás a változásokra
  useEffect(() => {
    let isMounted = true;
    const reactionChannels: any[] = [];
    const fetchReactionsQueue = [...messages];
    let isProcessing = false;
    
    // Sorban dolgozzuk fel az üzeneteket, hogy ne terheljük túl a szervert
    const processQueue = async () => {
      if (isProcessing || fetchReactionsQueue.length === 0 || !isMounted) return;
      
      isProcessing = true;
      
      // Kiveszünk egy üzenetet a sorból
      const message = fetchReactionsQueue.shift();
      
      if (message) {
        try {
          console.log(`Reakciók lekérdezése a(z) ${message.id} üzenethez...`);
          
          // Lekérdezzük a reakciókat
          const reactions = await getMessageReactions(message.id);
          
          if (isMounted) {
            console.log(`Reakciók a(z) ${message.id} üzenethez:`, reactions);
            
            // Frissítjük az állapotot
            setMessageReactions(prev => ({
              ...prev,
              [message.id]: reactions
            }));
            
            // Korlátozzuk a csatornák számát, csak az utolsó 10 üzenethez iratkozunk fel
            if (reactionChannels.length < 10) {
              // Feliratkozunk a reakciók változásaira
              const channel = subscribeToMessageReactions(message.id, (updatedReactions) => {
                if (isMounted) {
                  console.log(`Reakció frissítés érkezett a(z) ${message.id} üzenethez:`, updatedReactions);
                  setMessageReactions(prev => ({
                    ...prev,
                    [message.id]: updatedReactions
                  }));
                }
              });
              
              if (channel) {
                reactionChannels.push(channel);
              }
            }
          }
        } catch (error) {
          console.error('Hiba a reakciók lekérdezésekor:', error);
        }
      }
      
      isProcessing = false;
      
      // Ha még van elem a sorban, folytatjuk a feldolgozást
      if (fetchReactionsQueue.length > 0 && isMounted) {
        setTimeout(processQueue, 100); // Kis késleltetés a kérések között
      }
    };
    
    if (messages.length > 0) {
      // Csak az utolsó 20 üzenetet dolgozzuk fel
      const recentMessages = messages.slice(-20);
      fetchReactionsQueue.length = 0;
      fetchReactionsQueue.push(...recentMessages);
      processQueue();
    }
    
    return () => {
      isMounted = false;
      
      // Leiratkozunk a reakció csatornákról
      reactionChannels.forEach(channel => {
        if (channel) {
          try {
            supabase.removeChannel(channel);
          } catch (error) {
            console.error('Hiba a reakció csatorna eltávolításakor:', error);
          }
        }
      });
    };
  }, [messages, getMessageReactions, subscribeToMessageReactions]);

  // Kattintás kezelése a dokumentumon a reakció menü bezárásához
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as HTMLElement;
        // Ellenőrizzük, hogy a kattintás a reakció menün kívül történt-e
        if (!target.closest('.emoji-picker-menu') && !target.closest('.emoji-picker-trigger')) {
          setShowEmojiPicker(null);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-white">Bejelentkezés szükséges</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-gray-400">Az üzenetek megtekintéséhez kérjük, jelentkezz be.</p>
              <Button onClick={() => navigate('/')}>Vissza a főoldalra</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Ellenőrizzük, hogy a felhasználó reagált-e már az üzenetre
  const getUserReactionForMessage = (messageId: string) => {
    if (!user || !messageReactions[messageId]) return null;
    
    const userReaction = messageReactions[messageId].find(
      (reaction: any) => reaction.user_id === user.id
    );
    
    return userReaction ? userReaction.reaction : null;
  };

  // Reakció eltávolítása
  const removeReaction = async (messageId: string) => {
    if (!user) return;
    
    try {
      // Először ellenőrizzük, hogy létezik-e a message_reactions tábla
      const { error: checkError } = await supabase
        .from('message_reactions')
        .select('id')
        .limit(1);
      
      // Ha a tábla nem létezik, használjuk a localStorage-ot
      if (checkError && checkError.message.includes('does not exist')) {
        // Lekérjük a meglévő reakciókat
        const localReactions = localStorage.getItem(`message_reactions_${messageId}`);
        const reactions = localReactions ? JSON.parse(localReactions) : [];
        
        // Eltávolítjuk a felhasználó reakcióját
        const updatedReactions = reactions.filter((r: any) => r.user_id !== user.id);
        
        // Mentjük a localStorage-ba
        localStorage.setItem(`message_reactions_${messageId}`, JSON.stringify(updatedReactions));
        
        // Frissítjük a messageReactions állapotot
        setMessageReactions(prevReactions => {
          const newReactions = { ...prevReactions };
          if (newReactions[messageId]) {
            newReactions[messageId] = newReactions[messageId].filter((r: any) => r.user_id !== user.id);
          }
          return newReactions;
        });
        
        return;
      }
      
      // Ha a tábla létezik, eltávolítjuk a reakciót
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .match({ message_id: messageId, user_id: user.id });
      
      if (error) throw error;
      
      // Frissítjük a messageReactions állapotot
      setMessageReactions(prevReactions => {
        const newReactions = { ...prevReactions };
        if (newReactions[messageId]) {
          newReactions[messageId] = newReactions[messageId].filter((r: any) => r.user_id !== user.id);
        }
        return newReactions;
      });
    } catch (error: any) {
      console.error('Hiba a reakció eltávolítása közben:', error.message || error);
      throw error;
    }
  };

  // Reakció hozzáadása vagy eltávolítása
  const handleReactToMessage = async (messageId: string, reaction: string) => {
    if (!messageId || !reaction || !user) return;
    
    try {
      // Ellenőrizzük, hogy a felhasználó már reagált-e erre az üzenetre
      const currentUserReaction = getUserReactionForMessage(messageId);
      
      // Ha ugyanazzal a reakcióval reagált, akkor töröljük a reakciót
      if (currentUserReaction === reaction) {
        await removeReaction(messageId);
      } else {
        // Ha már van reakciója, először töröljük azt
        if (currentUserReaction) {
          await removeReaction(messageId);
        }
        
        // Aztán hozzáadjuk az új reakciót
        await addReaction(messageId, reaction);
      }
      
      // Frissítjük a reakciókat
      if (messages && messages.length > 0) {
        const reactions: {[key: string]: any[]} = { ...messageReactions };
        
        // Az aktuális üzenethez lekérdezzük a reakciókat
        const messageReactionData = await getMessageReactions(messageId);
        if (messageReactionData && messageReactionData.length > 0) {
          reactions[messageId] = messageReactionData;
        } else {
          // Ha nincsenek reakciók, töröljük a kulcsot
          delete reactions[messageId];
        }
        
        setMessageReactions(reactions);
      }
      
      setShowEmojiPicker(null);
    } catch (error: any) {
      console.error('Hiba a reakció kezelése közben:', error.message || error);
    }
  };

  // Reakció hozzáadása egy üzenethez
  const handleAddReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    
    try {
      console.log(`Reakció hozzáadása: ${reaction} a(z) ${messageId} üzenethez`);
      
      // Hozzáadjuk a reakciót
      const result = await addReaction(messageId, reaction);
      
      // Frissítjük a helyi állapotot
      if (result === null) {
        // Ha null, akkor a reakció törlésre került
        setMessageReactions(prevReactions => {
          const newReactions = { ...prevReactions };
          if (newReactions[messageId]) {
            newReactions[messageId] = newReactions[messageId].filter(
              r => !(r.user_id === user.id && r.reaction === reaction)
            );
          }
          return newReactions;
        });
      } else {
        // Ha nem null, akkor új reakció került hozzáadásra
        const updatedReactions = await getMessageReactions(messageId);
        setMessageReactions(prevReactions => ({
          ...prevReactions,
          [messageId]: updatedReactions
        }));
      }
      
      // Bezárjuk az emoji választót
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Hiba a reakció hozzáadásakor:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Beszélgetések listája - élénk, játékos dizájn */}
        {(showConversationList || !isMobileView) && (
          <ConversationList 
            currentConversation={currentConversation}
            setCurrentConversation={(id) => {
              setCurrentConversation(id);
              if (isMobileView) {
                setShowConversationList(false);
              }
            }}
            isMobileView={isMobileView}
            setShowConversationList={setShowConversationList}
          />
        )}
        
        {/* Beszélgetés tartalma - világos, modern dizájn */}
        <div className={`flex-1 flex flex-col ${(!showConversationList && isMobileView) ? 'block' : 'hidden md:flex'} relative bg-white overflow-hidden`}>
          {currentConversation ? (
            <>
              {/* Beszélgetés fejléc - élénk, vidám */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-500 text-white relative z-10 shadow-md flex-shrink-0">
                {isMobileView && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleBackToList}
                    className="mr-2 hover:bg-white/10 text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                {(() => {
                  const selectedConversation = conversations.find(c => c.id === currentConversation);
                  if (!selectedConversation) return <div>Betöltés...</div>;
                  
                  const participant = getOtherParticipant(selectedConversation);
                  if (!participant) return <div>Ismeretlen beszélgetőpartner</div>;
                  
                  return (
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 border-2 border-white/30 mr-3">
                        <AvatarImage src={participant.avatar_url ?? ''} />
                        <AvatarFallback className="bg-blue-300 text-blue-800">
                          {participant.first_name?.[0]}{participant.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="font-medium text-white text-lg tracking-wide drop-shadow-sm">
                          {participant.first_name || ''} {participant.last_name || ''}
                        </h2>
                        <p className="text-xs text-blue-100">
                          Beszélgetőpartner
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <Button variant="ghost" size="icon" className="hover:bg-white/10">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>

              {/* Üzenetek listája - világos, tiszta háttér */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 pt-16 px-4 pb-4 bg-gradient-to-br from-blue-50 to-white relative z-10 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-4 border-primary/10"></div>
                          <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-primary animate-spin"></div>
                        </div>
                      </div>
                      <p className="mt-4 text-gray-400">Üzenetek betöltése...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6 border border-gray-600 shadow-lg relative z-10">
                      <MessageSquare className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-white">Nincs üzenet</h3>
                    <p className="text-gray-300 mb-6">
                      Küldj egy üzenetet a beszélgetés megkezdéséhez!
                    </p>
                    <div className="w-full max-w-md px-4 py-3 bg-muted/50 rounded-lg border border-border/50 shadow-sm">
                      <p className="text-sm text-gray-400 italic">
                        "Szia! Miben segíthetek neked ma?"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.length > 0 && (
                      <div className="mb-8 text-center">
                        <div className="inline-block bg-blue-100 rounded-lg px-4 py-2 text-sm text-blue-800 shadow-sm border border-blue-200">
                          <span className="font-medium">Beszélgetés kezdete</span> • {format(new Date(messages[0]?.created_at || new Date()), 'yyyy. MMMM d.', { locale: hu })}
                        </div>
                      </div>
                    )}
                    {messages.reduce((result: JSX.Element[], message, index, array) => {
                      const messageDate = new Date(message.created_at);
                      
                      // Dátum elválasztó hozzáadása, ha ez az első üzenet vagy ha más napból származik, mint az előző
                      if (index === 0 || !isSameDay(messageDate, new Date(array[index - 1].created_at))) {
                        const today = new Date();
                        const daysDifference = differenceInDays(today, messageDate);
                        
                        let dateDisplay = '';
                        
                        if (isToday(messageDate)) {
                          dateDisplay = 'Ma';
                        } else if (isYesterday(messageDate)) {
                          dateDisplay = 'Tegnap';
                        } else if (daysDifference < 7) {
                          // Az elmúlt hét napban
                          dateDisplay = format(messageDate, 'EEEE', { locale: hu });
                          // Nagybetűs kezdés
                          dateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1);
                        } else {
                          // Régebbi dátum
                          dateDisplay = format(messageDate, 'yyyy. MMMM d. (EEEE)', { locale: hu });
                          // Nagybetűs kezdés
                          dateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1);
                        }
                        
                        result.push(
                          <div key={`date-${message.id}`} className="flex justify-center my-6">
                            <div className="bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-600 font-medium">
                              {dateDisplay}
                            </div>
                          </div>
                        );
                      }
                      
                      // Csoportosítjuk az üzeneteket küldő alapján
                      // Egy üzenet a sorozat első eleme, ha:
                      // 1. Ez az első üzenet a listában, vagy
                      // 2. Az előző üzenet más felhasználótól származik
                      const isFirstMessageInGroup = index === 0 || array[index - 1].sender_id !== message.sender_id;
                      
                      // Ellenőrizzük, hogy ez az üzenet az utolsó-e az azonos percben létrehozott üzenetek közül
                      // Csak akkor jelenítjük meg az időpontot, ha:
                      // 1. Ez az utolsó üzenet a listában, vagy
                      // 2. A következő üzenet más percben jött létre, vagy
                      // 3. A következő üzenet más felhasználótól származik
                      const isLastMessageInMinute = index === array.length - 1 || 
                        array[index + 1].sender_id !== message.sender_id ||
                        format(new Date(message.created_at), 'HH:mm') !== format(new Date(array[index + 1].created_at), 'HH:mm');
                      
                      // Ellenőrizzük, hogy ez az üzenet időben jelentősen eltér-e az előzőtől
                      // Nagyobb térközt adunk, ha:
                      // 1. Ez az első üzenet a listában, vagy
                      // 2. Az előző üzenet legalább 5 perccel korábban jött létre
                      const isTimeGap = index === 0 || 
                        differenceInMinutes(new Date(message.created_at), new Date(array[index - 1].created_at)) >= 5;
                      
                      result.push(
                        <MessageItem 
                          key={message.id}
                          message={message}
                          isOwnMessage={message.sender_id === user?.id}
                          sender={message.sender}
                          onReact={(messageId, reaction) => handleReactToMessage(messageId, reaction)}
                          onEdit={handleEditMessage}
                          onDelete={(message) => {
                            setMessageToDelete(message);
                            setShowDeleteDialog(true);
                          }}
                          onReply={handleReplyToMessage}
                          reactions={messageReactions[message.id] || []}
                          currentUser={user}
                          isLastMessage={index === array.length - 1}
                          showEmojiKeyboard={showEmojiKeyboard}
                          setShowEmojiKeyboard={setShowEmojiKeyboard}
                          emojiSearch={emojiSearch}
                          setEmojiSearch={setEmojiSearch}
                          index={index}
                          isFirstMessageInGroup={isFirstMessageInGroup}
                          isLastMessageInMinute={isLastMessageInMinute}
                          isTimeGap={isTimeGap}
                        />
                      );
                      
                      return result;
                    }, [])}
                    
                    {isTyping && (
                      <div className="flex items-center p-2 mb-2 ml-12">
                        <div className="bg-gray-100 text-gray-800 rounded-full px-4 py-2 shadow-md border border-gray-200">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Referencia az üzenetek aljára görgetéshez */}
                    <div ref={messagesEndRef} />
                    
                    {showEmojiKeyboard && (
                      <div 
                        className="absolute bg-white rounded-xl shadow-lg p-4 z-50 emoji-keyboard"
                        style={{ 
                          bottom: '100%',
                          left: '0',
                          marginBottom: '8px',
                          width: '300px',
                          maxHeight: '300px',
                          overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-lg font-medium">Emoji kiválasztása</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                            onClick={() => setShowEmojiKeyboard(null)}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                        
                        <div className="mb-3">
                          <Input
                            type="text"
                            placeholder="Keresés..."
                            value={emojiSearch}
                            onChange={(e) => setEmojiSearch(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                          {commonEmojis
                            .filter(emoji => emojiSearch === '' || emoji.includes(emojiSearch))
                            .map((emoji) => (
                              <Button
                                key={emoji}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 rounded-lg hover:bg-gray-100"
                                onClick={() => {
                                  handleReactToMessage(showEmojiKeyboard, emoji);
                                  setShowEmojiKeyboard(null);
                                  setEmojiSearch('');
                                }}
                              >
                                <span className="text-2xl">{emoji}</span>
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}
                    
                  </div>
                )}
              </ScrollArea>

              <MessageInput 
                conversationId={currentConversation} 
                editingMessage={editingMessage} 
                replyingToMessage={replyingToMessage}
                onCancelEdit={() => setEditingMessage(null)} 
                onCancelReply={() => setReplyingToMessage(null)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-white relative z-10">
              <div className="text-center max-w-md relative">
                {/* Decorative elements */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full mix-blend-overlay filter blur-3xl"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/5 rounded-full mix-blend-overlay filter blur-3xl"></div>
                
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6 border border-blue-200 shadow-lg relative z-10">
                  <MessageCircle className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600">Válassz egy beszélgetést</h3>
                <p className="text-gray-600 mb-6">
                  Válassz egy beszélgetést a listából, vagy kezdj egy újat egy edzővel.
                </p>
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md text-white"
                  onClick={() => navigate('/coaches')}
                >
                  Edzők böngészése
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Üzenet törlés megerősítő dialógus */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">Biztosan törölni szeretnéd ezt az üzenetet?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Ez a művelet nem vonható vissza. Az üzenet véglegesen törlődik a beszélgetésből.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200">Mégsem</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMessage}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MessageInput = ({ 
  conversationId, 
  editingMessage, 
  replyingToMessage,
  onCancelEdit,
  onCancelReply
}: { 
  conversationId: string; 
  editingMessage: Message | null; 
  replyingToMessage: Message | null;
  onCancelEdit: () => void;
  onCancelReply: () => void;
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const { sendMessage, updateMessage } = useMessages();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  console.log('MessageInput komponens renderelése, editingMessage:', editingMessage);
  console.log('MessageInput komponens renderelése, replyingToMessage:', replyingToMessage);
  
  // Szerkesztés mód kezelése
  useEffect(() => {
    console.log('MessageInput useEffect futás: editingMessage változott', editingMessage);
    if (editingMessage) {
      console.log('Üzenet tartalom beállítása szerkesztéshez:', editingMessage.content);
      setMessage(editingMessage.content);
      
      // Fókuszáljuk a textarea-t egy kis késleltetéssel, hogy biztosan betöltődjön
      setTimeout(() => {
        if (textareaRef.current) {
          console.log('Textarea fókuszálása késleltetéssel');
          textareaRef.current.focus();
          // Automatikus magasság beállítás
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        } else {
          console.log('textareaRef.current nem létezik a késleltetés után sem');
        }
      }, 100);
    } else {
      console.log('Nincs szerkesztendő üzenet');
    }
  }, [editingMessage]);
  
  // Válasz mód kezelése
  useEffect(() => {
    console.log('MessageInput useEffect futás: replyingToMessage változott', replyingToMessage);
    if (replyingToMessage) {
      // Fókuszáljuk a textarea-t egy kis késleltetéssel, hogy biztosan betöltődjön
      setTimeout(() => {
        if (textareaRef.current) {
          console.log('Textarea fókuszálása válasz módban');
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [replyingToMessage]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      if (editingMessage) {
        // Ha szerkesztünk, akkor frissítjük az üzenetet
        try {
          console.log('Üzenet szerkesztése küldés:', editingMessage.id, message);
          await updateMessage(editingMessage.id, message);
          setMessage('');
          onCancelEdit();
        } catch (error: any) {
          console.error('Hiba az üzenet szerkesztése közben:', error);
          toast({
            title: "Hiba történt",
            description: error?.message || 'Ismeretlen hiba történt az üzenet szerkesztése közben.',
            variant: "destructive",
          });
        }
      } else {
        try {
          // Ha új üzenetet küldünk
          const replyData = replyingToMessage ? {
            reply_to_id: replyingToMessage.id,
            reply_to_content: replyingToMessage.content
          } : undefined;
          
          await sendMessage(conversationId, message, 'text', undefined, replyData);
          
          setMessage('');
          
          // Ha válaszoltunk, akkor töröljük a válaszolandó üzenetet
          if (replyingToMessage) {
            onCancelReply();
          }
        } catch (error: any) {
          console.error('Hiba az üzenet küldése közben:', error);
          toast({
            title: "Hiba történt",
            description: error?.message || 'Ismeretlen hiba történt az üzenet küldése közben.',
            variant: "destructive",
          });
        }
      }
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Automatikus magasság beállítás
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    
    // Gépelési állapot kezelése
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleFileUploadComplete = (fileData: {
    url: string;
    type: string;
    name: string;
    size: number;
    thumbnailUrl?: string;
  }) => {
    // A fájl típusától függően különböző üzenettípust küldünk
    const messageType = fileData.type as 'image' | 'video' | 'file';
    
    // Képek és videók esetén a tartalom a fájl neve lesz
    // Fájlok esetén pedig a fájl neve és mérete
    const content = fileData.name;
    
    if (editingMessage) {
      // Ha szerkesztünk, akkor frissítjük az üzenetet
      // Egyelőre csak szöveges módosítást támogatunk
      toast({
        title: "Figyelmeztetés",
        description: "Szerkesztés közben nem lehet fájlt feltölteni.",
        variant: "destructive",
      });
    } else {
      // Ha új üzenetet küldünk
      sendMessage(conversationId, content, messageType, fileData);
    }
    
    setShowFileUploader(false);
  };

  return (
    <div className="border-t bg-white relative">
      {/* Szerkesztési sáv */}
      {editingMessage && (
        <div className="bg-blue-50 p-2 border-b border-blue-200 flex justify-between items-center">
          <div className="flex items-center text-sm text-blue-700">
            <Edit className="h-4 w-4 mr-2" />
            Üzenet módosítása
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancelEdit}
            className="h-8 text-gray-600 hover:text-gray-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4 mr-1" />
            Mégsem
          </Button>
        </div>
      )}
      
      {replyingToMessage && (
        <div className="bg-blue-50 p-2 border-b border-blue-200 flex justify-between items-center">
          <div className="flex items-center text-sm text-blue-700">
            <Reply className="h-4 w-4 mr-2" />
            Válasz
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancelReply}
            className="h-8 text-gray-600 hover:text-gray-800 hover:bg-blue-100"
          >
            <X className="h-4 w-4 mr-1" />
            Mégsem
          </Button>
        </div>
      )}
      
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 right-0 mb-3 z-50">
          <EmojiPicker 
            onEmojiSelect={handleEmojiSelect} 
            onClose={() => setShowEmojiPicker(false)} 
          />
        </div>
      )}
      
      {showFileUploader && (
        <div className="absolute bottom-full left-0 right-0 mb-3 z-50">
          <FileUploader 
            onUploadComplete={handleFileUploadComplete} 
            onCancel={() => setShowFileUploader(false)} 
          />
        </div>
      )}
      
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? "Módosítsd az üzenetet..." : replyingToMessage ? "Írj egy választ..." : "Írj egy üzenetet..."}
            className="w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            >
              <Smile className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setShowFileUploader(!showFileUploader)}
              className={`text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 ${editingMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!editingMessage}
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </div>
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className={`p-2 rounded-full ${
            message.trim() ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const MessageItem = ({ 
  message, 
  isOwnMessage, 
  sender, 
  onReact, 
  onEdit, 
  onDelete, 
  onReply, 
  reactions, 
  currentUser, 
  isLastMessage,
  showEmojiKeyboard,
  setShowEmojiKeyboard,
  emojiSearch,
  setEmojiSearch,
  index,
  isFirstMessageInGroup,
  isLastMessageInMinute,
  isTimeGap
}: { 
  message: Message; 
  isOwnMessage: boolean; 
  sender: any; 
  onReact: (messageId: string, reaction: string) => void; 
  onEdit: (message: Message) => void; 
  onDelete: (message: Message) => void; 
  onReply: (message: Message) => void; 
  reactions: any[];
  currentUser: any;
  isLastMessage: boolean;
  showEmojiKeyboard: string | null;
  setShowEmojiKeyboard: (id: string | null) => void;
  emojiSearch: string;
  setEmojiSearch: (search: string) => void;
  index: number;
  isFirstMessageInGroup: boolean;
  isLastMessageInMinute: boolean;
  isTimeGap: boolean;
}) => {
  const messageTime = new Date(message.created_at);
  const formattedTime = format(messageTime, 'HH:mm');
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [menuLocked, setMenuLocked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Relatív időpont meghatározása
  const getRelativeTimeString = (date: Date) => {
    if (isToday(date)) {
      return '';
    } else if (isYesterday(date)) {
      return 'tegnap, ';
    } else {
      const daysDifference = differenceInDays(new Date(), date);
      
      if (daysDifference === 2) {
        return 'tegnapelőtt, ';
      } else if (daysDifference > 2 && daysDifference <= 7) {
        // A hét napja
        return format(date, 'EEEE', { locale: hu }) + ', ';
      } else {
        // Dátum
        return format(date, 'yyyy.MM.dd., ', { locale: hu });
      }
    }
  };

  const relativeTimeString = getRelativeTimeString(messageTime);

  const renderMessageContent = () => {
    if (message.message_type === 'image') {
      return (
        <div className="mt-1 max-w-xs">
          <img 
            src={message.file_url || ''} 
            alt="Kép" 
            className="rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              // Kép nagyítása
            }}
          />
        </div>
      );
    } else if (message.message_type === 'emoji') {
      return (
        <div className="text-4xl my-1">{message.content}</div>
      );
    } else {
      // Szöveges üzenet
      return (
        <div className="break-words whitespace-pre-wrap">
          {message.reply_to_id && (
            <div className="mb-1 px-2 py-1.5 bg-gray-100 border-l-2 border-blue-400 rounded text-xs text-gray-600 flex items-center">
              <Reply className="h-3 w-3 mr-1 text-blue-500" />
              <span className="truncate max-w-[200px]">{message.reply_to_content}</span>
            </div>
          )}
          {message.content}
        </div>
      );
    }
  };

  // Felhasználó reakciójának lekérdezése
  const getUserReactionForMessage = () => {
    if (!reactions || !currentUser) return null;
    
    const userReaction = reactions.find(
      (r: any) => r.user_id === currentUser.id
    );
    
    return userReaction ? userReaction.reaction : null;
  };
  
  // Emoji picker bezárása kattintásra
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiKeyboard === message.id) {
        const target = event.target as HTMLElement;
        
        // Ellenőrizzük, hogy a kattintás a reakció menün kívül történt-e
        if (!target.closest('.message-item-' + message.id) && !target.closest('.emoji-picker-menu') && !target.closest('.emoji-keyboard')) {
          setShowReactionMenu(false);
          setMenuLocked(false);
          setShowEmojiKeyboard(null);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactionMenu, menuLocked, message.id, showEmojiKeyboard]);
  
  // Egér elhagyja a reakciómenüt
  const handleMouseLeave = () => {
    // Csak akkor zárjuk be, ha nincs zárolva a menü
    if (!menuLocked) {
      setShowReactionMenu(false);
    }
  };
  
  // Ellenőrizzük, hogy az emoji picker a menü alatt jelenjen-e meg
  const shouldShowEmojiPickerBelow = index < 3; // Az első 3 üzenetnél alul jelenjen meg
  
  return (
    <div 
      className={`flex w-full mb-2 ${isTimeGap ? 'mt-6' : ''}`}
      style={{ justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}
    >
      {!isOwnMessage && isFirstMessageInGroup ? (
        <div className="mr-2 flex-shrink-0">
          {sender?.avatar_url ? (
            <img 
              src={sender.avatar_url} 
              alt={sender?.first_name || 'Felhasználó'} 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
          )}
        </div>
      ) : !isOwnMessage ? (
        <div className="w-8 mr-2 flex-shrink-0"></div>
      ) : null}
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
        {!isOwnMessage && isFirstMessageInGroup && (
          <div className="text-xs text-gray-500 mb-1 ml-1">
            {sender?.first_name || ''} {sender?.last_name || ''}
          </div>
        )}
        <div 
          className={`rounded-lg px-3 py-2 relative group message-item-${message.id}`}
          onMouseEnter={() => setShowReactionMenu(true)}
          onMouseLeave={handleMouseLeave}
          style={{ 
            backgroundColor: isOwnMessage ? '#3b82f6' : '#f3f4f6',
            color: isOwnMessage ? 'white' : '#1f2937',
            position: 'relative'
          }}
        >
          {renderMessageContent()}
          
          {/* Reakciók megjelenítése */}
          <div className="relative">
            {/* Reakció menü az üzenet fölött */}
            {showReactionMenu && (
              <div 
                ref={menuRef}
                className="emoji-picker-menu absolute bg-white shadow-lg rounded-full border border-gray-200 p-1 z-50 flex items-center"
                style={{ 
                  bottom: '100%',
                  left: isOwnMessage ? 'auto' : '0',
                  right: isOwnMessage ? '0' : 'auto',
                  marginBottom: '8px',
                  zIndex: 10
                }}
                onMouseEnter={() => setShowReactionMenu(true)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Gyors reakciók */}
                {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 rounded-full hover:bg-gray-100 ${
                      getUserReactionForMessage() === emoji ? 'bg-blue-100' : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReact(message.id, emoji);
                    }}
                  >
                    <span className="text-xl">{emoji}</span>
                  </Button>
                ))}
                
                {/* Plusz gomb további reakciókhoz */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 text-gray-700 hover:text-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuLocked(true);
                    setShowEmojiKeyboard(message.id);
                  }}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                
                {/* Menü gomb */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 text-gray-700 hover:text-gray-700"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuLocked(true);
                      }}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align={isOwnMessage ? "end" : "start"}
                    onInteractOutside={() => {
                      setMenuLocked(false);
                      setShowReactionMenu(false);
                    }}
                    className="bg-white border border-gray-200 shadow-md rounded-md z-50"
                  >
                    {isOwnMessage && (
                      <>
                        <div 
                          className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit(message);
                            setMenuLocked(false);
                            setShowReactionMenu(false);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Szerkesztés
                        </div>
                        <div 
                          className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(message);
                            setMenuLocked(false);
                            setShowReactionMenu(false);
                          }}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Törlés
                        </div>
                      </>
                    )}
                    <div 
                      className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onReply(message);
                        setMenuLocked(false);
                        setShowReactionMenu(false);
                      }}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Válasz
                    </div>
                    <div 
                      className="flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (message.content) {
                          navigator.clipboard.writeText(message.content);
                        }
                        setMenuLocked(false);
                        setShowReactionMenu(false);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Másolás
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            
            {/* Emoji keyboard a plusz gombra kattintva */}
            {showEmojiKeyboard === message.id && shouldShowEmojiPickerBelow && (
              <div 
                className="absolute z-50 emoji-keyboard"
                style={{ 
                  top: '100%',
                  left: isOwnMessage ? 'auto' : '0',
                  right: isOwnMessage ? '0' : 'auto',
                  marginTop: '8px',
                  width: '300px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <EmojiPicker 
                  onEmojiSelect={(emoji) => {
                    onReact(message.id, emoji);
                    setShowEmojiKeyboard(null);
                    setShowReactionMenu(false);
                    setMenuLocked(false);
                  }}
                  onClose={() => {
                    setShowEmojiKeyboard(null);
                    setShowReactionMenu(false);
                    setMenuLocked(false);
                  }}
                />
              </div>
            )}
            
            {/* Emoji keyboard a plusz gombra kattintva - normál pozíció */}
            {showEmojiKeyboard === message.id && !shouldShowEmojiPickerBelow && (
              <div 
                className="absolute z-50 emoji-keyboard"
                style={{ 
                  bottom: '100%',
                  left: isOwnMessage ? 'auto' : '0',
                  right: isOwnMessage ? '0' : 'auto',
                  marginBottom: '8px',
                  width: '300px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <EmojiPicker 
                  onEmojiSelect={(emoji) => {
                    onReact(message.id, emoji);
                    setShowEmojiKeyboard(null);
                    setShowReactionMenu(false);
                    setMenuLocked(false);
                  }}
                  onClose={() => {
                    setShowEmojiKeyboard(null);
                    setShowReactionMenu(false);
                    setMenuLocked(false);
                  }}
                />
              </div>
            )}
            
            {/* Reakciók megjelenítése az üzenet ellentétes oldalán */}
            {reactions && reactions.length > 0 && (
              <div className={`absolute bottom-0 ${isOwnMessage ? 'left-0' : 'right-0'} transform ${isOwnMessage ? '-translate-x-[80%]' : 'translate-x-[80%]'} translate-y-[80%] flex flex-wrap gap-1`}>
                {Object.entries(reactions.reduce((acc: any, reaction: any) => {
                  const emoji = reaction.reaction;
                  if (!acc[emoji]) {
                    acc[emoji] = [];
                  }
                  acc[emoji].push(reaction);
                  return acc;
                }, {})).map(([emoji, users]: [string, any[]]) => (
                  <div 
                    key={emoji} 
                    className={`flex items-center bg-gray-100 rounded-full px-2 py-0.5 text-xs cursor-pointer hover:bg-gray-200 ${
                      users.some((r: any) => r.user_id === currentUser?.id) ? 'bg-blue-100' : ''
                    }`}
                    onClick={() => onReact(message.id, emoji)}
                  >
                    <span className="mr-1">{emoji}</span>
                    <span className="font-medium text-gray-800">{users.length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center">
          {isLastMessageInMinute && <span>{relativeTimeString}{formattedTime}</span>}
          {isOwnMessage && isLastMessage && (
            <span className="ml-1">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
