import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { THEME } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={THEME.light.ink} />
      </View>
    );
  }

  return <Redirect href={user ? "/dashboard" : "/login"} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.light.bg,
  },
});
