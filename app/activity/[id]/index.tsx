import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { formatDayAndDate } from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';
import {
  Key,
  BanknoteIcon,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Share,
  XCircle,
  Shield,
  User,
  DollarSign,
} from 'lucide-react-native';
import { ActivityType } from '@/models/Activity';
import { DatabaseService } from '@/services/database';
import type { ActivityWithDates } from '@/services/database';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColor } from '@/hooks/useThemeColor';

const { width } = Dimensions.get('window');

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams();
  const [activity, setActivity] = useState<ActivityWithDates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useSQLiteContext();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonSecondaryColor = useThemeColor({}, 'buttonSecondary');
  const buttonSecondaryTextColor = useThemeColor({}, 'buttonSecondaryText');
  const buttonDangerColor = useThemeColor({}, 'buttonDanger');
  const buttonDangerTextColor = useThemeColor({}, 'buttonDangerText');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');
  const statusWarningColor = useThemeColor({}, 'statusWarning');
  const statusErrorColor = useThemeColor({}, 'statusError');

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const dbService = new DatabaseService(db);
        const activityData = await dbService.getActivity(id as string);

        if (activityData) {
          setActivity(activityData);
        } else {
          setError('Activity not found');
        }
      } catch (err) {
        console.error('Error fetching activity:', err);
        setError('Failed to load activity');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchActivity();
    }
  }, [id, db]);

  const handleBackPress = () => {
    router.back();
  };

  const handleCopyId = () => {
    // TODO: Implement copy functionality
    console.log('Copy activity ID:', id);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share activity:', activity);
  };

  const getActivityStatus = (detail: string): 'success' | 'failed' | 'pending' => {
    const lowerDetail = detail.toLowerCase();
    if (lowerDetail.includes('approved') || lowerDetail.includes('success')) {
      return 'success';
    } else if (
      lowerDetail.includes('failed') ||
      lowerDetail.includes('denied') ||
      lowerDetail.includes('error') ||
      lowerDetail.includes('rejected')
    ) {
      return 'failed';
    } else {
      return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return statusConnectedColor;
      case 'pending':
        return statusWarningColor;
      case 'failed':
        return statusErrorColor;
      default:
        return secondaryTextColor;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} color={statusConnectedColor} />;
      case 'pending':
        return <Clock size={16} color={statusWarningColor} />;
      case 'failed':
        return <XCircle size={16} color={statusErrorColor} />;
      default:
        return <AlertCircle size={16} color={secondaryTextColor} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getActivityTypeText = (type: string) => {
    return type === ActivityType.Auth ? 'Login Request' : 'Payment';
  };

  const getActivityDescription = (type: string, status: string, detail: string) => {
    if (type === ActivityType.Auth) {
      switch (status) {
        case 'success':
          return 'You successfully authenticated with this service';
        case 'failed':
          if (detail.toLowerCase().includes('denied')) {
            return 'You denied the authentication request';
          }
          return 'Authentication was denied or failed';
        case 'pending':
          return 'Authentication is being processed';
        default:
          return 'Authentication request';
      }
    } else {
      switch (status) {
        case 'success':
          return 'Payment was completed successfully';
        case 'failed':
          if (detail.toLowerCase().includes('denied')) {
            return 'You denied the payment request';
          }
          return 'Payment failed or was rejected';
        case 'pending':
          return 'Payment is being processed';
        default:
          return 'Payment request';
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryTextColor} />
          <ThemedText style={[styles.loadingText, { color: secondaryTextColor }]}>
            Loading activity...
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <ThemedView style={styles.errorContainer}>
          <AlertCircle size={48} color={statusErrorColor} />
          <ThemedText style={[styles.errorText, { color: statusErrorColor }]}>
            {error || 'Activity not found'}
          </ThemedText>
          <TouchableOpacity
            onPress={handleBackPress}
            style={[styles.backToListButton, { backgroundColor: buttonSecondaryColor }]}
          >
            <ThemedText style={[styles.backToListButtonText, { color: buttonSecondaryTextColor }]}>
              Go Back
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const activityStatus = getActivityStatus(activity.detail);
  const isPayment = activity.type === ActivityType.Pay;
  const isAuth = activity.type === ActivityType.Auth;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color={primaryTextColor} />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.title, { color: primaryTextColor }]}>
            {isAuth ? 'Login Details' : 'Payment Details'}
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Share size={20} color={primaryTextColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Main Activity Card */}
          <View style={[styles.mainCard, { backgroundColor: surfaceSecondaryColor }]}>
            <View
              style={[
                styles.activityIconContainer,
                { backgroundColor: isAuth ? statusConnectedColor : buttonSecondaryColor },
              ]}
            >
              {isAuth ? (
                <Key size={32} color={primaryTextColor} />
              ) : (
                <BanknoteIcon size={32} color={primaryTextColor} />
              )}
            </View>

            <ThemedText type="title" style={[styles.serviceName, { color: primaryTextColor }]}>
              {activity.service_name}
            </ThemedText>

            <View style={[styles.statusContainer, { backgroundColor: surfaceSecondaryColor }]}>
              {getStatusIcon(activityStatus)}
              <ThemedText style={[styles.statusText, { color: getStatusColor(activityStatus) }]}>
                {getStatusText(activityStatus)}
              </ThemedText>
            </View>

            {isPayment && activity.amount && (
              <View style={styles.amountContainer}>
                <ThemedText style={[styles.amount, { color: primaryTextColor }]}>
                  {activity.amount.toLocaleString()} sats
                </ThemedText>
                <ThemedText style={[styles.amountSubtext, { color: secondaryTextColor }]}>
                  ≈ ${(activity.amount * 0.0004).toFixed(2)} USD
                </ThemedText>
              </View>
            )}

            <ThemedText style={[styles.description, { color: secondaryTextColor }]}>
              {getActivityDescription(activity.type, activityStatus, activity.detail)}
            </ThemedText>
          </View>

          {/* Details Section */}
          <View style={styles.sectionContainer}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: primaryTextColor }]}>
              {isAuth ? 'Authentication Details' : 'Transaction Details'}
            </ThemedText>

            <View style={[styles.detailCard, { backgroundColor: surfaceSecondaryColor }]}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}>
                  <Calendar size={18} color={secondaryTextColor} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Date & Time
                  </ThemedText>
                  <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                    {formatDayAndDate(activity.date)}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]} />

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}>
                  <FontAwesome6 name="hashtag" size={16} color={secondaryTextColor} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Activity ID
                  </ThemedText>
                  <View style={styles.copyableContent}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.scrollableText}
                      contentContainerStyle={styles.scrollableTextContent}
                    >
                      <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                        {activity.id}
                      </ThemedText>
                    </ScrollView>
                    <TouchableOpacity onPress={handleCopyId} style={styles.copyButton}>
                      <Copy size={16} color={secondaryTextColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]} />

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}>
                  <FontAwesome6 name="server" size={16} color={secondaryTextColor} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Service Key
                  </ThemedText>
                  <View style={styles.copyableContent}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.scrollableText}
                      contentContainerStyle={styles.scrollableTextContent}
                    >
                      <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                        {activity.service_key}
                      </ThemedText>
                    </ScrollView>
                    <TouchableOpacity style={styles.copyButton}>
                      <Copy size={16} color={secondaryTextColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {isPayment && (
                <>
                  <View
                    style={[styles.separator, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]}
                  />

                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}>
                      <DollarSign size={16} color={secondaryTextColor} />
                    </View>
                    <View style={styles.detailContent}>
                      <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                        Amount
                      </ThemedText>
                      <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                        {activity.amount ? `${activity.amount} sats` : 'N/A'}
                      </ThemedText>
                    </View>
                  </View>

                  {activity.currency && (
                    <>
                      <View
                        style={[styles.separator, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]}
                      />

                      <View style={styles.detailRow}>
                        <View
                          style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}
                        >
                          <FontAwesome6 name="coins" size={16} color={secondaryTextColor} />
                        </View>
                        <View style={styles.detailContent}>
                          <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                            Currency
                          </ThemedText>
                          <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                            {activity.currency}
                          </ThemedText>
                        </View>
                      </View>
                    </>
                  )}
                </>
              )}

              <View style={[styles.separator, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]} />

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}>
                  <FontAwesome6 name="info-circle" size={16} color={secondaryTextColor} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Status Details
                  </ThemedText>
                  <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                    {activity.detail}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]} />

              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: surfaceSecondaryColor }]}>
                  <FontAwesome6 name="link" size={16} color={secondaryTextColor} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText style={[styles.detailLabel, { color: secondaryTextColor }]}>
                    Request ID
                  </ThemedText>
                  <View style={styles.copyableContent}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.scrollableText}
                      contentContainerStyle={styles.scrollableTextContent}
                    >
                      <ThemedText style={[styles.detailValue, { color: primaryTextColor }]}>
                        {activity.request_id}
                      </ThemedText>
                    </ScrollView>
                    <TouchableOpacity style={styles.copyButton}>
                      <Copy size={16} color={secondaryTextColor} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Activity Type Specific Information */}
          <View style={styles.sectionContainer}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { color: primaryTextColor }]}>
              {isAuth ? 'Security Information' : 'Payment Information'}
            </ThemedText>

            <View style={[styles.infoCard, { backgroundColor: surfaceSecondaryColor }]}>
              {isAuth ? (
                <View style={styles.infoContent}>
                  <Shield size={24} color={statusConnectedColor} style={styles.infoIcon} />
                  <View style={styles.infoTextContainer}>
                    <ThemedText style={[styles.infoTitle, { color: primaryTextColor }]}>
                      Authentication Request
                    </ThemedText>
                    <ThemedText style={[styles.infoText, { color: secondaryTextColor }]}>
                      This was a login request to authenticate your identity with{' '}
                      {activity.service_name}.
                      {activityStatus === 'success' && ' You successfully granted access.'}
                      {activityStatus === 'failed' &&
                        activity.detail.toLowerCase().includes('denied') &&
                        ' You denied this authentication request.'}
                      {activityStatus === 'failed' &&
                        !activity.detail.toLowerCase().includes('denied') &&
                        ' The authentication was not completed.'}
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.infoContent}>
                  <BanknoteIcon size={24} color={statusConnectedColor} style={styles.infoIcon} />
                  <View style={styles.infoTextContainer}>
                    <ThemedText style={[styles.infoTitle, { color: primaryTextColor }]}>
                      Payment Transaction
                    </ThemedText>
                    <ThemedText style={[styles.infoText, { color: secondaryTextColor }]}>
                      This was a payment request from {activity.service_name}.
                      {activityStatus === 'success' && ' The payment was processed successfully.'}
                      {activityStatus === 'failed' &&
                        activity.detail.toLowerCase().includes('denied') &&
                        ' You denied this payment request.'}
                      {activityStatus === 'failed' &&
                        !activity.detail.toLowerCase().includes('denied') &&
                        ' The payment could not be completed.'}
                      {activityStatus === 'pending' && ' The payment is still being processed.'}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled by theme
  },
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
    // color handled by theme
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainCard: {
    // backgroundColor handled by theme
    borderRadius: 24,
    padding: 24,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activityIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    // backgroundColor handled by theme
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    // color handled by theme
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor handled by theme
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    // color handled by theme
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    // color handled by theme
  },
  amountSubtext: {
    fontSize: 16,
    // color handled by theme
    marginTop: 4,
  },
  description: {
    fontSize: 16,
    // color handled by theme
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    // color handled by theme
  },
  detailCard: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor handled by theme
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    // color handled by theme
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    // color handled by theme
    fontWeight: '500',
  },
  copyableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  copyButton: {
    padding: 8,
    marginLeft: 12,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    // backgroundColor handled by theme
    marginVertical: 8,
  },
  actionContainer: {
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    // color handled by theme
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    // color handled by theme
    marginTop: 16,
  },
  backToListButton: {
    padding: 16,
    // backgroundColor handled by theme
    borderRadius: 16,
  },
  backToListButtonText: {
    fontSize: 16,
    fontWeight: '600',
    // color handled by theme
  },
  infoCard: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 20,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    // color handled by theme
  },
  infoText: {
    fontSize: 16,
    // color handled by theme
  },
  scrollableText: {
    flex: 1,
    maxHeight: 24,
  },
  scrollableTextContent: {
    alignItems: 'center',
    paddingRight: 4,
  },
});
