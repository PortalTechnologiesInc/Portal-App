import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Home, List, Receipt, Award, UserSquare2 } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { View, Platform, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/HapticTab';

// Memoized tab icons to prevent unnecessary re-rendering
const HomeIcon = React.memo(({ color }: { color: string }) => <Home size={24} color={color} />);

const ActivityIcon = React.memo(({ color }: { color: string }) => <List size={24} color={color} />);

const SubscriptionIcon = React.memo(({ color }: { color: string }) => (
  <Receipt size={24} color={color} />
));

const CertificateIcon = React.memo(({ color }: { color: string }) => (
  <Award size={24} color={color} />
));

const IdentityIcon = React.memo(({ color }: { color: string }) => (
  <UserSquare2 size={24} color={color} />
));

// Memoized tab bar background to prevent unnecessary re-rendering
const TabBarBackground = React.memo(() => (
  <View
    style={{
      backgroundColor: '#000000',
      height: '100%',
      width: '100%',
      position: 'absolute',
    }}
  />
));

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Memoize tab options to prevent recreation on every render
  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: Colors.almostWhite,
      tabBarInactiveTintColor: Colors.unselectedGray,
      headerShown: false,
      tabBarStyle: {
        paddingTop: 16,
        alignItems: 'center' as const,
        backgroundColor: '#000',
        height: Platform.OS === 'ios' ? 80 : 70,
        borderTopWidth: 0,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
        shadowColor: 'transparent',
        elevation: 0,
      },
      tabBarBackground: () => <TabBarBackground />,
      tabBarHideOnKeyboard: true,
      tabBarButton: (props: any) => <HapticTab {...props} />,
      // Preload adjacent tabs for smoother navigation
      lazy: false,
      // Optimize tab transition animation
      animationEnabled: true,
      // Preventing excessive re-renders
      freezeOnBlur: false,
      // Use hardware acceleration where possible
      detachInactiveScreens: false,
    }),
    [insets.bottom]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="ActivityList"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color }) => <ActivityIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="Subscriptions"
        options={{
          title: 'Subscriptions',
          tabBarIcon: ({ color }) => <SubscriptionIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          href: null, // This hides the tab from the tab bar
        }}
      />
      {/* remove listeners to enable buttons*/}
      <Tabs.Screen
        name="Certificates"
        listeners={{
          tabPress: e => {
            e.preventDefault(); // <-- this function blocks
            ToastAndroid.showWithGravity('Coming soon!', ToastAndroid.SHORT, ToastAndroid.CENTER);
          },
        }}
        options={{
          title: 'Certificates',
          tabBarIcon: ({ color }) => <CertificateIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="IdentityList"
        options={{
          title: 'Identities',
          tabBarIcon: ({ color }) => <IdentityIcon color={color} />,
          href: null, // This hides the tab from the tab bar
        }}
      />
    </Tabs>
  );
}
