import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, Conversation, Message } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';
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
  X
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
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showEmojiKeyboard, setShowEmojiKeyboard] = useState<string | null>(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [commonEmojis] = useState(['😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '✨', '🙏', '👏', '🤝', '🤗', '🤩', '😎', '🥳']);
  const [messageReactions, setMessageReactions] = useState<{[key: string]: any[]}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    refreshConversations,
    deleteMessage,
    updateMessage,
    addReaction,
    getMessageReactions
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
      toast({
        description: "Üzenet törölve",
        duration: 2000
      });
      setShowDeleteDialog(false);
      setMessageToDelete(null);
      
      // Frissítsük az üzeneteket a törlés után
      if (currentConversation) {
        await fetchMessages(currentConversation);
      }
    } catch (error) {
      console.error('Hiba az üzenet törlése közben:', error);
      toast({
        variant: "destructive",
        title: "Hiba történt",
        description: "Az üzenet törlése sikertelen volt. Kérjük, próbáld újra.",
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
        title: "Üzenet frissítve",
        description: "Az üzenet sikeresen frissítve lett.",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
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

  // Üzenetek görgetése az aljára
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Üzenetek lekérdezése, amikor a kiválasztott beszélgetés megváltozik
  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation);
    }
  }, [currentConversation, fetchMessages]);

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
  const fetchMessageReactions = useCallback(async () => {
    if (!messages || messages.length === 0 || !getMessageReactions) return;
    
    try {
      const reactionsMap: {[key: string]: any[]} = {};
      
      // Minden üzenethez lekérdezzük a reakciókat
      for (const message of messages) {
        if (!message || !message.id) continue;
        
        try {
          const reactions = await getMessageReactions(message.id);
          reactionsMap[message.id] = reactions || [];
        } catch (error) {
          console.error(`Hiba a(z) ${message.id} azonosítójú üzenet reakcióinak lekérdezése közben:`, error);
          reactionsMap[message.id] = [];
        }
      }
      
      setMessageReactions(reactionsMap);
    } catch (error) {
      console.error('Hiba a reakciók lekérdezése közben:', error);
    }
  }, [messages, getMessageReactions]);

  // Üzenetek lekérdezése után lekérdezzük a reakciókat is
  useEffect(() => {
    if (messages && messages.length > 0 && getMessageReactions) {
      fetchMessageReactions();
    }
  }, [messages, fetchMessageReactions, getMessageReactions]);

  // Ellenőrizzük, hogy a felhasználó reagált-e már az üzenetre
  const getUserReactionForMessage = useCallback((messageId: string) => {
    if (!user || !messageReactions[messageId]) return null;
    
    const userReaction = messageReactions[messageId].find(
      (reaction: any) => reaction.user_id === user.id
    );
    
    return userReaction ? userReaction.reaction : null;
  }, [messageReactions, user]);

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
        if (addReaction) {
          await addReaction(messageId, reaction);
          toast({
            title: "Reakció hozzáadva",
            description: `Sikeresen hozzáadtad a(z) ${reaction} reakciót.`,
          });
        }
      }
      
      // Frissítjük a reakciókat
      if (fetchMessageReactions) {
        await fetchMessageReactions();
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
              <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-blue-50 to-white relative z-10">
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
                      const isCurrentUser = message.sender_id === user.id;
                      
                      return (
                        <div key={message.id}>
                          {shouldShowDateSeparator(message, index) && (
                            <div className="flex justify-center my-6">
                              <div className="bg-gray-600 text-white rounded-full px-4 py-1.5 shadow-md border border-gray-500/50">
                                <Calendar className="h-3 w-3 mr-1.5" />
                                {formatDateSeparator(message.created_at)}
                              </div>
                            </div>
                          )}
                          
                          <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className="flex items-end gap-2 group">
                              {!isCurrentUser && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={message.sender?.avatar_url ?? ''} />
                                  <AvatarFallback>
                                    <User className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              <div
                                className={`max-w-md rounded-lg p-3 relative group ${
                                  isCurrentUser
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                    : 'bg-gray-100 shadow-md border border-gray-200 text-gray-800'
                                }`}
                              >
                                {editingMessage?.id === message.id ? (
                                  <form onSubmit={handleUpdateMessage} className="flex flex-col gap-2">
                                    <textarea
                                      value={editedContent}
                                      onChange={(e) => setEditedContent(e.target.value)}
                                      className="w-full p-2 rounded bg-white/90 text-gray-800 text-sm border border-gray-300"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setEditingMessage(null)}
                                        className="h-8 px-2 text-xs bg-white/20 hover:bg-white/30"
                                      >
                                        Mégsem
                                      </Button>
                                      <Button 
                                        type="submit" 
                                        size="sm"
                                        className="h-8 px-2 text-xs bg-white/20 hover:bg-white/30"
                                      >
                                        Mentés
                                      </Button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    <p>{message.content}</p>
                                    <div
                                      className={`flex items-center mt-1 text-xs ${
                                        isCurrentUser ? 'text-white/80' : 'text-gray-500'
                                      }`}
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatMessageTime(message.created_at)}
                                      
                                      {isCurrentUser && (
                                        <div className="ml-auto flex items-center">
                                          {message.is_read && (
                                            <div className="flex items-center mr-1.5" title="Olvasva">
                                              <div className="flex">
                                                <Check className="h-3 w-3 -mr-1.5" />
                                                <Check className="h-3 w-3" />
                                              </div>
                                            </div>
                                          )}
                                          
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className={`h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                                  isCurrentUser ? 'hover:bg-indigo-400/20' : 'hover:bg-gray-200'
                                                }`}
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
                                                onClick={() => {
                                                  setEditingMessage(message);
                                                  setEditedContent(message.content);
                                                }}
                                              >
                                                <Edit className="h-4 w-4" />
                                                Szerkesztés
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                className="text-red-500 focus:text-red-500 cursor-pointer flex items-center gap-2 hover:bg-gray-100 focus:bg-gray-100"
                                                onClick={() => {
                                                  setMessageToDelete(message);
                                                  setShowDeleteDialog(true);
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                                Törlés
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                                
                                {/* Reakciók megjelenítése */}
                                <div className="relative">
                                  {/* Reakció hozzáadása gomb */}
                                  <div className={`absolute ${isCurrentUser ? '-left-12' : '-right-12'} top-0 -translate-y-9 z-10`}>
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
                                        <div className="emoji-picker-menu absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[calc(100%+8px)] bg-white shadow-lg rounded-full border border-gray-200 p-1 z-50 flex items-center">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full hover:bg-blue-100 ${getUserReactionForMessage(message.id) === "👍" ? "bg-blue-100" : ""}`}
                                            onClick={() => handleReactToMessage(message.id, "👍")}
                                          >
                                            <ThumbsUp className="h-5 w-5 text-blue-500" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full hover:bg-red-100 ${getUserReactionForMessage(message.id) === "❤️" ? "bg-red-100" : ""}`}
                                            onClick={() => handleReactToMessage(message.id, "❤️")}
                                          >
                                            <Heart className="h-5 w-5 text-red-500" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full hover:bg-yellow-100 ${getUserReactionForMessage(message.id) === "😄" ? "bg-yellow-100" : ""}`}
                                            onClick={() => handleReactToMessage(message.id, "😄")}
                                          >
                                            <span className="text-lg">😄</span>
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full hover:bg-blue-100 ${getUserReactionForMessage(message.id) === "😢" ? "bg-blue-100" : ""}`}
                                            onClick={() => handleReactToMessage(message.id, "😢")}
                                          >
                                            <Frown className="h-5 w-5 text-blue-500" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full hover:bg-orange-100 ${getUserReactionForMessage(message.id) === "😠" ? "bg-orange-100" : ""}`}
                                            onClick={() => handleReactToMessage(message.id, "😠")}
                                          >
                                            <Angry className="h-5 w-5 text-orange-500" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full hover:bg-yellow-100 ${getUserReactionForMessage(message.id) === "😮" ? "bg-yellow-100" : ""}`}
                                            onClick={() => handleReactToMessage(message.id, "😮")}
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
                                            <DropdownMenuContent align="center" className="p-2 grid grid-cols-4 gap-1 min-w-[180px]">
                                              {commonEmojis.map((emoji) => (
                                                <DropdownMenuItem
                                                  key={emoji}
                                                  className="flex justify-center items-center h-10 w-10 p-0 cursor-pointer hover:bg-gray-100 rounded-md"
                                                  onClick={() => handleReactToMessage(message.id, emoji)}
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
                                  
                                  {/* Reakciók megjelenítése az üzenet jobb alsó sarkában */}
                                  {messageReactions[message.id]?.length > 0 && (
                                    <div className="absolute bottom-0 right-0 transform translate-x-[80%] translate-y-[80%] flex flex-wrap gap-1">
                                      {(() => {
                                        // Csak a felhasználó saját reakcióját mutatjuk
                                        const userReaction = messageReactions[message.id].find(
                                          (r: any) => r.user_id === user?.id
                                        );
                                        
                                        if (userReaction && userReaction.reaction) {
                                          return (
                                            <div 
                                              key={`${message.id}-${userReaction.reaction}`}
                                              className="bg-white rounded-full px-1.5 py-0.5 text-sm flex items-center shadow-md border border-gray-200"
                                              title="A te reakciód"
                                            >
                                              <span>{userReaction.reaction}</span>
                                            </div>
                                          );
                                        }
                                        
                                        return null;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
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
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-gray-200 bg-white relative z-10">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Írd be az üzeneted..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      className="pr-10 bg-white border-gray-300 focus-visible:ring-blue-500/50 text-gray-800 shadow-sm"
                      disabled={sendingMessage}
                    />
                    {!sendingMessage && newMessage.trim() && (
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                        {newMessage.length}/500
                      </span>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md text-white"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Küldés
                  </Button>
                </form>
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

export default Messages;
