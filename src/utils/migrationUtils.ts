import { supabase } from '@/integrations/supabase/client';

export interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Utility functions for safely executing database migrations
 */
export class MigrationUtils {
  /**
   * Execute a migration script safely with validation
   */
  static async executeMigration(migrationSql: string): Promise<MigrationResult> {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSql
      });

      if (error) {
        console.error('Migration execution failed:', error);
        return {
          success: false,
          message: 'Migration failed',
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Migration executed successfully'
      };
    } catch (err) {
      console.error('Migration execution error:', err);
      return {
        success: false,
        message: 'Migration execution error',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate that foreign key relationships are working
   */
  static async validateForeignKeyRelationships(): Promise<MigrationResult> {
    try {
      // Test availability-profiles relationship
      const { data: availabilityTest, error: availabilityError } = await supabase
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

      if (availabilityError) {
        return {
          success: false,
          message: 'Availability-profiles relationship validation failed',
          error: availabilityError.message
        };
      }

      // Test messages-profiles relationship
      const { data: messagesTest, error: messagesError } = await supabase
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

      if (messagesError) {
        return {
          success: false,
          message: 'Messages-profiles relationship validation failed',
          error: messagesError.message
        };
      }

      return {
        success: true,
        message: 'All foreign key relationships validated successfully'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Foreign key validation error',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if foreign key constraints exist
   */
  static async checkConstraintsExist(): Promise<{
    availabilityConstraint: boolean;
    messagesConstraint: boolean;
  }> {
    try {
      const { data, error } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, table_name')
        .in('constraint_name', ['fk_availability_user_id', 'fk_messages_sender_id']);

      if (error) {
        console.error('Error checking constraints:', error);
        return {
          availabilityConstraint: false,
          messagesConstraint: false
        };
      }

      const constraints = data || [];
      return {
        availabilityConstraint: constraints.some(c => c.constraint_name === 'fk_availability_user_id'),
        messagesConstraint: constraints.some(c => c.constraint_name === 'fk_messages_sender_id')
      };
    } catch (err) {
      console.error('Error checking constraints:', err);
      return {
        availabilityConstraint: false,
        messagesConstraint: false
      };
    }
  }

  /**
   * Log migration status for tracking
   */
  static logMigrationStatus(migrationName: string, result: MigrationResult): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      migration: migrationName,
      success: result.success,
      message: result.message,
      error: result.error
    };

    console.log('Migration Status:', logEntry);
    
    // Store in localStorage for development tracking
    try {
      const existingLogs = JSON.parse(localStorage.getItem('migration_logs') || '[]');
      existingLogs.push(logEntry);
      localStorage.setItem('migration_logs', JSON.stringify(existingLogs));
    } catch (err) {
      console.warn('Could not store migration log:', err);
    }
  }

  /**
   * Rollback migration (basic implementation)
   */
  static async rollbackForeignKeys(): Promise<MigrationResult> {
    try {
      const rollbackSql = `
        -- Remove foreign key constraints
        ALTER TABLE availability DROP CONSTRAINT IF EXISTS fk_availability_user_id;
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_sender_id;
        
        -- Remove indexes
        DROP INDEX IF EXISTS idx_availability_user_id;
        DROP INDEX IF EXISTS idx_messages_sender_id;
        DROP INDEX IF EXISTS idx_availability_user_day;
        DROP INDEX IF EXISTS idx_messages_conversation_created;
      `;

      return await this.executeMigration(rollbackSql);
    } catch (err) {
      return {
        success: false,
        message: 'Rollback failed',
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }
}