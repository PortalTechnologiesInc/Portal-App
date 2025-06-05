import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	TouchableOpacity,
	Alert,
	TextInput,
	Image,
	View,
	Keyboard,
	ScrollView,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { ArrowLeft, User, Pencil, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "@/context/OnboardingContext";
import { useUserProfile } from "@/context/UserProfileContext";
import {
	isWalletConnected,
	isRelayConnected,
	walletUrlEvents,
	deleteMnemonic,
} from "@/services/SecureStorageService";
import * as ImagePicker from "expo-image-picker";
import { useNostrService } from "@/context/NostrServiceContext";
import { resetDatabase } from "@/services/database/DatabaseProvider";

export default function SettingsScreen() {
	const router = useRouter();
	const { resetOnboarding } = useOnboarding();
	const { username, avatarUri, setUsername, setAvatarUri } = useUserProfile();
	const nostrService = useNostrService();
	const [isWalletConnectedState, setIsWalletConnectedState] = useState(false);
	const [isRelayConnectedState, setIsRelayConnectedState] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [usernameInput, setUsernameInput] = useState("");
	const [profileIsLoading, setProfileIsLoading] = useState(false);
	const [walletUrl, setWalletUrl] = useState("");

	// Initialize wallet connection status
	useEffect(() => {
		const checkWalletConnection = async () => {
			try {
				const walletConnected = await isWalletConnected();
				const relayConnected = await isRelayConnected();
				setIsRelayConnectedState(relayConnected)
				setIsWalletConnectedState(walletConnected);
			} catch (error) {
				console.error("Error checking connection:", error);
			} finally {
				setIsLoading(false);
			}
		};

		checkWalletConnection();

		// Subscribe to wallet URL changes
		const subscription = walletUrlEvents.addListener(
			"walletUrlChanged",
			async (newUrl) => {
				setIsWalletConnectedState(Boolean(newUrl?.trim()));
			},
		);

		return () => subscription.remove();
	}, []);

	useEffect(() => {
		if (username) {
			setUsernameInput(username);
		}
	}, [username]);

	const handleAvatarPress = async () => {
		try {
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (!permissionResult.granted) {
				Alert.alert(
					"Permission Required",
					"You need to allow access to your photos to change your avatar.",
				);
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			if (!result.canceled) {
				await setAvatarUri(result.assets[0].uri);
			}
		} catch (error) {
			console.error("Error selecting image:", error);
			Alert.alert("Error", "Failed to select image. Please try again.");
		}
	};

	const handleSaveProfile = async () => {
		try {
			setProfileIsLoading(true);

			// Capitalize the first letter of the username if it exists
			const capitalizedUsername = usernameInput.trim()
				? usernameInput.charAt(0).toUpperCase() + usernameInput.slice(1)
				: "";

			// Even if username is empty, we still append @getportal.cc
			// This ensures pubkey format is consistent regardless of username presence
			await setUsername(capitalizedUsername);

			Alert.alert("Success", "Profile updated successfully");
		} catch (error) {
			console.error("Error saving profile:", error);
			Alert.alert("Error", "Failed to save profile. Please try again.");
		} finally {
			setProfileIsLoading(false);
		}
	};

	const handleClearAppData = () => {
		Alert.alert(
			"Reset App",
			"This will reset all app data and take you back to onboarding. Are you sure?",
			[
				{
					text: "Cancel",
					style: "cancel",
				},
				{
					text: "Clear Data",
					style: "destructive",
					onPress: async () => {
						try {
							// Clear user profile data but maintain pubkey format
							await setUsername("");
							await setAvatarUri(null);

							// Delete mnemonic first - this triggers database disconnection
							deleteMnemonic();

							// Reset the database (will work with new connection)
							await resetDatabase();

							// Reset onboarding state (this navigates to onboarding screen)
							await resetOnboarding();
						} catch (error) {
							console.error("Error clearing app data:", error);
							Alert.alert("Error", "Failed to Reset App. Please try again.");
						}
					},
				},
			],
		);
	};

	const handleWalletCardPress = () => {
		// Navigate to wallet management page with proper source parameter
		router.push({
			pathname: "/wallet",
			params: {
				source: "settings",
			},
		});
	};

	const handleNostrCardPress = () => {
		// Navigate to nostr management page with proper source parameter
		router.push({
			pathname: "/relays",
			params: {
				source: "settings",
			},
		});
	};

	const handleWalletUrlSubmit = () => {
		if (!walletUrl.trim()) {
			Alert.alert("Error", "Please enter a valid URL");
			return;
		}

		try {
			// Trigger the same event that happens when scanning a QR code
			walletUrlEvents.emit("walletUrlChanged", walletUrl.trim());
			setIsWalletConnectedState(true);
			setWalletUrl("");
			Keyboard.dismiss();
			Alert.alert("Success", "Wallet connected successfully");
		} catch (error) {
			console.error("Error connecting wallet:", error);
			Alert.alert("Error", "Failed to connect wallet. Please try again.");
		}
	};

	if (isLoading) {
		return (
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ThemedView style={styles.container}>
					<ThemedView style={styles.header}>
						<TouchableOpacity
							onPress={() => router.back()}
							style={styles.backButton}
						>
							<ArrowLeft size={20} color={Colors.almostWhite} />
						</TouchableOpacity>
						<ThemedText
							style={styles.headerText}
							lightColor={Colors.darkGray}
							darkColor={Colors.almostWhite}
						>
							Settings
						</ThemedText>
					</ThemedView>
					<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
						<ThemedText>Loading...</ThemedText>
					</ScrollView>
				</ThemedView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<ThemedView style={styles.container}>
				<ThemedView style={styles.header}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={styles.backButton}
					>
						<ArrowLeft size={20} color={Colors.almostWhite} />
					</TouchableOpacity>
					<ThemedText
						style={styles.headerText}
						lightColor={Colors.darkGray}
						darkColor={Colors.almostWhite}
					>
						Settings
					</ThemedText>
				</ThemedView>

				<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
					{/* Profile Section */}
					<ThemedView style={styles.section}>
						<ThemedText style={styles.sectionTitle}>Profile</ThemedText>
						<ThemedView style={styles.profileSection}>
							<TouchableOpacity
								style={styles.avatarContainer}
								onPress={handleAvatarPress}
							>
								{avatarUri ? (
									<Image source={{ uri: avatarUri }} style={styles.avatar} />
								) : (
									<View style={styles.avatarPlaceholder}>
										<User size={40} color={Colors.almostWhite} />
									</View>
								)}
								<View style={styles.avatarEditBadge}>
									<Pencil size={12} color={Colors.almostWhite} />
								</View>
							</TouchableOpacity>

							<View style={styles.usernameContainer}>
								<TextInput
									style={styles.usernameInput}
									value={usernameInput}
									onChangeText={setUsernameInput}
									placeholder="username"
									placeholderTextColor={Colors.gray}
									autoCapitalize="none"
									autoCorrect={false}
								/>
								<ThemedText style={styles.usernameSuffix}>
									@getportal.cc
								</ThemedText>
							</View>

							<TouchableOpacity
								style={styles.saveButton}
								onPress={handleSaveProfile}
								disabled={profileIsLoading}
							>
								<ThemedText style={styles.saveButtonText}>
									{profileIsLoading ? "Saving..." : "Save Profile"}
								</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>

					{/* Wallet Section */}
					<ThemedView style={styles.section}>
						<ThemedText style={styles.sectionTitle}>Wallet</ThemedText>
						<ThemedView style={styles.walletSection}>
							<TouchableOpacity
								style={styles.card}
								onPress={handleWalletCardPress}
								activeOpacity={0.7}
							>
								<View style={styles.cardContent}>
									<View style={styles.cardLeft}>
										<ThemedText style={styles.cardTitle}>
											Wallet Connect
										</ThemedText>
										<ThemedText style={styles.cardStatus}>
											{isWalletConnectedState ? "Connected" : "Not connected"}
										</ThemedText>
									</View>
									<ChevronRight size={24} color={Colors.almostWhite} />
								</View>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>

					{/* Nostr Section */}
					<ThemedView style={styles.section}>
						<ThemedText style={styles.sectionTitle}>Relays</ThemedText>
						<ThemedView style={styles.walletSection}>
							<TouchableOpacity
								style={styles.card}
								onPress={handleNostrCardPress}
								activeOpacity={0.7}
							>
								<View style={styles.cardContent}>
									<View style={styles.cardLeft}>
										<ThemedText style={styles.cardTitle}>
											Nostr relays
										</ThemedText>
										<ThemedText style={styles.cardStatus}>
											{isRelayConnectedState ? "Connected" : "Not connected"}
										</ThemedText>
									</View>
									<ChevronRight size={24} color={Colors.almostWhite} />
								</View>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
					{/* Extra Section */}
					<ThemedView style={styles.section}>
						<ThemedText style={styles.sectionTitle}>Extra</ThemedText>
						<ThemedView style={styles.extraSection}>
							<TouchableOpacity
								style={styles.clearDataButton}
								onPress={handleClearAppData}
							>
								<ThemedText style={styles.clearDataButtonText}>
									Reset App
								</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
				</ScrollView>
			</ThemedView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#000000",
	},
	container: {
		flex: 1,
		backgroundColor: "#000000",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingTop: 10,
		paddingBottom: 20,
		backgroundColor: "#000000",
	},
	backButton: {
		marginRight: 15,
	},
	headerText: {
		fontSize: 20,
		fontWeight: "bold",
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	contentContainer: {
		paddingVertical: 12,
	},
	section: {
		marginBottom: 24,
		width: "100%",
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: Colors.almostWhite,
		marginBottom: 12,
	},
	profileSection: {
		alignItems: "center",
		paddingVertical: 12,
		width: "100%",
	},
	walletSection: {
		paddingVertical: 12,
		width: "100%",
	},
	extraSection: {
		paddingVertical: 12,
		width: "100%",
	},
	card: {
		backgroundColor: Colors.darkGray,
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	cardContent: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	cardLeft: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: Colors.almostWhite,
		marginBottom: 4,
	},
	cardStatus: {
		fontSize: 14,
		color: Colors.dirtyWhite,
	},
	avatarContainer: {
		position: "relative",
		width: 175,
		height: 175,
		marginBottom: 24,
	},
	avatar: {
		width: 175,
		height: 175,
		borderRadius: 99,
		borderWidth: 2,
		borderColor: Colors.almostWhite,
	},
	avatarPlaceholder: {
		width: 175,
		height: 175,
		borderRadius: 99,
		backgroundColor: Colors.darkGray,
		borderWidth: 2,
		borderColor: Colors.almostWhite,
		justifyContent: "center",
		alignItems: "center",
	},
	avatarEditBadge: {
		position: "absolute",
		bottom: 8,
		right: 8,
		backgroundColor: Colors.darkGray,
		width: 35,
		height: 35,
		borderRadius: 50,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: Colors.almostWhite,
	},
	usernameContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: Colors.gray,
		marginBottom: 24,
		width: "100%",
		maxWidth: 500,
		alignSelf: "center",
	},
	usernameInput: {
		color: Colors.almostWhite,
		fontSize: 16,
		flex: 1,
		paddingVertical: 8,
	},
	usernameSuffix: {
		color: Colors.gray,
		fontSize: 16,
	},
	saveButton: {
		backgroundColor: Colors.darkGray,
		padding: 16,
		borderRadius: 8,
		width: "100%",
		maxWidth: 500,
		alignItems: "center",
		marginBottom: 20,
		alignSelf: "center",
	},
	saveButtonText: {
		color: Colors.almostWhite,
		fontSize: 16,
		fontWeight: "bold",
	},
	clearDataButton: {
		backgroundColor: "#FF3B30",
		padding: 16,
		borderRadius: 8,
		width: "100%",
		maxWidth: 500,
		alignItems: "center",
		alignSelf: "center",
	},
	clearDataButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "bold",
	},
	pasteUrlContainer: {
		backgroundColor: Colors.darkGray,
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	pasteUrlLabel: {
		fontSize: 16,
		fontWeight: "600",
		color: Colors.almostWhite,
		marginBottom: 8,
	},
	urlInput: {
		backgroundColor: "#2A2A2A",
		color: Colors.almostWhite,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		fontSize: 16,
	},
	urlSubmitButton: {
		backgroundColor: Colors.darkGray,
		borderWidth: 1,
		borderColor: Colors.almostWhite,
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
	},
	urlSubmitButtonText: {
		color: Colors.almostWhite,
		fontSize: 16,
		fontWeight: "bold",
	},
});
