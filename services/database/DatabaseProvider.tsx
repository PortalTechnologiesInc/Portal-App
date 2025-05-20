import {
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  Fragment,
  createContext,
  useContext,
} from 'react';
import { SQLiteProvider, type SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';
import { useOnboarding } from '@/context/OnboardingContext';
import { getMnemonic, mnemonicEvents } from '@/services/SecureStorageService';
import { DatabaseService } from './index';

// Database name constant to ensure consistency
export const DATABASE_NAME = 'portal-app.db';

// Create a context to expose database initialization state
interface DatabaseContextType {
  isDbInitializing: boolean;
  isDbInitialized: boolean;
  shouldInitDb: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isDbInitializing: false,
  isDbInitialized: false,
  shouldInitDb: false,
});

// Hook to consume the database context
export const useDatabaseStatus = () => useContext(DatabaseContext);

// Utility function to reset database tables
export const resetDatabase = async (): Promise<void> => {
  try {
    console.log('Attempting to reset database tables');
    const db = await openDatabaseAsync(DATABASE_NAME);

    // Execute direct SQL to drop tables
    await db.execAsync(`
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS subscriptions;
      DROP INDEX IF EXISTS idx_activities_date;
      DROP INDEX IF EXISTS idx_activities_type;
      DROP INDEX IF EXISTS idx_subscriptions_next_payment;
      PRAGMA user_version = 0;
    `);

    console.log('Database reset completed successfully');
    await db.closeAsync();
  } catch (error) {
    console.error('Failed to reset database:', error);
  }
};

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider = ({ children }: DatabaseProviderProps) => {
  const { isOnboardingComplete } = useOnboarding();
  const [shouldInitDb, setShouldInitDb] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [isDbInitializing, setIsDbInitializing] = useState(false);

  // Check mnemonic and init database when conditions are met
  const checkMnemonicAndInit = useCallback(async () => {
    if (isOnboardingComplete) {
      const mnemonic = await getMnemonic();
      if (mnemonic) {
        console.log('Onboarding complete and mnemonic available - initializing database');
        setShouldInitDb(true);
      } else {
        console.log('Mnemonic not available - database initialization delayed');
        setShouldInitDb(false);
      }
    } else {
      console.log('Onboarding not complete - database initialization delayed');
      setShouldInitDb(false);
    }
  }, [isOnboardingComplete]);

  // Initial check
  useEffect(() => {
    checkMnemonicAndInit();
  }, [checkMnemonicAndInit]);

  // Also listen for mnemonic changes
  useEffect(() => {
    // Subscribe to mnemonic change events
    const mnemonicSubscription = mnemonicEvents.addListener('mnemonicChanged', () => {
      console.log('Mnemonic changed - checking database initialization status');
      checkMnemonicAndInit();
    });

    return () => {
      mnemonicSubscription.remove();
    };
  }, [checkMnemonicAndInit]);

  // Function to migrate database schema if needed
  const migrateDbIfNeeded = useCallback(async (db: SQLiteDatabase) => {
    console.log('Database initialization started');
    setIsDbInitializing(true);
    const DATABASE_VERSION = 3;

    try {
      let { user_version: currentDbVersion } = (await db.getFirstAsync<{
        user_version: number;
      }>('PRAGMA user_version')) ?? { user_version: 0 };

      if (currentDbVersion >= DATABASE_VERSION) {
        console.log(`Database already at version ${currentDbVersion}`);
        setDbInitialized(true);
        setIsDbInitializing(false);
        return;
      }

      console.log(`Migrating database from version ${currentDbVersion} to ${DATABASE_VERSION}`);

      if (currentDbVersion <= 0) {
        await db.execAsync(`
          PRAGMA journal_mode = 'wal';
        `);
        currentDbVersion = 1;
        console.log('Set journal mode to WAL - now at version 1');
      }

      if (currentDbVersion <= 1) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('auth', 'pay')), -- Maps to ActivityType enum
            service_name TEXT NOT NULL,
            service_key TEXT NOT NULL,
            detail TEXT NOT NULL,
            date INTEGER NOT NULL, -- Unix timestamp
            amount INTEGER, -- NULL for Auth type
            currency TEXT, -- NULL for Auth type
            request_id TEXT NOT NULL, -- Reference to the original request if applicable
            created_at INTEGER NOT NULL -- Unix timestamp
          );

          -- Create subscriptions table for recurring payments
          CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY NOT NULL,
            request_id TEXT NOT NULL, -- Reference to the original subscription request
            service_name TEXT NOT NULL,
            service_key TEXT NOT NULL,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL,
            recurrence_calendar TEXT NOT NULL,
            recurrence_max_payments INTEGER,
            recurrence_until INTEGER,
            recurrence_first_payment_due INTEGER NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
            last_payment_date INTEGER, -- Unix timestamp of last successful payment
            next_payment_date INTEGER, -- Unix timestamp of next scheduled payment
            created_at INTEGER NOT NULL -- Unix timestamp
          );

          -- Create indexes for better query performance
          CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
          CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);
        `);
        currentDbVersion = 2;
        console.log('Created tables - now at version 2');
      }

      if (currentDbVersion <= 2) {
        await db.execAsync(`
          -- Add subscription_id column to activities
          ALTER TABLE activities ADD COLUMN subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL;

          -- Create index for subscription_id
          CREATE INDEX IF NOT EXISTS idx_activities_subscription ON activities(subscription_id);
        `);
        currentDbVersion = 3;
        console.log('Added subscription_id to activities - now at version 3');
      }

      await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
      console.log(`Database migration completed to version ${DATABASE_VERSION}`);
      setDbInitialized(true);
    } catch (error) {
      console.error('Database migration failed:', error);
      setDbInitialized(false);
    } finally {
      setIsDbInitializing(false);
    }
  }, []);

  // Create the context value
  const contextValue = {
    isDbInitializing,
    isDbInitialized: dbInitialized,
    shouldInitDb,
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      <Fragment>
        {shouldInitDb ? (
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
            {children}
          </SQLiteProvider>
        ) : (
          // Render children without SQLite when not ready
          children
        )}
      </Fragment>
    </DatabaseContext.Provider>
  );
};
