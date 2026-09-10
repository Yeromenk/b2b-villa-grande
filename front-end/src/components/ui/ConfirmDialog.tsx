import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={onCancel} aria-label="Закрити"><X size={17} /></button><div className="dialog-icon"><AlertTriangle size={22} /></div><h2 id="confirm-title">{title}</h2><p>{message}</p><div className="dialog-actions"><button className="secondary-button" onClick={onCancel}>Скасувати</button><button className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
