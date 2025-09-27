Cursor Prompt — “User Profile (Settings) with Wheel Time Pickers + File Storage”

Build a Settings → User Profile page for our Home Assistant AI panel.

Tech/Structure

Framework: Next.js (App Router) + TypeScript.

UI: Tailwind + shadcn/ui. Keep styles minimal/clean.

Time picker: iOS-style wheel/scroll selector (hours/minutes + AM/PM) for each time field.

Validation: Zod.

Persistence: file-based JSON at ./data/user_profile.json (create folder if missing). Provide API routes under /api/user-profile.

State: React Hook Form with zodResolver; optimistic UI (save button shows success/error).

Fields (model what the LLM “should know”)

leaveTime (time)

returnTime (time)

tempAwakeF (number, °F; min 60, max 80)

tempSleepF (number, °F; min 60, max 80)

notes (multiline string; optional, free-form “things the model should know”)

updatedAt (ISO string; set server-side)

Schema
const UserProfileSchema = z.object({
  leaveTime: z.string().regex(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/), // “7:15 AM”
  returnTime: z.string().regex(/^([0]?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/),
  tempAwakeF: z.number().min(60).max(80),
  tempSleepF: z.number().min(60).max(80),
  notes: z.string().max(2000).optional().default(""),
  updatedAt: z.string().optional()
});

Pages & API

UI route: /settings/user-profile

Header: “User Profile”

Help text: “Tell the assistant what to assume by default.”

Controls:

Wheel time pickers for “What time do you usually leave?” and “When are you usually back?”

Number inputs (with steppers) for temps (Awake/Sleep).

Textarea for Notes.

Buttons: Save, Reset, Use Example.

Inline preview card: “Today I’ll leave at X, back at Y; keep house at A°F awake, B°F asleep.”

GET /api/user-profile → returns current JSON or sensible defaults.

PUT /api/user-profile → validates with Zod, writes to ./data/user_profile.json, returns saved object with updatedAt.

Wheel Time Picker requirements

Reusable component <WheelTimePicker value onChange />

Three columns: hour (1–12), minute (00–59), AM/PM.

Mouse wheel, trackpad, and keyboard accessible (↑/↓ to scroll; Tab cycles columns).

Snap to nearest value; announce selection via ARIA live region.

File I/O

Create helper lib/userProfileStore.ts:

readUserProfile(): Promise<UserProfile>

writeUserProfile(data: UserProfile): Promise<void>

Ensure atomic writes (write temp file then rename) and create ./data if missing.

Defaults (if file missing)
{
  "leaveTime": "8:00 AM",
  "returnTime": "6:00 PM",
  "tempAwakeF": 72,
  "tempSleepF": 70,
  "notes": ""
}

UX details

Show unsaved changes badge when form dirtied.

Save: disable while pending; show toast “Preferences saved”.

Reset: reload from server file.

Use Example: fills with 7:30 AM / 5:30 PM / 72 / 69 and a sample note.

On save, write updatedAt server-side and render it under the header.

Accessibility

Labels + descriptions for each field.

Wheel columns have role="listbox" with aria-activedescendant for the selected option.

Form is fully keyboard navigable.

Tests / Acceptance

Saving creates ./data/user_profile.json if absent.

Invalid data (e.g., tempAwakeF: 85) shows inline error and blocks save.

Refreshing page reloads saved values.

Wheel picker snaps correctly and emits canonical “7:05 PM” strings.

Exports (for other modules)

Export the Zod schema and UserProfile type from a shared types module so our LLM/optimizer can import the same contract.

Deliver: Full page, components, API routes, store helpers, and minimal unit tests for the store.