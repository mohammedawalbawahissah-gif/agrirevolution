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
import EquipmentManageScreen from "../screens/dealer/EquipmentManageScreen";
import BrowseProduceScreen from "../screens/buyer/BrowseProduceScreen";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";

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

// Mirrors the web frontend's per-role portal split (admin/dealer/buyer/farmer),
// just expressed as tab sets instead of routes.

function FarmerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Weather" component={WeatherScreen} />
      <Tab.Screen name="Equipment" component={EquipmentScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function DealerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Equipment" component={EquipmentManageScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function BuyerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Marketplace" component={BrowseProduceScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function RoleTabs() {
  const { user } = useAuth();
  switch (user?.role) {
    case "dealer":
      return <DealerTabs />;
    case "buyer":
      return <BuyerTabs />;
    case "admin":
      return <AdminTabs />;
    case "farmer":
    default:
      return <FarmerTabs />;
  }
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

  return <NavigationContainer>{user ? <RoleTabs /> : <AuthNavigator />}</NavigationContainer>;
}
