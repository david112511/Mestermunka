import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Pencil, 
  Save, 
  Dumbbell, 
  Award, 
  MapPin, 
  Users, 
  Trophy, 
  BookOpen, 
  Settings, 
  Shield, 
  Lock, 
  BellRing, 
  Bell, 
  MessageSquare, 
  AlertTriangle, 
  Trash2, 
  CalendarCheck, 
  Clock, 
  Calendar, 
  Languages, 
  Scroll, 
  GraduationCap, 
  X, 
  Loader2,
  Briefcase,
  DollarSign,
  Plus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTrainerProfile } from '@/hooks/useTrainerProfile';
import { useLocations } from '@/hooks/useLocations';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Footer from '@/components/Footer';
import { Switch } from '@/components/ui/switch';
import AppointmentBooking from '@/components/AppointmentBooking';
import AppointmentsList from '@/components/AppointmentsList';
import TrainerAvailabilitySettingsV2 from '@/components/TrainerAvailabilitySettingsV2';
import TrainerServiceSettings from '@/components/trainer/TrainerServiceSettings';
import BookingConfirmationSettings from '@/components/trainer/BookingConfirmationSettings';
import BookingsList from '@/components/booking/BookingsList';

const Profile = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { 
    trainerProfile, 
    loading: trainerLoading, 
    isTrainer, 
    refreshProfile,
    updateSpecializations,
    updateCertifications,
    updateLanguages,
    updateEducation,
    updateLocation,
    setTrainerProfile
  } = useTrainerProfile();
  const { locations, loading: locationsLoading } = useLocations();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
  });
  
  const [trainerFormData, setTrainerFormData] = useState({
    description: '',
    full_bio: '',
    experience: '',
    price: '',
    availability: '',
    location: '',
    active_clients: 0,
    success_stories: 0,
  });
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordResetting, setPasswordResetting] = useState(false);
  const [savingTrainerData, setSavingTrainerData] = useState(false);
  const [availableSpecializations, setAvailableSpecializations] = useState<{id: string, name: string}[]>([]);
  const [availableCertifications, setAvailableCertifications] = useState<{id: string, name: string}[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<{id: string, name: string}[]>([]);
  const [availableEducation, setAvailableEducation] = useState<{id: string, name: string}[]>([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('');
  const [selectedCertification, setSelectedCertification] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedEducation, setSelectedEducation] = useState<string>('');
  const [removingItem, setRemovingItem] = useState<{type: string, id: string} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  
  // State for tracking async operations
  const [isAddingSpecialization, setIsAddingSpecialization] = useState(false);
  const [isAddingCertification, setIsAddingCertification] = useState(false);
  const [isAddingLanguage, setIsAddingLanguage] = useState(false);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [isLoadingCertifications, setIsLoadingCertifications] = useState(false);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isLoadingEducation, setIsLoadingEducation] = useState(false);
  
  // Get tab from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['personal', 'account', 'trainer', 'appointments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Set active tab
  const [activeTab, setActiveTab] = useState('personal');

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/profile?tab=${value}`, { replace: true });
  };
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user && !profileLoading) {
      navigate('/');
    }
  }, [user, profileLoading, navigate]);
  
  // Set initial form data from profile
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);
  
  // Set initial trainer form data
  useEffect(() => {
    if (trainerProfile) {
      setTrainerFormData({
        description: trainerProfile.description || '',
        full_bio: trainerProfile.full_bio || '',
        experience: trainerProfile.experience || '',
        price: trainerProfile.price || '',
        availability: trainerProfile.availability || '',
        location: trainerProfile.location || '',
        active_clients: trainerProfile.active_clients || 0,
        success_stories: trainerProfile.success_stories || 0,
      });
    }
  }, [trainerProfile]);
  
  // Set initial location value when trainer profile loads
  useEffect(() => {
    if (trainerProfile?.location) {
      // Find the location ID that matches the trainer's location name
      const locationObj = locations.find(loc => loc.name === trainerProfile.location);
      if (locationObj) {
        setSelectedLocation(locationObj.id);
      }
    }
  }, [trainerProfile, locations]);

  // Fetch available options for trainer profile
  useEffect(() => {
    const fetchAvailableOptions = async () => {
      if (!isTrainer) return;
      
      try {
        // Fetch specializations
        const { data: specializationsData, error: specializationsError } = await supabase
          .from('specializations')
          .select('id, name')
          .order('name');
          
        if (specializationsError) throw specializationsError;
        setAvailableSpecializations(specializationsData);
        
        // Fetch certifications
        const { data: certificationsData, error: certificationsError } = await supabase
          .from('certifications')
          .select('id, name')
          .order('name');
          
        if (certificationsError) throw certificationsError;
        setAvailableCertifications(certificationsData);
        
        // Fetch languages
        const { data: languagesData, error: languagesError } = await supabase
          .from('languages')
          .select('id, name')
          .order('name');
          
        if (languagesError) throw languagesError;
        setAvailableLanguages(languagesData);
        
        // Fetch education types
        const { data: educationData, error: educationError } = await supabase
          .from('education_types')
          .select('id, name')
          .order('name');
          
        if (educationError) throw educationError;
        setAvailableEducation(educationData);
        
      } catch (error) {
        console.error('Error fetching available options:', error);
      }
    };
    
    fetchAvailableOptions();
  }, [isTrainer]);
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Válasszon ki egy képet a feltöltéshez.');
      }
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update avatar_url in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user!.id);
        
      if (updateError) throw updateError;
      
      setAvatarUrl(data.publicUrl);
      
      toast({
        title: "Sikeres feltöltés",
        description: "A profilkép sikeresen frissítve.",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          bio: formData.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);
        
      if (error) throw error;
      
      toast({
        title: "Sikeres mentés",
        description: "A profil adatok sikeresen frissítve.",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Handle trainer form submission
  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSavingTrainerData(true);
      
      const { error } = await supabase
        .from('trainers')
        .update({
          description: trainerFormData.description,
          full_bio: trainerFormData.full_bio,
          experience: trainerFormData.experience,
          price: trainerFormData.price,
          availability: trainerFormData.availability,
          location: selectedLocation,
          active_clients: trainerFormData.active_clients,
          success_stories: trainerFormData.success_stories,
        })
        .eq('id', user!.id);
        
      if (error) throw error;
      
      toast({
        title: "Sikeres mentés",
        description: "A tréner profil adatok sikeresen frissítve.",
      });
    } catch (error: any) {
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingTrainerData(false);
    }
  };
  
  // Handle adding a specialization
  const handleAddSpecialization = async (value: string) => {
    if (!value || !user) return;
    
    try {
      setIsAddingSpecialization(true);
      
      // Find the specialization name
      const specialization = availableSpecializations.find(spec => spec.id === value);
      if (!specialization) throw new Error("Szakterület nem található");
      
      console.log(`Adding specialization: trainer_id=${user.id}, specialization_id=${value}`);
      
      const { data, error } = await supabase
        .from('trainer_specializations')
        .insert({
          trainer_id: user.id,
          specialization_id: value
        })
        .select();
      
      console.log('Add specialization response:', { data, error });
      
      if (error) throw error;
      
      // Update local state immediately to add the item to UI
      if (trainerProfile) {
        setTrainerProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            specializations: [...prev.specializations, { id: value, name: specialization.name }]
          };
        });
      }
      
      // Reset the select
      setSelectedSpecialization('');
      
      toast({
        title: "Sikeres hozzáadás",
        description: "A szakterület sikeresen hozzáadva.",
      });
    } catch (error: any) {
      console.error('Error adding specialization:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingSpecialization(false);
    }
  };
  
  // Handle add certification
  const handleAddCertification = async (value: string) => {
    if (!value || !user) return;
    
    try {
      setIsAddingCertification(true);
      
      // Find the certification name
      const certification = availableCertifications.find(cert => cert.id === value);
      if (!certification) throw new Error("Képesítés nem található");
      
      console.log(`Adding certification: trainer_id=${user.id}, certification_id=${value}`);
      
      const { data, error } = await supabase
        .from('trainer_certifications')
        .insert({
          trainer_id: user.id,
          certification_id: value
        })
        .select();
      
      console.log('Add certification response:', { data, error });
      
      if (error) throw error;
      
      // Update local state immediately to add the item to UI
      if (trainerProfile) {
        setTrainerProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            certifications: [...prev.certifications, { id: value, name: certification.name }]
          };
        });
      }
      
      // Reset the select
      setSelectedCertification('');
      
      toast({
        title: "Sikeres hozzáadás",
        description: "A képesítés sikeresen hozzáadva.",
      });
    } catch (error: any) {
      console.error('Error adding certification:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingCertification(false);
    }
  };
  
  // Handle add language
  const handleAddLanguage = async (value: string) => {
    if (!value || !user) return;
    
    try {
      setIsAddingLanguage(true);
      
      // Find the language name
      const language = availableLanguages.find(lang => lang.id === value);
      if (!language) throw new Error("Nyelv nem található");
      
      console.log(`Adding language: trainer_id=${user.id}, language_id=${value}`);
      
      const { data, error } = await supabase
        .from('trainer_languages')
        .insert({
          trainer_id: user.id,
          language_id: value
        })
        .select();
      
      console.log('Add language response:', { data, error });
      
      if (error) throw error;
      
      // Update local state immediately to add the item to UI
      if (trainerProfile) {
        setTrainerProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            languages: [...prev.languages, { id: value, name: language.name }]
          };
        });
      }
      
      // Reset the select
      setSelectedLanguage('');
      
      toast({
        title: "Sikeres hozzáadás",
        description: "A nyelv sikeresen hozzáadva.",
      });
    } catch (error: any) {
      console.error('Error adding language:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingLanguage(false);
    }
  };
  
  // Handle add education
  const handleAddEducation = async (value: string) => {
    if (!value || !user) return;
    
    try {
      setIsAddingEducation(true);
      
      // Find the education name
      const education = availableEducation.find(edu => edu.id === value);
      if (!education) throw new Error("Végzettség nem található");
      
      console.log(`Adding education: trainer_id=${user.id}, education_id=${value}`);
      
      const { data, error } = await supabase
        .from('trainer_education')
        .insert({
          trainer_id: user.id,
          education_id: value
        })
        .select();
      
      console.log('Add education response:', { data, error });
      
      if (error) throw error;
      
      // Update local state immediately to add the item to UI
      if (trainerProfile) {
        setTrainerProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            education: [...prev.education, { id: value, name: education.name }]
          };
        });
      }
      
      // Reset the select
      setSelectedEducation('');
      
      toast({
        title: "Sikeres hozzáadás",
        description: "A végzettség sikeresen hozzáadva.",
      });
    } catch (error: any) {
      console.error('Error adding education:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAddingEducation(false);
    }
  };
  
  // Handle removing an item
  const handleRemoveItem = async (type: string, id: string) => {
    if (!user) return;
    
    // Set the currently removing item
    setRemovingItem({ type, id });
    
    try {
      let error;
      let table = '';
      let idField = '';
      
      switch (type) {
        case 'specialization':
          table = 'trainer_specializations';
          idField = 'specialization_id';
          break;
        case 'certification':
          table = 'trainer_certifications';
          idField = 'certification_id';
          break;
        case 'language':
          table = 'trainer_languages';
          idField = 'language_id';
          break;
        case 'education':
          table = 'trainer_education';
          idField = 'education_id';
          break;
      }
      
      console.log(`Deleting from ${table} where trainer_id=${user.id} and ${idField}=${id}`);
      
      const { data, error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('trainer_id', user.id)
        .eq(idField, id);
      
      console.log('Delete response:', { data, error: deleteError });
      error = deleteError;
      
      // Update local state immediately to remove the item from UI
      if (!error && trainerProfile) {
        setTrainerProfile(prev => {
          if (!prev) return null;
          
          let updatedProfile = { ...prev };
          
          switch (type) {
            case 'specialization':
              updatedProfile.specializations = prev.specializations.filter(item => item.id !== id);
              break;
            case 'certification':
              updatedProfile.certifications = prev.certifications.filter(item => item.id !== id);
              break;
            case 'language':
              updatedProfile.languages = prev.languages.filter(item => item.id !== id);
              break;
            case 'education':
              updatedProfile.education = prev.education.filter(item => item.id !== id);
              break;
          }
          
          return updatedProfile;
        });
      }
      
      if (error) throw error;
      
      toast({
        title: "Sikeres törlés",
        description: "Az elem sikeresen törölve.",
      });
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      // Clear the removing item
      setRemovingItem(null);
    }
  };

  // Handle location change
  const handleLocationChange = async (value: string) => {
    if (!value || !user) return;
    
    try {
      setUpdatingLocation(true);
      
      // Find the location name
      const location = locations.find(loc => loc.id === value);
      if (!location) throw new Error("Helyszín nem található");
      
      console.log(`Updating location: trainer_id=${user.id}, location=${location.name}`);
      
      const { data, error } = await supabase
        .from('trainers')
        .update({ location: location.name })
        .eq('id', user.id)
        .select();
      
      console.log('Update location response:', { data, error });
      
      if (error) throw error;
      
      // Update location in state without full refresh
      updateLocation(location.name);
      
      // Also update the selected location for the dropdown
      setSelectedLocation(value);
      
      toast({
        title: "Sikeres frissítés",
        description: "A helyszín sikeresen frissítve.",
      });
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingLocation(false);
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

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user) return;
    
    try {
      setPasswordResetting(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Email elküldve",
        description: "A jelszó visszaállításához szükséges email elküldve a megadott címre.",
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Hiba történt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPasswordResetting(false);
    }
  };

  const [viewingOtherProfile, setViewingOtherProfile] = useState<boolean>(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [otherUserTrainerProfile, setOtherUserTrainerProfile] = useState<any>(null);
  const [otherUserLoading, setOtherUserLoading] = useState<boolean>(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    
    if (id && id !== user?.id) {
      setViewingOtherProfile(true);
      setProfileId(id);
      fetchOtherUserProfile(id);
    } else {
      setViewingOtherProfile(false);
      setProfileId(null);
    }
  }, [user]);

  const fetchOtherUserProfile = async (id: string) => {
    setOtherUserLoading(true);
    try {
      // Profil adatok lekérése
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (profileError) throw profileError;
      setOtherUserProfile(profileData);
      
      // Csak akkor próbáljuk lekérdezni az edző-specifikus adatokat, ha a felhasználó edző
      if (profileData.user_type === 'trainer') {
        // Edző-specifikus adatok lekérdezése
        // Ezeket a táblákat külön kérdezzük le, hogy elkerüljük a trainer_profiles táblát
        
        // Specializációk lekérdezése
        const { data: specializationsData, error: specializationsError } = await supabase
          .from('trainer_specializations')
          .select(`
            id,
            specialization:specializations(id, name)
          `)
          .eq('trainer_id', id);
          
        // Képesítések lekérdezése
        const { data: certificationsData, error: certificationsError } = await supabase
          .from('trainer_certifications')
          .select(`
            id,
            certification:certifications(id, name)
          `)
          .eq('trainer_id', id);
          
        // Nyelvek lekérdezése
        const { data: languagesData, error: languagesError } = await supabase
          .from('trainer_languages')
          .select(`
            id,
            language:languages(id, name)
          `)
          .eq('trainer_id', id);
          
        // Képzettség lekérdezése
        const { data: educationData, error: educationError } = await supabase
          .from('trainer_education')
          .select(`
            id,
            education:education_types(id, name)
          `)
          .eq('trainer_id', id);
          
        // Helyszín lekérdezése
        const { data: locationData, error: locationError } = await supabase
          .from('locations')
          .select('id, name')
          .eq('trainer_id', id)
          .single();
          
        // Ha sikeresen lekérdeztük az adatokat, akkor formázzuk őket
        if (!specializationsError || !certificationsError || !languagesError || !educationError) {
          // Formázás a megfelelő struktúrára
          const formattedTrainerProfile = {
            user_id: id,
            specializations: specializationsData ? specializationsData.map((s: any) => ({
              id: s.specialization.id,
              name: s.specialization.name
            })) : [],
            certifications: certificationsData ? certificationsData.map((c: any) => ({
              id: c.certification.id,
              name: c.certification.name
            })) : [],
            languages: languagesData ? languagesData.map((l: any) => ({
              id: l.language.id,
              name: l.language.name
            })) : [],
            education: educationData ? educationData.map((e: any) => ({
              id: e.education.id,
              name: e.education.name
            })) : [],
            location: !locationError ? locationData : null
          };
          
          setOtherUserTrainerProfile(formattedTrainerProfile);
        }
      }
    } catch (error) {
      console.error('Error fetching other user profile:', error);
      toast({
        title: "Hiba történt",
        description: "Nem sikerült betölteni a felhasználó profilját.",
        variant: "destructive",
      });
    } finally {
      setOtherUserLoading(false);
    }
  };

  if (profileLoading || trainerLoading || locationsLoading || (viewingOtherProfile && otherUserLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-gray-600">Profil betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  // Ha másik felhasználó profilját nézzük
  if (viewingOtherProfile) {
    const displayProfile = otherUserProfile;
    const displayTrainerProfile = otherUserTrainerProfile;
    const isTrainerProfile = !!displayTrainerProfile;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="mb-8">
            <Button 
              onClick={() => navigate(-1)} 
              variant="outline" 
              className="flex items-center text-gray-600 hover:text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Vissza
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Bal oldali profil kártya */}
            <div className="lg:col-span-1">
              <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-primary/80 to-primary h-32 relative"></div>
                  <div className="px-6 pb-6 pt-16 relative">
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                      <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                        <AvatarImage src={displayProfile?.avatar_url || ''} alt={`${displayProfile?.first_name} ${displayProfile?.last_name}`} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                          {displayProfile?.first_name?.[0]}{displayProfile?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-gray-800">
                        {displayProfile?.first_name} {displayProfile?.last_name}
                      </h2>
                      {isTrainerProfile && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mt-1">
                          <Dumbbell className="h-3.5 w-3.5 mr-1" />
                          Személyi edző
                        </Badge>
                      )}
                    </div>
                    
                    {displayProfile?.bio && (
                      <div className="mb-6">
                        <p className="text-gray-600 text-sm leading-relaxed">{displayProfile.bio}</p>
                      </div>
                    )}
                    
                    {isTrainerProfile && (
                      <div className="space-y-4 mb-6">
                        <div className="flex items-start space-x-3">
                          <Briefcase className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Tapasztalat</h4>
                            <p className="text-sm text-gray-600">{displayTrainerProfile.experience || 'Nem megadott'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Helyszín</h4>
                            <p className="text-sm text-gray-600">{displayTrainerProfile.location || 'Nem megadott'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <DollarSign className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Ár</h4>
                            <p className="text-sm text-gray-600">{displayTrainerProfile.price || 'Nem megadott'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-700">Elérhetőség</h4>
                            <p className="text-sm text-gray-600">{displayTrainerProfile.availability || 'Nem megadott'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isTrainerProfile && (
                      <div className="pt-4 border-t border-gray-100">
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 transition-colors shadow-md"
                          onClick={() => setActiveTab('appointments')}
                        >
                          <CalendarCheck className="mr-2 h-5 w-5" />
                          Időpontfoglalás
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {isTrainerProfile && (
                <>
                  {/* Szakosodások */}
                  {displayTrainerProfile.specializations && displayTrainerProfile.specializations.length > 0 && (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center text-primary">
                          <Award className="mr-2 h-5 w-5" />
                          Szakterületek
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {displayTrainerProfile.specializations.map((spec: any) => (
                            <Badge key={spec.id} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                              {spec.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Képesítések */}
                  {displayTrainerProfile.certifications && displayTrainerProfile.certifications.length > 0 && (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center text-primary">
                          <Scroll className="mr-2 h-5 w-5" />
                          Képesítések
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {displayTrainerProfile.certifications.map((cert: any) => (
                            <Badge key={cert.id} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                              {cert.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Nyelvek */}
                  {displayTrainerProfile.languages && displayTrainerProfile.languages.length > 0 && (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center text-primary">
                          <Languages className="mr-2 h-5 w-5" />
                          Beszélt nyelvek
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {displayTrainerProfile.languages.map((lang: any) => (
                            <Badge key={lang.id} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                              {lang.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Végzettség */}
                  {displayTrainerProfile.education && displayTrainerProfile.education.length > 0 && (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center text-primary">
                          <GraduationCap className="mr-2 h-5 w-5" />
                          Végzettség
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {displayTrainerProfile.education.map((edu: any) => (
                            <Badge key={edu.id} variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                              {edu.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
            
            {/* Jobb oldali tartalom */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="about" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="about" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Bemutatkozás
                  </TabsTrigger>
                  <TabsTrigger value="appointments" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    Időpontfoglalás
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="about">
                  {isTrainerProfile && displayTrainerProfile.full_bio ? (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-xl text-primary">Részletes bemutatkozás</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-5">
                        <div className="prose max-w-none text-gray-700">
                          {displayTrainerProfile.full_bio.split('\n').map((paragraph: string, i: number) => (
                            <p key={i} className="mb-4">{paragraph}</p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center py-8">
                          <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-500 mb-2">Nincs részletes bemutatkozás</h3>
                          <p className="text-gray-400 text-center">Az edző még nem adott meg részletes bemutatkozást.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="appointments">
                  {isTrainerProfile ? (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-xl text-primary">Időpontfoglalás</CardTitle>
                        <CardDescription>Foglalj időpontot az edzővel</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-5">
                        <AppointmentBooking 
                          trainerId={profileId!} 
                          trainerName={`${displayProfile?.first_name} ${displayProfile?.last_name}`}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-500 mb-2">Időpontfoglalás nem elérhető</h3>
                          <p className="text-gray-400 text-center">Ez a felhasználó nem edző, így nem lehet időpontot foglalni vele.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid ${isTrainer ? 'grid-cols-4' : 'grid-cols-3'} w-full max-w-3xl mx-auto mb-8 bg-white shadow-sm rounded-lg overflow-hidden`}>
            <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Profil
            </TabsTrigger>
            {isTrainer && (
              <TabsTrigger value="trainer" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <Dumbbell className="h-4 w-4 mr-2" />
                Edző profil
              </TabsTrigger>
            )}
            <TabsTrigger value="appointments" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <CalendarCheck className="h-4 w-4 mr-2" />
              Foglalásaim
            </TabsTrigger>
            <TabsTrigger value="account" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Fiók
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal">
            <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="flex items-center text-primary">
                  <User className="mr-2 h-5 w-5" />
                  Személyes adatok
                </CardTitle>
                <CardDescription>
                  Frissítsd személyes adataidat
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center md:w-1/3">
                    <div className="relative mb-4">
                      <Avatar className="h-36 w-36 border-4 border-white shadow-lg">
                        <AvatarImage src={avatarUrl || ''} alt={profile?.first_name || 'Felhasználó'} />
                        <AvatarFallback className="bg-primary/10 text-primary text-3xl font-medium">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Camera className="h-5 w-5" />
                        )}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </div>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      Kattints a kamera ikonra a profilkép módosításához
                    </p>
                  </div>
                  
                  {/* Personal Info Form */}
                  <div className="md:w-2/3">
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="first_name" className="text-sm font-medium">Keresztnév</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <Input
                              id="first_name"
                              name="first_name"
                              value={formData.first_name}
                              onChange={handleChange}
                              className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                              placeholder="Keresztnév"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name" className="text-sm font-medium">Vezetéknév</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <Input
                              id="last_name"
                              name="last_name"
                              value={formData.last_name}
                              onChange={handleChange}
                              className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                              placeholder="Vezetéknév"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email cím</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="email"
                            value={user?.email || ''}
                            className="pl-10 pr-3 py-2 bg-gray-100 border-gray-200 text-gray-500"
                            disabled
                          />
                        </div>
                        <p className="text-xs text-gray-500 italic">
                          Az email cím módosításához lépj kapcsolatba az ügyfélszolgálattal
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Telefonszám</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="phone"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={handleChange}
                            className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                            placeholder="+36 XX XXX XXXX"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-sm font-medium">Bemutatkozás</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio || ''}
                          onChange={handleChange}
                          placeholder="Írj magadról néhány mondatot..."
                          className="min-h-[120px] bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 transition-colors shadow-md"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Mentés folyamatban...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            Adatok mentése
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trainer">
            {isTrainer ? (
              <div className="space-y-8">
                {/* Edző profil beállítások */}
                <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-primary/5 border-b pb-4">
                    <CardTitle className="flex items-center text-primary">
                      <Dumbbell className="mr-2 h-5 w-5" />
                      Edző profil beállítások
                    </CardTitle>
                    <CardDescription>
                      Kezeld edzői profilod beállításait és szolgáltatásaidat
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="border-b pb-6">
                        <h3 className="text-lg font-medium mb-4">Elérhetőségek kezelése</h3>
                        <p className="text-gray-500 mb-4">Itt állíthatod be, hogy mely napokon és időpontokban vagy elérhető az ügyfeleid számára.</p>
                        <TrainerAvailabilitySettingsV2 />
                      </div>
                      
                      <div className="border-b pb-6">
                        <h3 className="text-lg font-medium mb-4">Foglalások megerősítési módja</h3>
                        <p className="text-gray-500 mb-4">Itt állíthatod be, hogy a foglalásokat automatikusan megerősítse-e a rendszer, vagy manuálisan szeretnéd jóváhagyni azokat.</p>
                        <BookingConfirmationSettings />
                      </div>
                      
                      <div className="pt-2">
                        <h3 className="text-lg font-medium mb-4">Szolgáltatások kezelése</h3>
                        <p className="text-gray-500 mb-4">Itt kezelheted a szolgáltatásaidat, amelyekre ügyfeleid időpontot foglalhatnak.</p>
                        <TrainerServiceSettings />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Dumbbell className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Edzői profil nem elérhető</h3>
                    <p className="text-gray-400 text-center">Nem rendelkezel edzői jogosultsággal. Ha szeretnél edző lenni, kérjük, vedd fel a kapcsolatot az adminisztrátorral.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* A duplált foglalások doboz eltávolítva */}
          
          <TabsContent value="account">
            <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="flex items-center text-primary">
                  <Settings className="mr-2 h-5 w-5" />
                  Fiók beállítások
                </CardTitle>
                <CardDescription>
                  Kezeld fiókod beállításait és biztonsági opcióit
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <Shield className="mr-2 h-5 w-5 text-primary" />
                      Jelszó módosítása
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Rendszeresen változtasd meg jelszavad a biztonság érdekében
                    </p>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white font-medium transition-colors shadow-sm"
                      onClick={handlePasswordReset}
                      disabled={passwordResetting}
                    >
                      {passwordResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Jelszó visszaállítása folyamatban...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Jelszó visszaállítása
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <BellRing className="mr-2 h-5 w-5 text-primary" />
                      Értesítési beállítások
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Állítsd be, hogy milyen értesítéseket szeretnél kapni
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Email értesítések</span>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Üzenet értesítések</span>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Rendszer értesítések</span>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-lg font-medium mb-2 flex items-center text-red-500">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      Veszélyes zóna
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Figyelem! Ezek a műveletek nem visszavonhatóak.
                    </p>
                    <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Fiók törlése
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trainer">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Specializations and Qualifications */}
              <Card className="lg:col-span-1 bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center text-primary">
                    <Award className="mr-2 h-5 w-5" />
                    Szakmai adatok
                  </CardTitle>
                  <CardDescription>
                    Szakterületek és képesítések
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Specializations */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <Award className="mr-2 h-4 w-4 text-primary" />
                      Szakterületek
                    </Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Select 
                        value={selectedSpecialization} 
                        onValueChange={handleAddSpecialization}
                        disabled={isAddingSpecialization}
                      >
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-md p-2 focus:ring-2 focus:ring-primary/20">
                          {isAddingSpecialization ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Hozzáadás...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Válassz szakterületet" />
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-md w-[280px] mt-2">
                          {availableSpecializations.map((spec) => (
                            <SelectItem key={spec.id} value={spec.id} className="hover:bg-gray-100 py-2 px-4">{spec.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-24 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <div className="flex flex-wrap gap-2">
                        {trainerProfile?.specializations.map((spec) => (
                          <Badge 
                            key={spec.id} 
                            variant="secondary" 
                            className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6 bg-white border border-gray-200 shadow-sm"
                            onClick={() => handleRemoveItem('specialization', spec.id)}
                          >
                            {spec.name}
                            <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Certifications */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <Scroll className="mr-2 h-4 w-4 text-primary" />
                      Képesítések
                    </Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Select 
                        value={selectedCertification} 
                        onValueChange={handleAddCertification}
                        disabled={isAddingCertification || isLoadingCertifications}
                      >
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary/20">
                          {(isAddingCertification || isLoadingCertifications) ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Betöltés...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Válassz képesítést" />
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-md w-full mt-2">
                          {availableCertifications.map((cert) => (
                            <SelectItem key={cert.id} value={cert.id} className="hover:bg-gray-100 py-2 px-4">{cert.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-24 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <div className="flex flex-wrap gap-2">
                        {trainerProfile?.certifications.map((cert) => (
                          <Badge 
                            key={cert.id} 
                            variant="secondary" 
                            className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6 bg-white border border-gray-200 shadow-sm"
                            onClick={() => handleRemoveItem('certification', cert.id)}
                          >
                            {cert.name}
                            <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Languages */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <Languages className="mr-2 h-4 w-4 text-primary" />
                      Nyelvek
                    </Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Select 
                        value={selectedLanguage} 
                        onValueChange={handleAddLanguage}
                        disabled={isAddingLanguage || isLoadingLanguages}
                      >
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary/20">
                          {(isAddingLanguage || isLoadingLanguages) ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Betöltés...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Válassz nyelvet">
                              {selectedLanguage ? 
                                availableLanguages.find(lang => lang.id === selectedLanguage)?.name || "Válassz nyelvet" 
                                : "Válassz nyelvet"}
                            </SelectValue>
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-md w-full mt-2">
                          {availableLanguages.map((lang) => (
                            <SelectItem key={lang.id} value={lang.id} className="hover:bg-gray-100 py-2 px-4">{lang.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-24 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <div className="flex flex-wrap gap-2">
                        {trainerProfile?.languages.map((lang) => (
                          <Badge 
                            key={lang.id} 
                            variant="secondary" 
                            className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6 bg-white border border-gray-200 shadow-sm"
                            onClick={() => handleRemoveItem('language', lang.id)}
                          >
                            {lang.name}
                            <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Education */}
                  <div className="space-y-3">
                    <Label className="flex items-center text-sm font-medium text-gray-700">
                      <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                      Végzettség
                    </Label>
                    <div className="flex items-center gap-2 mb-2">
                      <Select 
                        value={selectedEducation} 
                        onValueChange={handleAddEducation}
                        disabled={isAddingEducation || isLoadingEducation}
                      >
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary/20">
                          {(isAddingEducation || isLoadingEducation) ? (
                            <div className="flex items-center">
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              <span>Betöltés...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Válassz végzettséget">
                              {selectedEducation ? 
                                availableEducation.find(edu => edu.id === selectedEducation)?.name || "Válassz végzettséget" 
                                : "Válassz végzettséget"}
                            </SelectValue>
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-md w-full mt-2">
                          {availableEducation.map((edu) => (
                            <SelectItem key={edu.id} value={edu.id} className="hover:bg-gray-100 py-2 px-4">{edu.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-24 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <div className="flex flex-wrap gap-2">
                        {trainerProfile?.education.map((edu) => (
                          <Badge 
                            key={edu.id} 
                            variant="secondary" 
                            className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6 bg-white border border-gray-200 shadow-sm"
                            onClick={() => handleRemoveItem('education', edu.id)}
                          >
                            {edu.name}
                            <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
              
              {/* Right Column - Trainer Profile */}
              <Card className="lg:col-span-2 bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center text-primary">
                    <Dumbbell className="mr-2 h-5 w-5" />
                    Edzői profil
                  </CardTitle>
                  <CardDescription>
                    Kezeld edzői profilod adatait
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleTrainerSubmit} className="space-y-5">
                    <div className="space-y-3">
                      <Label htmlFor="description" className="text-sm font-medium">Rövid leírás</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Textarea
                          id="description"
                          name="description"
                          value={trainerFormData.description || ''}
                          onChange={(e) => setTrainerFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Írj röviden magadról..."
                          className="min-h-[100px] pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Ez a rövid leírás jelenik meg a profilod kártyáján
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="full_bio" className="text-sm font-medium">Teljes leírás</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Textarea
                          id="full_bio"
                          name="full_bio"
                          value={trainerFormData.full_bio || ''}
                          onChange={(e) => setTrainerFormData(prev => ({ ...prev, full_bio: e.target.value }))}
                          placeholder="Írj részletesen magadról..."
                          className="min-h-[200px] pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        A teljes leírás a részletes profilodban jelenik meg
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <Label htmlFor="experience" className="text-sm font-medium">Tapasztalat</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="experience"
                            name="experience"
                            value={trainerFormData.experience || ''}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, experience: e.target.value }))}
                            placeholder="pl. 5+ év"
                            className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="price" className="text-sm font-medium">Ár</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="price"
                            name="price"
                            value={trainerFormData.price || ''}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="pl. 10000 Ft/óra"
                            className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <Label htmlFor="availability" className="text-sm font-medium">Elérhetőség</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="availability"
                            name="availability"
                            value={trainerFormData.availability || ''}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, availability: e.target.value }))}
                            placeholder="pl. H-P: 8-18"
                            className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="location" className="text-sm font-medium">Helyszín</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Select value={selectedLocation} onValueChange={(value) => handleLocationChange(value)}>
                            <SelectTrigger className="w-full bg-gray-50 border-gray-200 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary/20">
                              {updatingLocation ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  <span>Frissítés...</span>
                                </div>
                              ) : (
                                <SelectValue placeholder="Válassz helyszínt">
                                  {selectedLocation ? 
                                    locations.find(loc => loc.id === selectedLocation)?.name || "Válassz helyszínt" 
                                    : "Válassz helyszínt"}
                                </SelectValue>
                              )}
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-md w-full mt-2">
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id} className="hover:bg-gray-100 py-2 px-4">{location.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        <Label htmlFor="active_clients" className="text-sm font-medium">Aktív kliensek</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="active_clients"
                            name="active_clients"
                            type="number"
                            value={trainerFormData.active_clients || 0}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, active_clients: parseInt(e.target.value) || 0 }))}
                            placeholder="pl. 15"
                            className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="success_stories" className="text-sm font-medium">Sikertörténetek</Label>
                        <div className="relative">
                          <Trophy className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          <Input
                            id="success_stories"
                            name="success_stories"
                            type="number"
                            value={trainerFormData.success_stories || 0}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, success_stories: parseInt(e.target.value) || 0 }))}
                            placeholder="pl. 25"
                            className="pl-10 pr-3 py-2 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 transition-colors shadow-md"
                        disabled={savingTrainerData}
                      >
                        {savingTrainerData ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Mentés folyamatban...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            Edzői profil mentése
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="appointments">
            <div className="grid grid-cols-1 gap-8">
              <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-primary/5 border-b pb-4">
                  <CardTitle className="flex items-center text-primary">
                    <CalendarCheck className="mr-2 h-5 w-5" />
                    Foglalásaim
                  </CardTitle>
                  <CardDescription>
                    Tekintsd meg és kezeld az összes foglalásodat
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <BookingsList />
                </CardContent>
              </Card>
              
              {/* Az elérhetőségi idők doboz eltávolítva */}
              
              {!isTrainer && (
                <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-primary/5 border-b pb-4">
                    <CardTitle className="flex items-center text-primary">
                      <Dumbbell className="mr-2 h-5 w-5" />
                      Edzők keresése
                    </CardTitle>
                    <CardDescription>
                      Találj személyi edzőt
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Calendar className="h-12 w-12 text-primary/40 mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">Találj személyi edzőt</h3>
                      <p className="text-gray-500 mb-4">Böngéssz az elérhető edzők között és foglalj időpontot</p>
                      <Button 
                        onClick={() => navigate('/trainers')}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        Edzők böngészése
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
