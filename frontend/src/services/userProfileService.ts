import { UserProfile, defaultUserProfile } from '@/types/userProfile';

// For now, we'll use localStorage since we don't have a backend
// In a real app, this would make API calls to your backend

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const stored = localStorage.getItem('userProfile');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultUserProfile, ...parsed };
    }
    return defaultUserProfile;
  } catch (error) {
    console.error('Failed to load user profile:', error);
    return defaultUserProfile;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  try {
    const profileWithTimestamp = {
      ...profile,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('userProfile', JSON.stringify(profileWithTimestamp));
    return profileWithTimestamp;
  } catch (error) {
    console.error('Failed to save user profile:', error);
    throw new Error('Failed to save user profile');
  }
}
