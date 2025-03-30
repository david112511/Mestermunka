import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages, Conversation, Message } from '@/hooks/useMessages';
import { useProfile } from '@/hooks/useProfile';
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
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showConversationList, setShowConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    conversations, 
    messages, 
    currentConversation, 
    loading, 
    conversationsLoading, 
    sendMessage, 
    fetchMessages, 
    setCurrentConversation 
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
    
    await sendMessage(currentConversation, newMessage);
    setNewMessage('');
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

  // Beszélgetések szűrése a keresés alapján
  const filteredConversations = conversations.filter(conversation => {
    const otherParticipant = conversation.participants.find(
      p => p.user.id !== user?.id
    )?.user;
    
    if (!otherParticipant) return false;
    
    const fullName = `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Másik résztvevő adatainak lekérése egy beszélgetésből
  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.user.id !== user?.id)?.user;
  };

  // Üzenet idejének formázása
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, 'HH:mm', { locale: hu });
    } else {
      return format(date, 'yyyy.MM.dd HH:mm', { locale: hu });
    }
  };

  // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Bejelentkezés szükséges</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">Az üzenetek megtekintéséhez kérjük, jelentkezz be.</p>
              <Button onClick={() => navigate('/')}>Vissza a főoldalra</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Beszélgetések listája */}
        {(showConversationList || !isMobileView) && (
          <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold mb-4">Beszélgetések</h2>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-13rem)]">
              {conversationsLoading ? (
                // Betöltés alatt megjelenő helyőrzők
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nincs még beszélgetésed. Kezdeményezz beszélgetést egy edzővel!</p>
                </div>
              ) : (
                filteredConversations.map(conversation => {
                  const otherParticipant = getOtherParticipant(conversation);
                  if (!otherParticipant) return null;
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`p-4 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                        currentConversation === conversation.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={otherParticipant.avatar_url || undefined} />
                        <AvatarFallback>
                          {otherParticipant.first_name?.[0]}{otherParticipant.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium truncate">
                            {otherParticipant.first_name} {otherParticipant.last_name}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {conversation.updated_at && formatMessageTime(conversation.updated_at)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.last_message?.content || 'Nincs üzenet'}
                          </p>
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>
        )}

        {/* Üzenetek megjelenítése */}
        {(!showConversationList || !isMobileView) && (
          <div className="flex-1 flex flex-col">
            {currentConversation ? (
              <>
                {/* Beszélgetés fejléce */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center">
                  {isMobileView && (
                    <Button variant="ghost" size="icon" onClick={handleBackToList} className="mr-2">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  {currentConversation && (
                    <>
                      {conversations.find(c => c.id === currentConversation) ? (
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage 
                              src={getOtherParticipant(
                                conversations.find(c => c.id === currentConversation)!
                              )?.avatar_url || undefined} 
                            />
                            <AvatarFallback>
                              {getOtherParticipant(
                                conversations.find(c => c.id === currentConversation)!
                              )?.first_name?.[0]}
                              {getOtherParticipant(
                                conversations.find(c => c.id === currentConversation)!
                              )?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="font-bold">
                              {getOtherParticipant(
                                conversations.find(c => c.id === currentConversation)!
                              )?.first_name}{' '}
                              {getOtherParticipant(
                                conversations.find(c => c.id === currentConversation)!
                              )?.last_name}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                              {getOtherParticipant(
                                conversations.find(c => c.id === currentConversation)!
                              )?.is_trainer ? 'Edző' : 'Felhasználó'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full mr-3" />
                          <div>
                            <Skeleton className="h-5 w-32 mb-1" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Üzenetek listája */}
                <ScrollArea className="flex-1 p-4">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nincs még üzenet</h3>
                      <p className="text-muted-foreground">
                        Küldj egy üzenetet a beszélgetés megkezdéséhez!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isCurrentUser = message.sender_id === user.id;
                        const showAvatar = index === 0 || 
                          messages[index - 1].sender_id !== message.sender_id;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isCurrentUser && showAvatar && (
                              <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
                                <AvatarImage src={message.sender?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {message.sender?.first_name?.[0]}{message.sender?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {!isCurrentUser && !showAvatar && <div className="w-10" />}
                            <div
                              className={`max-w-[70%] px-4 py-2 rounded-lg ${
                                isCurrentUser
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p>{message.content}</p>
                              <div
                                className={`text-xs mt-1 flex items-center ${
                                  isCurrentUser ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
                                }`}
                              >
                                {formatMessageTime(message.created_at)}
                                {isCurrentUser && (
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
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Üzenetküldő űrlap */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center space-x-2"
                >
                  <Input
                    placeholder="Írd be az üzeneted..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">Nincs kiválasztva beszélgetés</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Válassz ki egy beszélgetést a listából, vagy kezdeményezz új beszélgetést egy edzővel!
                </p>
                <Button onClick={() => navigate('/coaches')}>
                  Edzők böngészése
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
