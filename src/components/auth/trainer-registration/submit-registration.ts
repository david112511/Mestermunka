
import { supabase } from '@/lib/supabase';
import { FormData } from './types';
import { uploadAvatar } from './avatar-utils';

export const submitRegistration = async (
  formData: FormData,
  avatarFile: File | null
) => {
  try {
    // 1. Register the user
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_type: 'trainer'
        }
      }
    });

    if (signUpError || !user) {
      throw signUpError || new Error('Nem sikerült létrehozni a felhasználót');
    }

    console.log("User created:", user.id);

    // 2. Create or update the trainer record
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

    const { error: updateError } = await supabase
      .from('trainers')
      .upsert(trainerData);

    if (updateError) {
      console.error("Trainer creation/update error:", updateError);
      throw updateError;
    }

    console.log("Trainer created/updated");

    // 3. Update the profiles table - making sure first_name and last_name are set
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        user_type: 'trainer'
      })
      .eq('id', user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw profileError;
    }

    console.log("Profile updated with name:", formData.firstName, formData.lastName);

    // 4. Upload the avatar if it exists
    let avatarUrl = null;
    if (avatarFile) {
      try {
        avatarUrl = await uploadAvatar(user.id, avatarFile);
        console.log("Avatar uploaded:", avatarUrl);
        
        // Update the avatar URL in the profiles table if successful
        if (avatarUrl) {
          const { error: avatarUpdateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id);

          if (avatarUpdateError) {
            console.error("Avatar URL update error:", avatarUpdateError);
          } else {
            console.log("Avatar URL updated in profile");
          }
        }
      } catch (error) {
        console.error("Avatar upload error:", error);
        // Continue registration even if avatar upload fails
      }
    }

    // 5. Create relationships
    await createRelations(user.id, formData);

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

const createRelations = async (userId: string, formData: FormData) => {
  const relations = [
    {
      table: 'trainer_specializations',
      values: formData.specializations,
      idField: 'specialization_id'
    },
    {
      table: 'trainer_languages',
      values: formData.languages,
      idField: 'language_id'
    },
    {
      table: 'trainer_certifications',
      values: formData.certifications,
      idField: 'certification_id'
    },
    {
      table: 'trainer_education',
      values: formData.educations,
      idField: 'education_id'
    }
  ];

  for (const relation of relations) {
    if (relation.values.length > 0) {
      // First delete any existing relationships
      const { error: deleteError } = await supabase
        .from(relation.table)
        .delete()
        .eq('trainer_id', userId);

      if (deleteError) {
        console.error(`Error deleting existing ${relation.table}:`, deleteError);
        throw deleteError;
      }

      // Then add the new ones
      const { error } = await supabase
        .from(relation.table)
        .insert(
          relation.values.map(value => ({
            trainer_id: userId,
            [relation.idField]: value
          }))
        );

      if (error) {
        console.error(`Error creating ${relation.table}:`, error);
        throw error;
      }
      console.log(`${relation.table} created`);
    }
  }
};
