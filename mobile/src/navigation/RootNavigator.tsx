import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import WeatherScreen from "../screens/WeatherScreen";
import EquipmentScreen from "../screens/EquipmentScreen";
import MarketplaceScreen from "../screens/MarketplaceScreen";
import AccountScreen from "../screens/AccountScreen";

const Tab = createBottomTabNavigator();

// Four tabs map directly to the farming-cycle flow in the solution statement:
// weather guidance -> equipment requests -> produce sales -> account/history.
export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Weather" component={WeatherScreen} />
        <Tab.Screen name="Equipment" component={EquipmentScreen} />
        <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
