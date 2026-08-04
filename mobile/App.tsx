import { ErrorBoundary } from "./src/components/ErrorBoundary";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <ErrorBoundary>
      <RootNavigator />
    </ErrorBoundary>
  );
}
