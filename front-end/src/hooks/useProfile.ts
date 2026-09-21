import { useEffect, useState } from "react";

export type Profile = { firstName: string; lastName: string; email: string; phone: string };
const storageKey = "villa-grande.profile.v1";
const defaultProfile: Profile = { firstName: "Олексій", lastName: "Коваль", email: "oleksii.koval@villagrande.ua", phone: "+380 67 245 18 40" };

function readProfile(): Profile {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (value && typeof value === "object" && Object.keys(defaultProfile).every((key) => typeof (value as Record<string, unknown>)[key] === "string")) {
      const { firstName, lastName, email, phone } = value as Profile;
      return { firstName, lastName, email, phone };
    }
  } catch { /* An unavailable or invalid saved profile uses the initial values. */ }
  return defaultProfile;
}

export const profileInitials = (profile: Profile) => `${profile.firstName.trim().charAt(0)}${profile.lastName.trim().charAt(0)}`.toLocaleUpperCase("uk-UA");

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(readProfile);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) setProfile(readProfile()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function saveProfile(input: Profile) {
    const next = { firstName: input.firstName.trim(), lastName: input.lastName.trim(), email: input.email.trim(), phone: input.phone.trim() };
    if (!next.firstName || !next.lastName) throw new Error("Вкажіть ім’я та прізвище.");
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { throw new Error("Не вдалося зберегти профіль у браузері. Перевірте доступ до локального сховища."); }
    setProfile(next);
  }
  return { profile, saveProfile };
}
