import React, { useEffect, useState } from 'react';
import { Text, View, SafeAreaView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { PendingRequestsProvider } from '@/context/PendingRequestsContext';
import { DeeplinkProvider } from '@/context/DeeplinkContext';
import { ActivitiesProvider } from '@/context/ActivitiesContext';
import { DatabaseProvider } from '@/services/database/DatabaseProvider';
import { MnemonicProvider, useMnemonic } from '@/context/MnemonicContext';
import { NostrServiceProvider } from '@/context/NostrServiceContext';
import { AppLockProvider, useAppLock } from '@/context/AppLockContext';
import { AppLockScreen } from '@/components/AppLockScreen';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { Asset } from 'expo-asset';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { useThemeColor } from '@/hooks/useThemeColor';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Function to preload images for performance
const preloadImages = async () => {
  try {
    // Preload any local assets needed on startup
    const assetPromises = [
      Asset.loadAsync(require('../assets/images/appLogo.png')),
      // Add any other assets that need to be preloaded here
    ];

    await Promise.all(assetPromises);
    console.log('Assets preloaded successfully');
  } catch (error) {
    console.error('Error preloading assets:', error);
  }
};

// App content wrapper that handles app lock
const AppContentWrapper = () => {
  const { isLocked } = useAppLock();

  if (isLocked) {
    return <AppLockScreen />;
  }

  return <AppContent />;
};

// Status bar wrapper that respects theme
const ThemedStatusBar = () => {
  const { currentTheme } = useTheme();
  return (
    <StatusBar
      style={currentTheme === 'light' ? 'dark' : 'light'}
      backgroundColor={currentTheme === 'light' ? Colors.primaryWhite : Colors.darkerGray}
    />
  );
};

// Loading screen content that respects theme
const LoadingScreenContent = () => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <ThemedStatusBar />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: textColor }}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
};

// Themed root view wrapper
const ThemedRootView = () => {
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <ThemedStatusBar />
      <MnemonicProvider>
        <OnboardingProvider>
          <AppLockProvider>
            <AppContentWrapper />
          </AppLockProvider>
        </OnboardingProvider>
      </MnemonicProvider>
    </GestureHandlerRootView>
  );
};

// Main app structure with NostrService initialization
const AppContent = () => {
  const { isOnboardingComplete } = useOnboarding();
  const { mnemonic, walletUrl } = useMnemonic();

  // Wrap everything in providers first, then conditionally render Stack screens
  return (
    <DatabaseProvider>
      <NostrServiceProvider mnemonic={mnemonic || ''} walletUrl={walletUrl}>
        <UserProfileProvider>
          <ActivitiesProvider>
            <PendingRequestsProvider>
              <DeeplinkProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      backgroundColor: '#000000',
                    },
                  }}
                >
                  {/* Always include deeplink screen */}
                  <Stack.Screen name="[...deeplink]" />

                  {/* Conditional screens based on app state */}
                  {!isOnboardingComplete ? (
                    <Stack.Screen name="onboarding" />
                  ) : !mnemonic ? (
                    <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                  ) : (
                    <>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="index" />
                      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="wallet" options={{ presentation: 'modal' }} />
                      <Stack.Screen name="qr" options={{ presentation: 'fullScreenModal' }} />
                      <Stack.Screen name="subscription" />
                    </>
                  )}
                </Stack>
              </DeeplinkProvider>
            </PendingRequestsProvider>
          </ActivitiesProvider>
        </UserProfileProvider>
      </NostrServiceProvider>
    </DatabaseProvider>
  );
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        // Preload required assets
        await preloadImages();

        // Add a shorter delay to ensure initialization is complete
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsReady(true);
      } catch (error) {
        console.error('Error preparing app:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <ThemeProvider>
        <LoadingScreenContent />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ThemedRootView />
    </ThemeProvider>
  );
}
