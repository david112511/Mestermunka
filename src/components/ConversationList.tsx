import React, { memo, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MessageCircle, User } from 'lucide-react';

// ConversationList komponens a beszélgetések listájának kezeléséhez
const ConversationList = memo(({ 
  currentConversation, 
  setCurrentConversation, 
  isMobileView,
  setShowConversationList
}: { 
  currentConversation: string | null; 
  setCurrentConversation: (id: string) => void; 
  isMobileView: boolean;
  setShowConversationList: (show: boolean) => void;
}) => {
  const { user } = useAuth();
  const { 
    conversations, 
    conversationsLoading
  } = useMessages();
  
  const [searchQuery, setSearchQuery] = useState('');

  // Résztvevő lekérdezése
  const getOtherParticipant = (conversation: any) => {
    if (!conversation || !conversation.participants || !user) return null;
    return conversation.participants.find((p: any) => p.id !== user.id);
  };

  // Szűrés a keresési lekérdezés alapján
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conversation => {
      const otherParticipant = getOtherParticipant(conversation);
      if (!otherParticipant) return false;
      
      const fullName = `${otherParticipant.first_name} ${otherParticipant.last_name}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, user]);

  // Navigálás a coaches oldalra
  const navigateToCoaches = () => {
    window.location.href = '/coaches';
  };

  return (
    <div className="w-full md:w-1/3 border-r border-indigo-100 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl relative overflow-hidden flex flex-col">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-white/10 rounded-full mix-blend-overlay filter blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-[250px] h-[250px] bg-pink-500/10 rounded-full mix-blend-overlay filter blur-3xl"></div>
      </div>
      
      <div className="p-4 border-b border-indigo-400/30 bg-indigo-600/80 backdrop-blur-sm relative z-10 flex-shrink-0">
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
      
      {/* Beszélgetések listája */}
      <ScrollArea className="flex-1 overflow-y-auto">
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
        ) : conversations.length === 0 ? (
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
              onClick={navigateToCoaches}
            >
              Edzők böngészése
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
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
                      : 'hover:bg-white/10'
                  }`}
                  onClick={() => {
                    setCurrentConversation(conversation.id);
                    if (isMobileView) {
                      setShowConversationList(false);
                    }
                  }}
                >
                  <div className="flex items-center">
                    {otherParticipant.avatar_url ? (
                      <img 
                        src={otherParticipant.avatar_url} 
                        alt={otherParticipant.first_name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white border-2 border-white/30">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-white truncate">
                          {otherParticipant.first_name} {otherParticipant.last_name}
                        </h3>
                        {lastMessageTime && (
                          <span className="text-xs text-indigo-200 whitespace-nowrap ml-2">
                            {format(new Date(lastMessageTime), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-indigo-100 truncate mt-1">
                        {conversation.last_message && 'message_type' in conversation.last_message && conversation.last_message.message_type === 'image' 
                          ? '🖼️ Kép' 
                          : conversation.last_message && 'message_type' in conversation.last_message && conversation.last_message.message_type === 'emoji'
                            ? conversation.last_message.content
                            : lastMessageContent}
                      </p>
                    </div>
                  </div>
                  
                  {/* Olvasatlan üzenetek jelzése */}
                  {conversation.unread_count > 0 && (
                    <div className="absolute top-4 right-3">
                      <div className="bg-primary text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {conversation.unread_count}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList;
