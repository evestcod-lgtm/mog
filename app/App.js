import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator } from 'react-native';

import { AppProvider, useApp } from './src/context/AppContext';
import { T } from './src/theme';
import { Loader } from './src/components/UI';

import OnboardingScreen from './src/screens/OnboardingScreen';
import BoardScreen      from './src/screens/BoardScreen';
import HomeworkScreen   from './src/screens/HomeworkScreen';
import NotesScreen      from './src/screens/NotesScreen';
import MoreScreen       from './src/screens/MoreScreen';
import ProfileScreen    from './src/screens/ProfileScreen';
import AboutScreen      from './src/screens/AboutScreen';
import AdminScreen      from './src/screens/AdminScreen';
import BannedScreen     from './src/screens/BannedScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: T.bg } }}>
      <Stack.Screen name="Profile"  component={ProfileScreen} />
      <Stack.Screen name="About"    component={AboutScreen} />
      <Stack.Screen name="Admin"    component={AdminScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.bgCard,
          borderTopColor: T.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 62,
        },
        tabBarActiveTintColor: T.white,
        tabBarInactiveTintColor: T.textSec,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Board:    '📢',
            Notes:    '📚',
            Homework: '📝',
            More:     '🗂',
            PStack:   '👤',
          };
          return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Board"    component={BoardScreen}    options={{ tabBarLabel: 'Доска' }} />
      <Tab.Screen name="Notes"    component={NotesScreen}    options={{ tabBarLabel: 'Конспекты' }} />
      <Tab.Screen name="Homework" component={HomeworkScreen} options={{ tabBarLabel: 'ДЗ' }} />
      <Tab.Screen name="More"     component={MoreScreen}     options={{ tabBarLabel: 'Ещё' }} />
      <Tab.Screen name="PStack"   component={ProfileStack}   options={{ tabBarLabel: 'Профиль' }} />
    </Tab.Navigator>
  );
}

function ReconnectingBanner() {
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
      backgroundColor: '#1a1a00', paddingVertical: 8, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    }}>
      <ActivityIndicator size="small" color="#FFB800" />
      <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '600' }}>
        Переподключение к серверу...
      </Text>
    </View>
  );
}

function RootNavigator() {
  const { user, loading, banned, reconnecting } = useApp();

  if (loading) return <Loader />;
  if (banned)  return <BannedScreen />;
  if (!user)   return <OnboardingScreen />;
  return (
    <View style={{ flex: 1 }}>
      {reconnecting && <ReconnectingBanner />}
      <MainTabs />
    </View>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary: T.white,
          background: T.bg,
          card: T.bgCard,
          text: T.text,
          border: T.border,
          notification: T.danger,
        }
      }}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
