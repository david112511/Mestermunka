import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, Conversation, Message } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
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
  Trash2,
  MoreVertical,
  Calendar,
  Image,
  Edit,
  Smile,
  ThumbsUp,
  Heart,
  Frown,
  Angry,
  Plus,
  X,
  Paperclip,
  File,
  FileText,
  Film
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, differenceInDays } from 'date-fns';
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
  const [editedContent, setEditedContent] = useState("");
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
      toast({
        description: "Üzenet elküldve",
        duration: 2000
      });
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
      
      toast({
        title: "Üzenet törölve",
        description: "Az üzenetet sikeresen töröltük.",
      });
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
  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !editedContent.trim()) return;
    
    try {
      await updateMessage(editingMessage.id, editedContent);
      setEditingMessage(null);
      setEditedContent("");
      
      toast({
        title: "Üzenet szerkesztve",
        description: "Az üzenetet sikeresen szerkesztetted.",
      });
    } catch (error: any) {
      console.error('Hiba az üzenet szerkesztése közben:', error);
      toast({
        title: "Hiba történt",
        description: error?.message || 'Ismeretlen hiba történt az üzenet szerkesztése közben.',
        variant: "destructive",
      });
    }
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

  // Reakciók lekérdezése az üzenetekhez
  useEffect(() => {
    let isMounted = true;
    const fetchReactionsQueue = [...messages];
    let isProcessing = false;
    
    // Reakció csatornák tárolása
    const reactionChannels: any[] = [];
    
    const processQueue = async () => {
      if (!isProcessing && fetchReactionsQueue.length > 0 && isMounted) {
        isProcessing = true;
        const message = fetchReactionsQueue.shift();
        
        if (message) {
          try {
            // Lekérjük a reakciókat
            const reactions = await getMessageReactions(message.id);
            if (isMounted) {
              setMessageReactions(prev => ({
                ...prev,
                [message.id]: reactions
              }));
              
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
          } catch (error) {
            console.error('Hiba a reakciók lekérdezésekor:', error);
          }
        }
        
        isProcessing = false;
        
        // Ha még van elem a sorban, folytatjuk a feldolgozást
        if (fetchReactionsQueue.length > 0 && isMounted) {
          setTimeout(processQueue, 100); // Kis késleltetés a kérések között
        }
      }
    };
    
    if (messages.length > 0) {
      processQueue();
    }
    
    return () => {
      isMounted = false;
      
      // Leiratkozunk a reakció csatornákról
      reactionChannels.forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
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
        <Navigation />
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
        toast({
          title: "Reakció eltávolítva",
          description: `Sikeresen eltávolítottad a reakciót.`,
        });
      } else {
        // Ha már van reakciója, először töröljük azt
        if (currentUserReaction) {
          await removeReaction(messageId);
        }
        
        // Aztán hozzáadjuk az új reakciót
        await addReaction(messageId, reaction);
        toast({
          title: "Reakció hozzáadva",
          description: `Sikeresen hozzáadtad a(z) ${reaction} reakciót.`,
        });
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
      toast({
        title: "Hiba történt",
        description: error?.message || 'Ismeretlen hiba történt a reakció kezelése közben.',
        variant: "destructive",
      });
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navigation />
      <div className="flex-1 flex flex-col md:flex-row pt-16 w-full">
        {/* Beszélgetések listája - élénk, játékos dizájn */}
        {(showConversationList || !isMobileView) && (
          <div className="w-full md:w-1/3 border-r border-indigo-100 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-white/10 rounded-full mix-blend-overlay filter blur-3xl"></div>
              <div className="absolute bottom-10 left-10 w-[250px] h-[250px] bg-pink-500/10 rounded-full mix-blend-overlay filter blur-3xl"></div>
            </div>
            
            <div className="p-4 border-b border-indigo-400/30 bg-indigo-600/80 backdrop-blur-sm relative z-10">
              <h2 className="text-xl font-bold mb-4 text-white">Beszélgetések</h2>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-indigo-200" />
                <Input
                  placeholder="Keresés..."
                  className="pl-8 bg-white/20 border-indigo-400/30 focus-visible:ring-white/50 text-white placeholder:text-indigo-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {conversationsLoading ? (
                // Betöltés alatt megjelenő helyőrzők
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[160px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-gray-600 shadow-lg relative z-10">
                    <MessageCircle className="h-10 w-10 text-primary/70" />
                  </div>
                  <p className="font-medium text-lg mb-1">Nincs beszélgetésed még</p>
                  <p className="text-sm mt-2 mb-6">
                    Küldj egy üzenetet a beszélgetés megkezdéséhez!
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all shadow-md"
                    onClick={() => navigate('/coaches')}
                  >
                    Edzők böngészése
                  </Button>
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conversation) => {
                    const otherParticipant = getOtherParticipant(conversation);
                    if (!otherParticipant) return null;
                    
                    // Biztosítsuk, hogy a last_message létezik
                    const lastMessageContent = conversation.last_message?.content ?? 'Nincs üzenet';
                    
                    // Biztosítsuk, hogy a last_message_time létezik
                    const lastMessageTime = conversation.last_message?.created_at ?? '';
                    
                    return (
                      <div
                        key={conversation.id}
                        className={`p-4 border-b border-indigo-400/30 cursor-pointer transition-all relative ${
                          currentConversation === conversation.id 
                            ? 'bg-white/20 shadow-md' 
                            : conversation.unread_count 
                              ? 'bg-indigo-700/40 hover:bg-white/10' 
                              : 'hover:bg-white/10'
                        }`}
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                        {currentConversation === conversation.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>
                        )}
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-10 w-10 border-2 border-white/30 mr-3">
                            <AvatarImage src={getOtherParticipant(conversation)?.avatar_url ?? ''} />
                            <AvatarFallback className="bg-indigo-300 text-indigo-800">
                              {getOtherParticipant(conversation)?.first_name?.[0]}{getOtherParticipant(conversation)?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <h3 className={`text-sm font-medium truncate ${conversation.unread_count ? 'text-white font-semibold' : 'text-indigo-100'}`}>
                                {`${getOtherParticipant(conversation)?.first_name || ''} ${getOtherParticipant(conversation)?.last_name || ''}`}
                              </h3>
                              <span className="text-xs text-indigo-200">
                                {formatConversationTime(lastMessageTime)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs truncate ${conversation.unread_count ? 'text-white font-medium' : 'text-indigo-200'}`}>
                                {lastMessageContent}
                              </p>
                              {conversation.unread_count > 0 && (
                                <Badge variant="default" className="ml-2 bg-white text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Beszélgetés tartalma - világos, modern dizájn */}
        <div className={`flex-1 flex flex-col ${(!showConversationList && isMobileView) ? 'block' : 'hidden md:flex'} relative bg-white`}>
          {currentConversation ? (
            <>
              {/* Beszélgetés fejléc - élénk, vidám */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-500 text-white relative z-10 shadow-md">
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
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 bg-gradient-to-br from-blue-50 to-white relative z-10">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/10 animate-pulse"></div>
                        <Loader2 className="h-8 w-8 animate-spin text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
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
                    <p className="text-gray-300 max-w-md mb-6">
                      Küldj egy üzenetet a beszélgetés megkezdéséhez!
                    </p>
                    <div className="w-full max-w-md px-4 py-3 bg-muted/50 rounded-lg border border-border/50 shadow-sm">
                      <p className="text-sm text-gray-400 italic">
                        "Szia! Miben segíthetek neked ma?"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      const sender = message.sender;
                      
                      return (
                        <MessageItem 
                          key={message.id}
                          message={message}
                          isOwnMessage={isOwnMessage}
                          sender={sender}
                          onReact={(messageId, reaction) => handleReactToMessage(messageId, reaction)}
                          onEdit={(message, content) => {
                            setEditingMessage(message);
                            setEditedContent(content);
                          }}
                          onDelete={(message) => {
                            setMessageToDelete(message);
                            setShowDeleteDialog(true);
                          }}
                          reactions={messageReactions[message.id] || []}
                          currentUser={user}
                          isLastMessage={index === messages.length - 1}
                        />
                      );
                    })}
                    
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
                      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowEmojiKeyboard(null)}>
                        <div className="bg-white rounded-xl shadow-lg p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-medium">Emoji kiválasztása</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                              onClick={() => setShowEmojiKeyboard(null)}
                            >
                              <X className="h-5 w-5 text-gray-500" />
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
                          
                          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
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
                      </div>
                    )}
                    
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-gray-200 bg-white relative z-10">
                <MessageInput conversationId={currentConversation} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-white relative z-10">
              <div className="text-center max-w-md relative">
                {/* Decorative elements */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full mix-blend-overlay filter blur-3xl"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/5 rounded-full mix-blend-overlay filter blur-3xl"></div>
                
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6 border border-blue-200 shadow-lg relative z-10">
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
      
      {/* Üzenet szerkesztés dialógus */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setEditingMessage(null)}>
          <div className="bg-white rounded-xl shadow-lg p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium">Üzenet szerkesztése</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                onClick={() => setEditingMessage(null)}
              >
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
            
            <form onSubmit={handleUpdateMessage} className="flex flex-col gap-3">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full p-3 rounded bg-gray-50 text-gray-800 text-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 min-h-[100px]"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingMessage(null)}
                >
                  Mégsem
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Mentés
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
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

const MessageInput = ({ conversationId }: { conversationId: string }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const { sendMessage } = useMessages();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = async () => {
    if (message.trim()) {
      await sendMessage(conversationId, message, 'text');
      setMessage('');
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
    
    sendMessage(conversationId, content, messageType, fileData);
    setShowFileUploader(false);
  };

  return (
    <div className="border-t p-3 bg-white relative">
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
      
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Írj egy üzenetet..."
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
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
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
  reactions,
  currentUser,
  isLastMessage
}: { 
  message: Message; 
  isOwnMessage: boolean;
  sender: { id: string; first_name: string; last_name: string; avatar_url: string | null } | null;
  onReact: (messageId: string, reaction: string) => void;
  onEdit: (message: Message, content: string) => void;
  onDelete: (message: Message) => void;
  reactions: any[];
  currentUser: any;
  isLastMessage: boolean
}) => {
  const messageTime = new Date(message.created_at);
  const formattedTime = format(messageTime, 'HH:mm');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  
  // Emoji picker bezárása kattintásra
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as HTMLElement;
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
  
  // Üzenet típus alapján különböző megjelenítés
  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="rounded-lg overflow-hidden max-w-xs">
            <a href={message.file_url || '#'} target="_blank" rel="noopener noreferrer">
              <img 
                src={message.file_url || ''} 
                alt={message.content} 
                className="max-w-full h-auto"
                loading="lazy"
              />
            </a>
            <div className="text-xs text-gray-500 mt-1">{message.content}</div>
          </div>
        );
      case 'video':
        return (
          <div className="rounded-lg overflow-hidden max-w-xs">
            <video 
              src={message.file_url || ''} 
              controls 
              className="max-w-full h-auto"
              poster={message.thumbnail_url || ''}
            />
            <div className="text-xs text-gray-500 mt-1">{message.content}</div>
          </div>
        );
      case 'file':
        return (
          <a 
            href={message.file_url || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.content}</p>
              <p className="text-xs text-gray-500">
                {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : 'Fájl'}
              </p>
            </div>
          </a>
        );
      case 'emoji':
        return (
          <span className="text-4xl">{message.content}</span>
        );
      default:
        return (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
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

  // Gyakran használt emojik
  const commonEmojis = ["😀", "😂", "😍", "👍", "👎", "❤️", "🔥", "🎉", "👏", "🙏", "😊", "🤔"];

  const renderReactions = (messageId: string, reactions: any[]) => {
    if (!reactions || reactions.length === 0) return null;
    
    console.log(`Reakciók renderelése a(z) ${messageId} üzenethez:`, reactions);
    
    // Csoportosítjuk a reakciókat
    const groupedReactions = reactions.reduce((acc: any, reaction: any) => {
      const emoji = reaction.reaction;
      if (!acc[emoji]) {
        acc[emoji] = [];
      }
      acc[emoji].push(reaction);
      return acc;
    }, {});
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(groupedReactions).map(([emoji, users]: [string, any[]]) => (
          <div 
            key={emoji} 
            className={`flex items-center bg-gray-100 rounded-full px-2 py-0.5 text-xs cursor-pointer hover:bg-gray-200 ${
              users.some(r => r.user_id === currentUser?.id) ? 'bg-blue-100 hover:bg-blue-200' : ''
            }`}
            onClick={() => onReact(messageId, emoji)}
          >
            <span className="mr-1">{emoji}</span>
            <span>{users.length}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      {!isOwnMessage && (
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
      )}
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
        {!isOwnMessage && (
          <div className="text-xs text-gray-500 mb-1 ml-1">
            {sender?.first_name || ''} {sender?.last_name || ''}
          </div>
        )}
        <div className={`rounded-lg px-3 py-2 relative group ${
          isOwnMessage 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {renderMessageContent()}
          
          {/* Reakciók megjelenítése */}
          <div className="relative">
            {/* Reakció hozzáadása gomb */}
            <div className={`absolute ${isOwnMessage ? '-left-12' : '-right-12'} top-0 -translate-y-9 z-10`}>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="emoji-picker-trigger h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-md border border-gray-200 hover:bg-gray-100"
                  onClick={() => setShowEmojiPicker(message.id)}
                >
                  <Smile className="h-5 w-5 text-gray-500" />
                </Button>
                
                {showEmojiPicker === message.id && (
                  <div className="emoji-picker-menu absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white shadow-lg rounded-full border border-gray-200 p-1 z-50 flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full hover:bg-blue-100 ${getUserReactionForMessage() === "👍" ? "bg-blue-100" : ""}`}
                      onClick={() => onReact(message.id, "👍")}
                    >
                      <ThumbsUp className="h-5 w-5 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full hover:bg-red-100 ${getUserReactionForMessage() === "❤️" ? "bg-red-100" : ""}`}
                      onClick={() => onReact(message.id, "❤️")}
                    >
                      <Heart className="h-5 w-5 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full hover:bg-yellow-100 ${getUserReactionForMessage() === "😄" ? "bg-yellow-100" : ""}`}
                      onClick={() => onReact(message.id, "😄")}
                    >
                      <span className="text-lg">😄</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full hover:bg-blue-100 ${getUserReactionForMessage() === "😢" ? "bg-blue-100" : ""}`}
                      onClick={() => onReact(message.id, "😢")}
                    >
                      <Frown className="h-5 w-5 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full hover:bg-orange-100 ${getUserReactionForMessage() === "😠" ? "bg-orange-100" : ""}`}
                      onClick={() => onReact(message.id, "😠")}
                    >
                      <Angry className="h-5 w-5 text-orange-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 rounded-full hover:bg-yellow-100 ${getUserReactionForMessage() === "😮" ? "bg-yellow-100" : ""}`}
                      onClick={() => onReact(message.id, "😮")}
                    >
                      <span className="text-lg">😮</span>
                    </Button>
                    <div className="h-6 border-l border-gray-200 mx-1"></div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="h-5 w-5 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="center" 
                        className="w-36 shadow-lg border-gray-200 bg-white animate-in fade-in-50 zoom-in-95 rounded-xl overflow-hidden"
                      >
                        {commonEmojis.map((emoji) => (
                          <DropdownMenuItem
                            key={emoji}
                            className="flex justify-center items-center h-10 w-10 p-0 cursor-pointer hover:bg-gray-100 rounded-md"
                            onClick={() => onReact(message.id, emoji)}
                          >
                            <span className="text-xl">{emoji}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
            
            {/* Reakciók megjelenítése az üzenet ellentétes oldalán */}
            {reactions && reactions.length > 0 && (
              <div className={`absolute bottom-0 ${isOwnMessage ? 'left-0' : 'right-0'} transform ${isOwnMessage ? '-translate-x-[80%]' : 'translate-x-[80%]'} translate-y-[80%] flex flex-wrap gap-1`}>
                {renderReactions(message.id, reactions)}
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center">
          <span>{formattedTime}</span>
          {isOwnMessage && isLastMessage && (
            <span className="ml-1">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
          
          {/* Szerkesztés/törlés menü */}
          {isOwnMessage && (
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-400/20"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-36 shadow-lg border-gray-200 bg-white animate-in fade-in-50 zoom-in-95 rounded-xl overflow-hidden"
                >
                  <DropdownMenuItem 
                    className="text-blue-500 focus:text-blue-500 cursor-pointer flex items-center gap-2 hover:bg-gray-100 focus:bg-gray-100"
                    onClick={() => onEdit(message, message.content)}
                  >
                    <Edit className="h-4 w-4" />
                    Szerkesztés
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-500 focus:text-red-500 cursor-pointer flex items-center gap-2 hover:bg-gray-100 focus:bg-gray-100"
                    onClick={() => onDelete(message)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Törlés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
