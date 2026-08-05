import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import WeatherScreen from "../screens/WeatherScreen";
import EquipmentScreen from "../screens/EquipmentScreen";
import MarketplaceScreen from "../screens/MarketplaceScreen";
import AccountScreen from "../screens/AccountScreen";

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Four tabs map directly to the farming-cycle flow in the solution statement:
// weather guidance -> equipment requests -> produce sales -> account/history.
function AppTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Weather" component={WeatherScreen} />
      <Tab.Screen name="Equipment" component={EquipmentScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2F6B3C" />
      </View>
    );
  }

  return <NavigationContainer>{user ? <AppTabs /> : <AuthNavigator />}</NavigationContainer>;
}
