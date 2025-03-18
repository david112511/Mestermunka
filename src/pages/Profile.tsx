import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTrainerProfile } from '@/hooks/useTrainerProfile';
import { useLocations } from '@/hooks/useLocations';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  Award, 
  Scroll, 
  Languages, 
  GraduationCap, 
  DollarSign, 
  Clock, 
  Users, 
  Trophy,
  Plus,
  X
} from 'lucide-react';
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
import { 
  Loader2, 
  Camera, 
  Briefcase, 
  Save
} from 'lucide-react';
import Navigation from '@/components/Navigation';

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
    if (tabParam && ['personal', 'account', 'trainer'].includes(tabParam)) {
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
  
  if (profileLoading || trainerLoading || locationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg text-gray-600">Betöltés...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profilom</h1>
          <p className="mt-2 text-lg text-gray-600">Kezeld személyes adataidat és beállításaidat</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="personal" onClick={() => navigate('/profile?tab=personal', { replace: true })}>Személyes adatok</TabsTrigger>
            <TabsTrigger value="account" onClick={() => navigate('/profile?tab=account', { replace: true })}>Fiók beállítások</TabsTrigger>
            {isTrainer && <TabsTrigger value="trainer" onClick={() => navigate('/profile?tab=trainer', { replace: true })}>Edzői profil</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="personal">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Profile Picture Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profilkép</CardTitle>
                  <CardDescription>
                    Válassz egy profilképet, amely megjelenik a profilodban
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                      <AvatarImage src={avatarUrl || ''} alt={profile?.first_name || 'Felhasználó'} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
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
                  <p className="text-sm text-gray-500 text-center">
                    Kattints a kamera ikonra a profilkép módosításához
                  </p>
                </CardContent>
              </Card>
              
              {/* Personal Info Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Személyes adatok</CardTitle>
                  <CardDescription>
                    Frissítsd személyes adataidat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Keresztnév</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="pl-10"
                            placeholder="Keresztnév"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Vezetéknév</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="pl-10"
                            placeholder="Vezetéknév"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email cím</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          value={user?.email || ''}
                          className="pl-10"
                          disabled
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Az email cím módosításához lépj kapcsolatba az ügyfélszolgálattal
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefonszám</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone || ''}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="+36 XX XXX XXXX"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bemutatkozás</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        placeholder="Írj magadról néhány mondatot..."
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mentés...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Mentés
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Fiók beállítások</CardTitle>
                <CardDescription>
                  Kezeld fiókod beállításait és biztonsági opcióit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  A fiók beállítások hamarosan elérhetőek lesznek...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {isTrainer && (
            <TabsContent value="trainer">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="md:col-span-1">
                  <CardHeader>
                    <CardTitle>Szakmai adatok</CardTitle>
                    <CardDescription>
                      Szakterületek és képesítések
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <Award className="mr-2 h-4 w-4 text-primary" />
                        Szakterületek
                      </Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Select 
                          value={selectedSpecialization} 
                          onValueChange={handleAddSpecialization}
                          disabled={isAddingSpecialization}
                        >
                          <SelectTrigger className="w-[180px] bg-white border border-gray-200 rounded-md p-2">
                            {isAddingSpecialization ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Hozzáadás...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Válassz szakterületet" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-md w-[180px] mt-2">
                            {availableSpecializations.map((spec) => (
                              <SelectItem key={spec.id} value={spec.id} className="hover:bg-gray-100 py-2 px-4">{spec.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <ScrollArea className="h-24 rounded-md border p-2">
                        <div className="flex flex-wrap gap-2">
                          {trainerProfile?.specializations.map((spec) => (
                            <Badge 
                              key={spec.id} 
                              variant="secondary" 
                              className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6"
                              onClick={() => handleRemoveItem('specialization', spec.id)}
                            >
                              {spec.name}
                              <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <Scroll className="mr-2 h-4 w-4 text-primary" />
                        Képesítések
                      </Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Select 
                          value={selectedCertification} 
                          onValueChange={handleAddCertification}
                          disabled={isAddingCertification || isLoadingCertifications}
                        >
                          <SelectTrigger className="w-[180px] bg-white border border-gray-200 rounded-md p-2">
                            {(isAddingCertification || isLoadingCertifications) ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Betöltés...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Válassz képesítést" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-md w-[180px] mt-2">
                            {availableCertifications.map((cert) => (
                              <SelectItem key={cert.id} value={cert.id} className="hover:bg-gray-100 py-2 px-4">{cert.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <ScrollArea className="h-24 rounded-md border p-2">
                        <div className="flex flex-wrap gap-2">
                          {trainerProfile?.certifications.map((cert) => (
                            <Badge 
                              key={cert.id} 
                              variant="secondary" 
                              className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6"
                              onClick={() => handleRemoveItem('certification', cert.id)}
                            >
                              {cert.name}
                              <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <Languages className="mr-2 h-4 w-4 text-primary" />
                        Nyelvek
                      </Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Select 
                          value={selectedLanguage} 
                          onValueChange={handleAddLanguage}
                          disabled={isAddingLanguage || isLoadingLanguages}
                        >
                          <SelectTrigger className="w-[180px] bg-white border border-gray-200 rounded-md p-2">
                            {(isAddingLanguage || isLoadingLanguages) ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Betöltés...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Válassz nyelvet" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-md w-[180px] mt-2">
                            {availableLanguages.map((lang) => (
                              <SelectItem key={lang.id} value={lang.id} className="hover:bg-gray-100 py-2 px-4">{lang.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <ScrollArea className="h-24 rounded-md border p-2">
                        <div className="flex flex-wrap gap-2">
                          {trainerProfile?.languages.map((lang) => (
                            <Badge 
                              key={lang.id} 
                              variant="secondary" 
                              className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6"
                              onClick={() => handleRemoveItem('language', lang.id)}
                            >
                              {lang.name}
                              <X className="h-3 w-3 absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100" />
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <GraduationCap className="mr-2 h-4 w-4 text-primary" />
                        Végzettség
                      </Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Select 
                          value={selectedEducation} 
                          onValueChange={handleAddEducation}
                          disabled={isAddingEducation || isLoadingEducation}
                        >
                          <SelectTrigger className="w-[180px] bg-white border border-gray-200 rounded-md p-2">
                            {(isAddingEducation || isLoadingEducation) ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Betöltés...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Válassz végzettséget" />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-md w-[180px] mt-2">
                            {availableEducation.map((edu) => (
                              <SelectItem key={edu.id} value={edu.id} className="hover:bg-gray-100 py-2 px-4">{edu.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <ScrollArea className="h-24 rounded-md border p-2">
                        <div className="flex flex-wrap gap-2">
                          {trainerProfile?.education.map((edu) => (
                            <Badge 
                              key={edu.id} 
                              variant="secondary" 
                              className="text-xs group relative hover:bg-red-500 hover:text-white transition-colors cursor-pointer pr-6"
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
                
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Edzői profil</CardTitle>
                    <CardDescription>
                      Kezeld edzői profilod adatait
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTrainerSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Rövid leírás</Label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Textarea
                            id="description"
                            name="description"
                            value={trainerFormData.description || ''}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Írj röviden magadról..."
                            className="min-h-[100px] pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="full_bio">Teljes leírás</Label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Textarea
                            id="full_bio"
                            name="full_bio"
                            value={trainerFormData.full_bio || ''}
                            onChange={(e) => setTrainerFormData(prev => ({ ...prev, full_bio: e.target.value }))}
                            placeholder="Írj részletesen magadról..."
                            className="min-h-[200px] pl-10"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="experience">Tapasztalat</Label>
                          <div className="relative">
                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="experience"
                              name="experience"
                              value={trainerFormData.experience || ''}
                              onChange={(e) => setTrainerFormData(prev => ({ ...prev, experience: e.target.value }))}
                              placeholder="pl. 5+ év"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="price">Ár</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="price"
                              name="price"
                              value={trainerFormData.price || ''}
                              onChange={(e) => setTrainerFormData(prev => ({ ...prev, price: e.target.value }))}
                              placeholder="pl. 10000 Ft/óra"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="availability">Elérhetőség</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="availability"
                              name="availability"
                              value={trainerFormData.availability || ''}
                              onChange={(e) => setTrainerFormData(prev => ({ ...prev, availability: e.target.value }))}
                              placeholder="pl. H-P: 8-18"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="location">Helyszín</Label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <Select value={selectedLocation} onValueChange={(value) => handleLocationChange(value)}>
                              <SelectTrigger className="w-full bg-white border border-gray-200 rounded-md pl-10 pr-3 py-2">
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="active_clients">Aktív kliensek</Label>
                          <div className="relative">
                            <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="active_clients"
                              name="active_clients"
                              type="number"
                              value={trainerFormData.active_clients || 0}
                              onChange={(e) => setTrainerFormData(prev => ({ ...prev, active_clients: parseInt(e.target.value) || 0 }))}
                              placeholder="pl. 15"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="success_stories">Sikertörténetek</Label>
                          <div className="relative">
                            <Award className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="success_stories"
                              name="success_stories"
                              type="number"
                              value={trainerFormData.success_stories || 0}
                              onChange={(e) => setTrainerFormData(prev => ({ ...prev, success_stories: parseInt(e.target.value) || 0 }))}
                              placeholder="pl. 25"
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={savingTrainerData}>
                        {savingTrainerData ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Mentés...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Mentés
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
