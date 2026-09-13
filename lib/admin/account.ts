export const ACCOUNT_PAGES = [
  ["profile", "Profile"],
  ["security", "Security"],
  ["preferences", "Preferences"],
  ["help", "Help & review"],
] as const;
export function profileErrors(input: {
  name: string;
  phone: string;
  jobTitle: string;
}) {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.trim().length > 100)
    errors.name = "Enter a display name between 1 and 100 characters.";
  if (input.phone && !/^[+\d ()-]{5,30}$/.test(input.phone))
    errors.phone = "Use 5–30 characters: numbers, spaces, +, ( ), or -.";
  if (input.jobTitle.length > 100)
    errors.jobTitle = "Use 100 characters or fewer.";
  return errors;
}
