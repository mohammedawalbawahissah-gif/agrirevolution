import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Same pattern applied in the FarmAsyst North security audit — catches
// render-time crashes so the whole app doesn't go blank on the farmer's phone.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("AgriRevolution crash:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Button title="Try again" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
});
