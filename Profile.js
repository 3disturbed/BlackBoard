// Profile.ts

import BB from './BlackBoard.js';  // Persistent store
import Account from './Account.js'; // User authentication

// Define the Profile data type
interface ProfileData {
  username?: string;
  bio?: string;
  profilePicture?: string;
  contactInfo?: string;
  [key: string]: any; // Additional dynamic fields
}

const Profile = {
  // Create or Update a User Profile
  async createOrUpdateProfile(email: string, profileData: ProfileData): Promise<void> {
    // Ensure user exists before creating/updating a profile
    const user = await Account.getUser(email);
    if (!user) {
      throw new Error("User does not exist");
    }
    
    // Fetch existing profile or create a new entry
    const existingProfile = await BB.get('profiles', email) as ProfileData;
    const updatedProfile = { ...existingProfile, ...profileData };

    // Save updated profile in BlackBoard's "profiles" section
    await BB.set('profiles', email, updatedProfile);
    console.log(`Profile for ${email} has been created/updated successfully`);
  },

  // Get a User Profile by Email
  async getProfile(email: string): Promise<ProfileData> {
    const profile = await BB.get('profiles', email) as ProfileData;
    if (!profile) {
      throw new Error("Profile not found");
    }
    console.log(`Profile fetched for ${email}`);
    return profile;
  },

  // Delete a User Profile
  async deleteProfile(email: string): Promise<void> {
    // Ensure user exists before deleting a profile
    const user = await Account.getUser(email);
    if (!user) {
      throw new Error("User does not exist");
    }

    await BB.removeKey('profiles', email);
    console.log(`Profile for ${email} has been deleted successfully`);
  },

  // Update Profile Field
  async updateProfileField(email: string, field: keyof ProfileData, value: any): Promise<void> {
    const profile = await BB.get('profiles', email) as ProfileData;
    if (!profile) {
      throw new Error("Profile does not exist");
    }

    profile[field] = value;
    await BB.set('profiles', email, profile);
    console.log(`Profile field ${field} for ${email} has been updated`);
  },

  // Get All User Profiles (Admin access example)
  async getAllProfiles(adminEmail: string): Promise<Record<string, ProfileData>> {
    // Ensure the user has admin privileges
    await Account.checkRole(adminEmail, 'admin');

    const profiles = BB.get('profiles') as Record<string, ProfileData>;
    if (!profiles) {
      console.log("No profiles found");
      return {};
    }
    console.log("All profiles fetched");
    return profiles;
  },
  
  // Add or Update Profile Picture
  async setProfilePicture(email: string, pictureUrl: string): Promise<void> {
    await this.updateProfileField(email, 'profilePicture', pictureUrl);
  }
};

export default Profile;
