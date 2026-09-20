import { Mail, Phone, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { profileInitials } from "../../hooks/useProfile";
import type { Profile } from "../../hooks/useProfile";

type ProfilePageProps = {
  profile: Profile;
  onSave: (profile: Profile) => void;
  onNotify: (message: string) => void;
};

export function ProfilePage({ profile, onSave, onNotify }: ProfilePageProps) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function change(key: keyof Profile, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setError("");
  }

  return <>
    <header className="page-header"><div><span className="eyebrow">ОБЛІКОВИЙ ЗАПИС</span><h1>Мій профіль</h1><p className="page-description">Керуйте контактними даними робочого кабінету.</p></div></header>
    <div className="profile-layout">
      <section className="profile-card profile-summary">
        <div className="profile-avatar">{profileInitials(profile)}</div>
        <h2>{profile.firstName} {profile.lastName}</h2>
        <span className="profile-role">Менеджер комплектації</span>
        <span className="profile-email">{profile.email}</span>
        <div className="profile-divider" />
        <p>Дані зберігаються в цьому браузері та відновлюються після перезавантаження сторінки.</p>
      </section>
      <form className="profile-card profile-form-card" onSubmit={(event) => {
        event.preventDefault();
        try { onSave(draft); setSaved(true); setError(""); onNotify("Дані профілю збережено"); }
        catch (error) { setError(error instanceof Error ? error.message : "Не вдалося зберегти профіль"); }
      }}>
        <div className="profile-section-heading"><div><h2>Особисті дані</h2><p>Збережене ім’я відображається в робочому профілі.</p></div><UserRound size={20} /></div>
        <div className="profile-form">
          <label>Ім&apos;я<input autoComplete="given-name" required maxLength={100} value={draft.firstName} onChange={(event) => change("firstName", event.target.value)} /></label>
          <label>Прізвище<input autoComplete="family-name" required maxLength={100} value={draft.lastName} onChange={(event) => change("lastName", event.target.value)} /></label>
          <label className="field-wide"><span>Email</span><div className="input-with-icon"><Mail size={16} /><input autoComplete="email" type="email" required maxLength={254} value={draft.email} onChange={(event) => change("email", event.target.value)} /></div></label>
          <label className="field-wide"><span>Телефон</span><div className="input-with-icon"><Phone size={16} /><input autoComplete="tel" type="tel" maxLength={50} value={draft.phone} onChange={(event) => change("phone", event.target.value)} /></div></label>
        </div>
        {error && <p className="order-save-error" role="alert">{error}</p>}
        <div className="profile-form-actions"><span role="status" className={saved ? "save-message visible" : "save-message"}>{saved ? "Дані збережено" : ""}</span><button type="submit" className="primary-button"><Save size={16} />Зберегти зміни</button></div>
      </form>
    </div>
  </>;
}
