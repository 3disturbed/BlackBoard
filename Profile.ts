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
  /**
   * Create or Update a User Profile
   * @param email - The email of the user
   * @param profileData - The profile data to create or update
   * 
   * Usage:
   * await Profile.createOrUpdateProfile("user@example.com", { username: "user123", bio: "Hello there!" });
   */
  async createOrUpdateProfile(email: string, profileData: ProfileData): Promise<void> {
    const user = await Account.getUser(email);
    if (!user) {
      throw new Error("User does not exist");
    }
    
    const existingProfile = await BB.get('profiles', email) as ProfileData;
    const updatedProfile = { ...existingProfile, ...profileData };

    await BB.set('profiles', email, updatedProfile);
    console.log(`Profile for ${email} has been created/updated successfully`);
  },

  /**
   * Get a User Profile by Email
   * @param email - The email of the user
   * @returns The profile data of the user
   * 
   * Usage:
   * const profile = await Profile.getProfile("user@example.com");
   */
  async getProfile(email: string): Promise<ProfileData> {
    const profile = await BB.get('profiles', email) as ProfileData;
    if (!profile) {
      throw new Error("Profile not found");
    }
    console.log(`Profile fetched for ${email}`);
    return profile;
  },

  /**
   * Delete a User Profile
   * @param email - The email of the user
   * 
   * Usage:
   * await Profile.deleteProfile("user@example.com");
   */
  async deleteProfile(email: string): Promise<void> {
    const user = await Account.getUser(email);
    if (!user) {
      throw new Error("User does not exist");
    }

    await BB.removeKey('profiles', email);
    console.log(`Profile for ${email} has been deleted successfully`);
  },

  /**
   * Update a Specific Profile Field
   * @param email - The email of the user
   * @param field - The profile field to update
   * @param value - The new value for the field
   * 
   * Usage:
   * await Profile.updateProfileField("user@example.com", "bio", "Updated bio");
   */
  async updateProfileField(email: string, field: keyof ProfileData, value: any): Promise<void> {
    const profile = await BB.get('profiles', email) as ProfileData;
    if (!profile) {
      throw new Error("Profile does not exist");
    }

    profile[field] = value;
    await BB.set('profiles', email, profile);
    console.log(`Profile field ${field} for ${email} has been updated`);
  },

  /**
   * Get All User Profiles (Admin Only)
   * @param adminEmail - The email of the admin user
   * @returns An object with all user profiles
   * 
   * Usage:
   * const allProfiles = await Profile.getAllProfiles("admin@example.com");
   */
  async getAllProfiles(adminEmail: string): Promise<Record<string, ProfileData>> {
    await Account.checkRole(adminEmail, 'admin');

    const profiles = BB.get('profiles') as Record<string, ProfileData>;
    if (!profiles) {
      console.log("No profiles found");
      return {};
    }
    console.log("All profiles fetched");
    return profiles;
  },
  
  /**
   * Set or Update a Profile Picture
   * @param email - The email of the user
   * @param pictureUrl - The URL of the new profile picture
   * 
   * Usage:
   * await Profile.setProfilePicture("user@example.com", "https://example.com/profile.jpg");
   */
  async setProfilePicture(email: string, pictureUrl: string): Promise<void> {
    await this.updateProfileField(email, 'profilePicture', pictureUrl);
  }
};

export default Profile;
