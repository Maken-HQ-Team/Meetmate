import { supabase } from '@/integrations/supabase/client';
import { MigrationUtils, MigrationResult } from './migrationUtils';
import { ErrorHandler } from './errorHandling';

/**
 * Migration executor with comprehensive validation and rollback capabilities
 */
export class MigrationExecutor {
  private static readonly MIGRATION_LOCK_KEY = 'migration_in_progress';
  private static readonly MIGRATION_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute the foreign key relationships migration
   */
  static async executeForeignKeyMigration(): Promise<MigrationResult> {
    // Check if migration is already in progress
    if (this.isMigrationInProgress()) {
      return {
        success: false,
        message: 'Migration already in progress',
        error: 'Another migration is currently running'
      };
    }

    // Set migration lock
    this.setMigrationLock();

    try {
      console.log('🚀 Starting foreign key relationships migration...');
      
      // Step 1: Validate current state
      const preValidation = await this.validatePreMigrationState();
      if (!preValidation.success) {
        return preValidation;
      }

      // Step 2: Execute the migration
      const migrationSql = this.getForeignKeyMigrationSQL();
      const migrationResult = await ErrorHandler.retryOperation(
        () => MigrationUtils.executeMigration(migrationSql),
        'foreignKeyMigration',
        2 // Fewer retries for migrations
      );

      if (!migrationResult.success) {
        console.error('❌ Migration execution failed:', migrationResult.error);
        return migrationResult;
      }

      // Step 3: Validate post-migration state
      const postValidation = await this.validatePostMigrationState();
      if (!postValidation.success) {
        console.error('❌ Post-migration validation failed, attempting rollback...');
        await this.rollbackMigration();
        return {
          success: false,
          message: 'Migration validation failed, rolled back',
          error: postValidation.error
        };
      }

      // Step 4: Log successful migration
      MigrationUtils.logMigrationStatus('foreign_key_relationships', migrationResult);

      console.log('✅ Foreign key relationships migration completed successfully');
      return {
        success: true,
        message: 'Foreign key relationships migration completed successfully'
      };

    } catch (error) {
      console.error('❌ Migration execution error:', error);
      
      // Attempt rollback on error
      try {
        await this.rollbackMigration();
        console.log('🔄 Rollback completed after migration error');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }

      return {
        success: false,
        message: 'Migration failed and was rolled back',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Always clear migration lock
      this.clearMigrationLock();
    }
  }

  /**
   * Validate system state before migration
   */
  private static async validatePreMigrationState(): Promise<MigrationResult> {
    try {
      console.log('🔍 Validating pre-migration state...');

      // Check if tables exist
      const tablesExist = await this.validateTablesExist(['availability', 'messages', 'profiles']);
      if (!tablesExist.success) {
        return tablesExist;
      }

      // Check if foreign keys already exist
      const constraints = await MigrationUtils.checkConstraintsExist();
      
      if (constraints.availabilityConstraint && constraints.messagesConstraint) {
        return {
          success: false,
          message: 'Foreign key constraints already exist',
          error: 'Migration has already been applied'
        };
      }

      // Check data integrity
      const dataIntegrity = await this.validateDataIntegrity();
      if (!dataIntegrity.success) {
        return dataIntegrity;
      }

      console.log('✅ Pre-migration validation passed');
      return { success: true, message: 'Pre-migration validation passed' };

    } catch (error) {
      return {
        success: false,
        message: 'Pre-migration validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate system state after migration
   */
  private static async validatePostMigrationState(): Promise<MigrationResult> {
    try {
      console.log('🔍 Validating post-migration state...');

      // Check if foreign key constraints were created
      const constraints = await MigrationUtils.checkConstraintsExist();
      
      if (!constraints.availabilityConstraint || !constraints.messagesConstraint) {
        return {
          success: false,
          message: 'Foreign key constraints were not created properly',
          error: `Availability constraint: ${constraints.availabilityConstraint}, Messages constraint: ${constraints.messagesConstraint}`
        };
      }

      // Validate foreign key relationships work
      const relationshipValidation = await MigrationUtils.validateForeignKeyRelationships();
      if (!relationshipValidation.success) {
        return relationshipValidation;
      }

      // Test sample queries
      const queryTest = await this.testSampleQueries();
      if (!queryTest.success) {
        return queryTest;
      }

      console.log('✅ Post-migration validation passed');
      return { success: true, message: 'Post-migration validation passed' };

    } catch (error) {
      return {
        success: false,
        message: 'Post-migration validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate that required tables exist
   */
  private static async validateTablesExist(tableNames: string[]): Promise<MigrationResult> {
    try {
      for (const tableName of tableNames) {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', tableName)
          .eq('table_schema', 'public')
          .single();

        if (error || !data) {
          return {
            success: false,
            message: `Required table '${tableName}' does not exist`,
            error: error?.message || 'Table not found'
          };
        }
      }

      return { success: true, message: 'All required tables exist' };
    } catch (error) {
      return {
        success: false,
        message: 'Error validating table existence',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate data integrity before migration
   */
  private static async validateDataIntegrity(): Promise<MigrationResult> {
    try {
      // Check for orphaned availability records
      const { data: orphanedAvailability, error: availError } = await supabase
        .from('availability')
        .select('user_id')
        .not('user_id', 'in', `(SELECT user_id FROM profiles)`)
        .limit(1);

      if (availError) {
        return {
          success: false,
          message: 'Error checking availability data integrity',
          error: availError.message
        };
      }

      if (orphanedAvailability && orphanedAvailability.length > 0) {
        return {
          success: false,
          message: 'Found orphaned availability records',
          error: 'Some availability records reference non-existent profiles'
        };
      }

      // Check for orphaned message records
      const { data: orphanedMessages, error: msgError } = await supabase
        .from('messages')
        .select('sender_id')
        .not('sender_id', 'in', `(SELECT user_id FROM profiles)`)
        .limit(1);

      if (msgError) {
        return {
          success: false,
          message: 'Error checking messages data integrity',
          error: msgError.message
        };
      }

      if (orphanedMessages && orphanedMessages.length > 0) {
        return {
          success: false,
          message: 'Found orphaned message records',
          error: 'Some messages reference non-existent sender profiles'
        };
      }

      return { success: true, message: 'Data integrity validation passed' };
    } catch (error) {
      return {
        success: false,
        message: 'Data integrity validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test sample queries after migration
   */
  private static async testSampleQueries(): Promise<MigrationResult> {
    try {
      // Test availability with profiles JOIN
      const { error: availError } = await supabase
        .from('availability')
        .select(`
          id,
          user_id,
          profiles!fk_availability_user_id(
            user_id,
            name
          )
        `)
        .limit(1);

      if (availError) {
        return {
          success: false,
          message: 'Availability-profiles JOIN query failed',
          error: availError.message
        };
      }

      // Test messages with profiles JOIN
      const { error: msgError } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          sender_profile:profiles!fk_messages_sender_id(
            user_id,
            name
          )
        `)
        .limit(1);

      if (msgError) {
        return {
          success: false,
          message: 'Messages-profiles JOIN query failed',
          error: msgError.message
        };
      }

      return { success: true, message: 'Sample queries test passed' };
    } catch (error) {
      return {
        success: false,
        message: 'Sample queries test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rollback migration
   */
  private static async rollbackMigration(): Promise<MigrationResult> {
    try {
      console.log('🔄 Starting migration rollback...');
      
      const rollbackResult = await MigrationUtils.rollbackForeignKeys();
      
      if (rollbackResult.success) {
        console.log('✅ Migration rollback completed successfully');
      } else {
        console.error('❌ Migration rollback failed:', rollbackResult.error);
      }
      
      return rollbackResult;
    } catch (error) {
      return {
        success: false,
        message: 'Rollback execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the foreign key migration SQL
   */
  private static getForeignKeyMigrationSQL(): string {
    return `
      -- Migration: Add foreign key relationships for availability and messages tables
      -- Created: ${new Date().toISOString()}
      
      DO $$
      BEGIN
          -- Add foreign key constraint for availability table if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'fk_availability_user_id' 
              AND table_name = 'availability'
          ) THEN
              ALTER TABLE availability 
              ADD CONSTRAINT fk_availability_user_id 
              FOREIGN KEY (user_id) REFERENCES profiles(user_id) 
              ON DELETE CASCADE;
              
              RAISE NOTICE 'Added foreign key constraint fk_availability_user_id';
          ELSE
              RAISE NOTICE 'Foreign key constraint fk_availability_user_id already exists';
          END IF;

          -- Add foreign key constraint for messages table if it doesn't exist
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'fk_messages_sender_id' 
              AND table_name = 'messages'
          ) THEN
              ALTER TABLE messages 
              ADD CONSTRAINT fk_messages_sender_id 
              FOREIGN KEY (sender_id) REFERENCES profiles(user_id) 
              ON DELETE CASCADE;
              
              RAISE NOTICE 'Added foreign key constraint fk_messages_sender_id';
          ELSE
              RAISE NOTICE 'Foreign key constraint fk_messages_sender_id already exists';
          END IF;
      END $$;

      -- Create indexes for performance if they don't exist
      CREATE INDEX IF NOT EXISTS idx_availability_user_id ON availability(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_availability_user_day ON availability(user_id, day_of_week);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

      -- Refresh Supabase schema cache
      NOTIFY pgrst, 'reload schema';
    `;
  }

  /**
   * Check if migration is in progress
   */
  private static isMigrationInProgress(): boolean {
    try {
      const lockData = localStorage.getItem(this.MIGRATION_LOCK_KEY);
      if (!lockData) return false;

      const { timestamp } = JSON.parse(lockData);
      const now = Date.now();
      
      // Consider migration stuck if it's been running for more than timeout
      if (now - timestamp > this.MIGRATION_TIMEOUT) {
        this.clearMigrationLock();
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set migration lock
   */
  private static setMigrationLock(): void {
    try {
      const lockData = {
        timestamp: Date.now(),
        pid: Math.random().toString(36).substr(2, 9)
      };
      localStorage.setItem(this.MIGRATION_LOCK_KEY, JSON.stringify(lockData));
    } catch (error) {
      console.warn('Could not set migration lock:', error);
    }
  }

  /**
   * Clear migration lock
   */
  private static clearMigrationLock(): void {
    try {
      localStorage.removeItem(this.MIGRATION_LOCK_KEY);
    } catch (error) {
      console.warn('Could not clear migration lock:', error);
    }
  }
}