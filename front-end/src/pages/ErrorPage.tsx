import { AlertTriangle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { Link, useNavigate, useRouteError } from "react-router-dom";

type ErrorPageProps = { code?: "404" | "500" | "503" | "505" };

const content = {
  "404": { title: "Сторінку не знайдено", text: "Можливо, адресу змінено або сторінка більше не існує." },
  "500": { title: "Внутрішня помилка сервера", text: "Сервіс тимчасово не може обробити запит. Спробуйте ще раз." },
  "503": { title: "Сервіс недоступний", text: "Система тимчасово на технічному обслуговуванні." },
  "505": { title: "Версія HTTP не підтримується", text: "Сервер не підтримує версію HTTP, яку використовує запит." },
};

export function ErrorPage({ code }: ErrorPageProps) {
  const routeError = useRouteError();
  const navigate = useNavigate();
  const resolvedCode = code ?? (routeError ? "500" : "404");
  const page = content[resolvedCode];
  return <main className="error-page"><div className="error-mark"><AlertTriangle size={28} /></div><span className="error-code">Помилка {resolvedCode}</span><h1>{page.title}</h1><p>{page.text}</p><div className="error-actions"><Link className="primary-button" to="/catalog/all"><Home size={16} />На головну</Link><button className="secondary-button" onClick={() => window.location.reload()}><RefreshCw size={16} />Оновити сторінку</button><button className="back-button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Назад</button></div></main>;
}
