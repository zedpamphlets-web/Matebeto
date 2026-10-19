import { Component, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, ui } from "@/lib/theme";

/** If one screen hits an unexpected error, show a calm message instead of closing the app. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[app] screen error:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: ui.ink, textAlign: "center" }}>Something went wrong</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: ui.sub, textAlign: "center", marginTop: 10, lineHeight: 22 }}>
          Please try again. Your orders and details are safe.
        </Text>
        <Pressable
          onPress={() => this.setState({ failed: false })}
          style={{ marginTop: 24, backgroundColor: ui.red, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
        >
          <Text style={{ fontFamily: fonts.title, color: "#fff", fontSize: 16 }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
