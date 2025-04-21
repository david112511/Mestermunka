
import { supabase } from '@/lib/supabase';
import { FormData } from './types';
import { uploadAvatar } from './avatar-utils';
import { ensureAvatarsBucketExists } from '@/services/coachService';

export const submitRegistration = async (
  formData: FormData,
  avatarFile: File | null
) => {
  try {
    console.log("Starting registration with data:", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      hasAvatar: !!avatarFile
    });

    // Make sure the avatars bucket exists before we try to upload anything
    if (avatarFile) {
      await ensureAvatarsBucketExists();
    }

    // 1. Register the user with user_type set in metadata
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_type: 'trainer' // Ensure user_type is set in metadata
        }
      }
    });

    if (signUpError || !user) {
      console.error("Signup error:", signUpError);
      throw signUpError || new Error('Nem sikerült létrehozni a felhasználót');
    }

    console.log("User created with ID:", user.id);

    // 2. Upload the avatar if it exists first - we need the URL for the profile update
    let avatarUrl = null;
    if (avatarFile) {
      try {
        avatarUrl = await uploadAvatar(user.id, avatarFile);
        console.log("Avatar uploaded successfully:", avatarUrl);
      } catch (error) {
        console.error("Avatar upload error:", error);
        // Continue registration even if avatar upload fails
      }
    }

    // 3. Use the update_profile_data function for reliable profile updates
    console.log("Updating profile with data:", {
      userId: user.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      userType: 'trainer',
      avatarUrl: avatarUrl
    });

    const { error: profileError } = await supabase.rpc('update_profile_data', {
      user_id: user.id,
      first_name_val: formData.firstName,
      last_name_val: formData.lastName,
      phone_val: formData.phone,
      user_type_val: 'trainer',
      avatar_url_val: avatarUrl
    });

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Fall back to direct update if RPC fails
      const { error: directUpdateError } = await supabase
        .from('profiles')
        .update({ 
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          user_type: 'trainer',
          avatar_url: avatarUrl
        })
        .eq('id', user.id);
        
      if (directUpdateError) {
        console.error("Direct profile update error:", directUpdateError);
        throw directUpdateError;
      }
    }

    console.log("Profile updated with name:", formData.firstName, formData.lastName);

    // 4. Create or update the trainer record
    const trainerData = {
      id: user.id,
      price: formData.price,
      experience: formData.experience,
      location: formData.location,
      availability: formData.availability,
      description: formData.description,
      full_bio: formData.fullBio,
      rating: 0,
      reviews: 0,
      active_clients: 0,
      success_stories: 0
    };

    console.log("Creating trainer record with data:", trainerData);

    const { error: updateError } = await supabase
      .from('trainers')
      .upsert(trainerData);

    if (updateError) {
      console.error("Trainer creation/update error:", updateError);
      throw updateError;
    }

    console.log("Trainer created/updated");

    // 5. Create relationships
    await createRelations(user.id, formData);

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

const createRelations = async (userId: string, formData: FormData) => {
  // Handle trainer specializations
  if (formData.specializations.length > 0) {
    // First delete any existing relationships
    const { error: deleteError } = await supabase
      .from('trainer_specializations')
      .delete()
      .eq('trainer_id', userId);

    if (deleteError) {
      console.error("Error deleting existing trainer_specializations:", deleteError);
      throw deleteError;
    }

    // Then add the new ones
    const specializationRelations = formData.specializations.map(specId => ({
      trainer_id: userId,
      specialization_id: specId
    }));

    const { error } = await supabase
      .from('trainer_specializations')
      .insert(specializationRelations);

    if (error) {
      console.error("Error creating trainer_specializations:", error);
      throw error;
    }
    console.log("trainer_specializations created");
  }

  // Handle trainer languages
  if (formData.languages.length > 0) {
    // First delete any existing relationships
    const { error: deleteError } = await supabase
      .from('trainer_languages')
      .delete()
      .eq('trainer_id', userId);

    if (deleteError) {
      console.error("Error deleting existing trainer_languages:", deleteError);
      throw deleteError;
    }

    // Then add the new ones
    const languageRelations = formData.languages.map(langId => ({
      trainer_id: userId,
      language_id: langId
    }));

    const { error } = await supabase
      .from('trainer_languages')
      .insert(languageRelations);

    if (error) {
      console.error("Error creating trainer_languages:", error);
      throw error;
    }
    console.log("trainer_languages created");
  }

  // Handle trainer certifications
  if (formData.certifications.length > 0) {
    // First delete any existing relationships
    const { error: deleteError } = await supabase
      .from('trainer_certifications')
      .delete()
      .eq('trainer_id', userId);

    if (deleteError) {
      console.error("Error deleting existing trainer_certifications:", deleteError);
      throw deleteError;
    }

    // Then add the new ones
    const certificationRelations = formData.certifications.map(certId => ({
      trainer_id: userId,
      certification_id: certId
    }));

    const { error } = await supabase
      .from('trainer_certifications')
      .insert(certificationRelations);

    if (error) {
      console.error("Error creating trainer_certifications:", error);
      throw error;
    }
    console.log("trainer_certifications created");
  }

  // Handle trainer educations
  if (formData.educations.length > 0) {
    // First delete any existing relationships
    const { error: deleteError } = await supabase
      .from('trainer_education')
      .delete()
      .eq('trainer_id', userId);

    if (deleteError) {
      console.error("Error deleting existing trainer_education:", deleteError);
      throw deleteError;
    }

    // Then add the new ones
    const educationRelations = formData.educations.map(eduId => ({
      trainer_id: userId,
      education_id: eduId
    }));

    const { error } = await supabase
      .from('trainer_education')
      .insert(educationRelations);

    if (error) {
      console.error("Error creating trainer_education:", error);
      throw error;
    }
    console.log("trainer_education created");
  }
};
