import { z } from 'zod';

export const UserProfileSchema = z.object({
  leaveTime: z.string().regex(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/), // "7:15 AM"
  returnTime: z.string().regex(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/),
  bedTime: z.string().regex(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/), // "10:30 PM"
  wakeTime: z.string().regex(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/), // "6:30 AM"
  tempAwakeF: z.number().min(60).max(80),
  tempSleepF: z.number().min(60).max(80),
  location: z.string().min(2),
  squareFootage: z.number().min(200).max(10000),
  coolingUnits: z.number().min(1).max(5),
  notes: z.string().max(2000).optional().default(""),
  updatedAt: z.string().optional()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const defaultUserProfile: UserProfile = {
  leaveTime: "8:00 AM",
  returnTime: "6:00 PM",
  bedTime: "10:30 PM",
  wakeTime: "6:30 AM",
  tempAwakeF: 72,
  tempSleepF: 70,
  location: "San Francisco",
  squareFootage: 2200,
  coolingUnits: 1,
  notes: ""
};
