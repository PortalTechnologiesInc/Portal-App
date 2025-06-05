import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  View,
  Modal,
  BackHandler,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Pencil, X, QrCode, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, NostrRelayWithDates } from '@/services/database';
import Dropdown from 'react-native-input-select';

import relayListFile from '../assets/RelayListist.json';
import { TSelectedItem } from 'react-native-input-select/lib/typescript/src/types/index.types';

function makeList(text: string): string[] {
  return text.split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);
}

export default function NostrRelayManagementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [everyRelayList, setEveryRelayList] = useState<string[]>([]);
  const [selectedRelays, setSelectedRelays] = useState<TSelectedItem | TSelectedItem[] | null>(null);
  const [relayTextFieldValue, setRelayTextFieldValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const sqliteContext = useSQLiteContext();
  const DB = new DatabaseService(sqliteContext);

  // Load relay data on mount
  useEffect(() => {
    const loadEveryRelayList = async () => {
      try {
        const x = relayListFile.slice(0, 10)
        setEveryRelayList(x);
      } catch (error) {
        console.error('Error loading relays data:', error);
      } finally {
        setIsLoading(false);
      }

    }
    loadEveryRelayList()

    const loadRelaysData = async () => {
      try {
        const relays = (await DB.getRelays()).map((value) => value.ws_uri);
        setSelectedRelays(relays);
      } catch (error) {
        console.error('Error loading relays data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRelaysData()
  }, []);

  const handleIconPress = () => {
    // if (!isEditing) {
    //   // If not editing, start editing
    //   setIsEditing(true);
    //   return;
    // }

    // if (hasChanged) {
    //   // If value has changed, save it
    //   handleSaveWalletUrl();
    // } else {
    //   // If value is the same and we're editing, clear it
    //   handleClearInput();
    //   setIsEditing(false);
    // }
  };

  // Navigate back to previous screen
  const handleBackPress = () => {
    // Check navigation parameters
    const sourceParam = params.source as string | undefined;
    const returnToWalletParam = params.returnToWallet as string | undefined;

    // If we have a source param and it's not a QR scan from wallet itself, navigate directly to that screen
    if (sourceParam === 'settings') {
      router.replace('/settings');
    } else {
      // Otherwise use normal back navigation
      router.back();
    }
  };

  const handleClearInput = async () => {
    try {
      // Clear the wallet URL in storage
      setRelayTextFieldValue('');
    } catch (error) {
      console.error('Error clearing wallet URL:', error);
      Alert.alert('Error', 'Failed to clear wallet URL. Please try again.');
    }
  };

  const updateRelays = () => {
    let x = makeList(relayTextFieldValue)
    if (selectedRelays) {
      if (typeof selectedRelays === 'TSelectedItem[]')) {
        selectedRelays.concat(selectedRelays.map(item => item.toString()))
      } else {
        setSelectedRelays(selectedRelays.concat([])))
      }
    }
    selectedRelays.
      makeList(relayTextFieldValue)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText
              style={styles.headerText}
              lightColor={Colors.darkGray}
              darkColor={Colors.almostWhite}
            >
              Nostr Management
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.content}>
            <ThemedText>Loading...</ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.almostWhite} />
          </TouchableOpacity>
          <ThemedText
            style={styles.headerText}
            lightColor={Colors.darkGray}
            darkColor={Colors.almostWhite}
          >
            Relay Management
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText style={styles.description}>
            Choose the Nostr relays you want to use for Nostr Wallet Connect. Relays help broadcast and receive transactions—pick reliable ones for better speed and connectivity. You can add custom relays or use trusted defaults.
          </ThemedText>

          {/* Add Relays Input */}
          <ThemedText
            style={styles.titleText}
            lightColor={Colors.darkGray}
            darkColor={Colors.almostWhite}
          >
            Add a relay:
          </ThemedText>
          <Dropdown
            modalControls={{
              modalOptionsContainerStyle: {
                padding: 10,
                backgroundColor: Colors.almostWhite,
              },
            }}
            listComponentStyles={{
              itemSeparatorStyle: {
                opacity: 0,
                margin: 2
              },
            }}
            dropdownStyle={{
              backgroundColor: Colors.almostWhite,
            }}
            searchControls={{
              textInputStyle: {
                backgroundColor: Colors.almostWhite,
              },
            }}
            checkboxControls={{
              checkboxStyle: {
                borderRadius: 30,
              },
              checkboxComponent: <View />,
              checkboxUnselectedColor: Colors.almostWhite
            }}
            isMultiple
            isSearchable
            placeholder="Select an option..."
            options={everyRelayList.map((relay) => { return { label: relay, value: relay } })}
            selectedValue={selectedRelays}
            onValueChange={(value) => { setSelectedRelays(value) }}
            primaryColor={Colors.darkGray}
          />

          {/* Custom Relays Input */}
          <ThemedText
            style={styles.titleText}
            lightColor={Colors.darkGray}
            darkColor={Colors.almostWhite}
          >
            Add custom relays:
          </ThemedText>
          <View style={styles.relaysUrlContainer}>
            <View style={styles.relaysUrlInputContainer}>
              <TextInput
                style={styles.relaysUrlInput}
                value={relayTextFieldValue}
                multiline
                numberOfLines={9}
                onChangeText={setRelayTextFieldValue}
                placeholder="Enter a list of relays url separated by a newline char"
                placeholderTextColor={Colors.gray}
              />
              <TouchableOpacity style={styles.textFieldAction} onPress={handleIconPress}>
                <X size={20} color={Colors.almostWhite} onPress={handleClearInput} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={updateRelays()}
          >
            <ThemedText style={styles.saveButtonText}>
              Save relays
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  backButton: {
    marginRight: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  description: {
    color: Colors.almostWhite,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  relaysUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  relaysUrlInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray,
    marginRight: 12,
  },
  relaysUrlInput: {
    flex: 1,
    color: Colors.almostWhite,
    fontSize: 16,
    paddingVertical: 8,
  },
  textFieldAction: {
    paddingHorizontal: 8,
  },
  saveButton: {
    backgroundColor: Colors.almostWhite,
    padding: 16,
    borderRadius: 8,
    width: "100%",
    maxWidth: 500,
    alignItems: "center",
    alignSelf: "center",
  },
  saveButtonText: {
    color: Colors.darkGray,
    fontSize: 16,
    fontWeight: "bold",
  },
});