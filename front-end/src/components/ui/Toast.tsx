import { CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

type ToastProps = {
  message: string;
  onClose: () => void;
};

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Закрити повідомлення"><X size={15} /></button>
    </div>
  );
}
