import type { UserProfile } from '@/types/userProfile';
import { fetchUserProfile, saveUserProfile as persistUserProfile } from '@/services/api';

export async function getUserProfile(): Promise<UserProfile> {
  return fetchUserProfile();
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  return persistUserProfile(profile);
}
