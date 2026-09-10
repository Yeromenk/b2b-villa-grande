import { Mail, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ConfirmDialog } from "../ui/ConfirmDialog";

type ProfilePageProps = {
  onNotify: (message: string) => void;
};

export function ProfilePage({ onNotify }: ProfilePageProps) {
  const [firstName, setFirstName] = useState("Олексій");
  const [lastName, setLastName] = useState("Коваль");
  const [email, setEmail] = useState("oleksii.koval@villagrande.ua");
  const [phone, setPhone] = useState("+380 67 245 18 40");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, []);

  function saveProfile() {
    setSaved(true);
    onNotify("Дані профілю збережено");
    window.setTimeout(() => setSaved(false), 2400);
  }

  if (isLoading) return <><header className="page-header"><div><span className="eyebrow">ОБЛІКОВИЙ ЗАПИС</span><h1>Мій профіль</h1></div></header><ProfileSkeleton /></>;

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">ОБЛІКОВИЙ ЗАПИС</span>
          <h1>Мій профіль</h1>
          <p className="page-description">Керуйте контактними даними та доступом до робочого кабінету.</p>
        </div>
      </header>

      <div className="profile-layout">
        <section className="profile-card profile-summary">
          <div className="profile-avatar">ОК</div>
          <h2>{firstName} {lastName}</h2>
          <span className="profile-role">Менеджер комплектації</span>
          <span className="profile-email">{email}</span>
          <div className="profile-divider" />
          <div className="profile-security"><ShieldCheck size={17} /><span>Обліковий запис активний</span></div>
          <p>Дані профілю доступні тільки авторизованим працівникам Villa Grande.</p>
        </section>

        <section className="profile-card profile-form-card">
          <div className="profile-section-heading"><div><h2>Особисті дані</h2><p>Ці дані використовуються у внутрішніх документах і КП.</p></div><UserRound size={20} /></div>
          <div className="profile-form">
            <label>Ім&apos;я<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
            <label>Прізвище<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            <label className="field-wide"><span>Email</span><div className="input-with-icon"><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
            <label className="field-wide"><span>Телефон</span><div className="input-with-icon"><Phone size={16} /><input value={phone} onChange={(event) => setPhone(event.target.value)} /></div></label>
            <label>Пароль<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введіть новий пароль" /></label>
          </div>
          <div className="profile-form-actions"><span className={saved ? "save-message visible" : "save-message"}>{saved ? "Дані збережено" : ""}</span><button className="primary-button" onClick={() => setShowSaveConfirm(true)}><Save size={16} />Зберегти зміни</button></div>
        </section>

      </div>
      {showSaveConfirm && <ConfirmDialog title="Зберегти зміни?" message="Нові дані профілю будуть використані в робочих документах." confirmLabel="Зберегти" onCancel={() => setShowSaveConfirm(false)} onConfirm={() => { setShowSaveConfirm(false); saveProfile(); }} />}
    </>
  );
}
