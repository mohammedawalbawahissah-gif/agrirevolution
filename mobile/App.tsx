import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AuthProvider } from "./src/context/AuthContext";
import { ToastProvider } from "./src/context/ToastContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
