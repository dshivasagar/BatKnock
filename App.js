import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './ThemeContext';
import HomeScreen from './screens/HomeScreen';
import SeasonGuideScreen from './screens/SeasonGuideScreen';
import ProfileScreen from './screens/ProfileScreen';
import PrepTimerScreen from './screens/PrepTimerScreen';
import BatListScreen from './screens/BatListScreen';
import CreateBatScreen from './screens/CreateBatScreen';
import BatProfileScreen from './screens/BatProfileScreen';
import KnockingSessionScreen from './screens/KnockingSessionScreen';
import HeatmapScreen from './screens/HeatmapScreen';
import TrendsScreen from './screens/TrendsScreen';
import ActivityLogScreen from './screens/ActivityLogScreen';
import BatCareScreen from './screens/BatCareScreen';
import MicTestScreen from './screens/MicTestScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  const { theme } = useTheme();
  const ICONS = {
    Home:   { emoji: '🏠', label: 'Home'   },
    Bats:   { emoji: '🏏', label: 'Bats'   },
    Trends: { emoji: '📈', label: 'Trends' },

  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.tabBg,
          borderTopColor: theme.tabBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarIcon: ({ color, focused }) => (
          <View style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: focused ? theme.accentDim : 'transparent',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 22 }}>{ICONS[route.name]?.emoji}</Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Bats" component={BatListScreen} />
      <Tab.Screen name="Trends" component={TrendsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { theme, mode } = useTheme();
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.bg,
      card: theme.bgHeader,
      border: theme.border,
      text: theme.text,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar
        backgroundColor={theme.bgHeader}
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}
        translucent={false}
      />
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="CreateBat" component={CreateBatScreen} />
          <Stack.Screen name="BatProfile" component={BatProfileScreen} />
          <Stack.Screen name="KnockingSession" component={KnockingSessionScreen} />
          <Stack.Screen name="Heatmap" component={HeatmapScreen} />
          <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
          <Stack.Screen name="MicTest" component={MicTestScreen} />
          <Stack.Screen name="SeasonGuide" component={SeasonGuideScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="PrepTimer" component={PrepTimerScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  // Fonts not loaded yet — using system font (SF Pro / Roboto)
  return (
    <SafeAreaProvider>
      <ThemeProvider fontsLoaded={false}>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
