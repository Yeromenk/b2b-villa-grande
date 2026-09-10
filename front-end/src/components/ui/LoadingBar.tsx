import { useNavigation } from "react-router-dom";

type LoadingBarProps = {
  visible?: boolean;
};

export function LoadingBar({ visible }: LoadingBarProps) {
  const navigation = useNavigation();
  const isVisible = visible ?? navigation.state !== "idle";
  return <div className={`loading-bar ${isVisible ? "visible" : ""}`} aria-hidden="true"><span /></div>;
}
