import { Link } from 'react-router-dom';
import { UserProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Calendar, 
  Settings, 
  LogOut, 
  ChevronDown,
  Clock,
  MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileMenuProps {
  profile: UserProfile | null;
}

export const ProfileMenu = ({ profile }: ProfileMenuProps) => {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Sikeres kijelentkezés",
        description: "Viszlát legközelebb!",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!profile) return 'U';
    
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    } else if (firstName) {
      return firstName.charAt(0);
    } else {
      return 'U';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
        <Avatar className="h-8 w-8 border border-primary/20">
          <AvatarImage src={profile?.avatar_url || ''} alt={profile?.first_name || 'Felhasználó'} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials()}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium hidden sm:inline-block text-gray-800">
          {profile?.first_name || 'Felhasználó'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1 border border-gray-200 shadow-lg rounded-lg bg-white">
        <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-100 mb-1">
          {profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}`
            : 'Felhasználó'
          }
        </div>
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
            <User className="mr-2 h-4 w-4 text-primary" />
            <span>Profilom</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/calendar" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            <span>Naptáram</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/messages" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
            <MessageCircle className="mr-2 h-4 w-4 text-primary" />
            <span>Üzenetek</span>
          </Link>
        </DropdownMenuItem>
        {profile?.is_trainer && (
          <DropdownMenuItem asChild>
            <Link to="/calendar?availability=true" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              <Clock className="mr-2 h-4 w-4 text-primary" />
              <span>Elérhetőségeim</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center w-full px-3 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-md">
            <Settings className="mr-2 h-4 w-4 text-primary" />
            <span>Beállítások</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-gray-100" />
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="px-3 py-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md my-1 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Kijelentkezés</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
