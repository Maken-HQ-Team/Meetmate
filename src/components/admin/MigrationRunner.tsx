import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MigrationExecutor } from '@/utils/migrationExecutor';
import { MigrationUtils } from '@/utils/migrationUtils';
import { CheckCircle, XCircle, AlertCircle, Play, RotateCcw } from 'lucide-react';

interface MigrationStatus {
  running: boolean;
  success: boolean | null;
  message: string;
  error?: string;
}

export const MigrationRunner = () => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    running: false,
    success: null,
    message: 'Ready to run migration'
  });
  const [constraintStatus, setConstraintStatus] = useState<{
    availability: boolean;
    messages: boolean;
    checked: boolean;
  }>({
    availability: false,
    messages: false,
    checked: false
  });

  // Check current constraint status
  const checkConstraints = async () => {
    try {
      const constraints = await MigrationUtils.checkConstraintsExist();
      setConstraintStatus({
        availability: constraints.availabilityConstraint,
        messages: constraints.messagesConstraint,
        checked: true
      });
    } catch (error) {
      console.error('Error checking constraints:', error);
      setConstraintStatus({
        availability: false,
        messages: false,
        checked: true
      });
    }
  };

  // Run the foreign key migration
  const runMigration = async () => {
    setMigrationStatus({
      running: true,
      success: null,
      message: 'Running foreign key relationships migration...'
    });

    try {
      const result = await MigrationExecutor.executeForeignKeyMigration();
      
      setMigrationStatus({
        running: false,
        success: result.success,
        message: result.message,
        error: result.error
      });

      // Refresh constraint status
      if (result.success) {
        await checkConstraints();
      }
    } catch (error) {
      setMigrationStatus({
        running: false,
        success: false,
        message: 'Migration execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Rollback migration
  const rollbackMigration = async () => {
    setMigrationStatus({
      running: true,
      success: null,
      message: 'Rolling back foreign key constraints...'
    });

    try {
      const result = await MigrationUtils.rollbackForeignKeys();
      
      setMigrationStatus({
        running: false,
        success: result.success,
        message: result.message,
        error: result.error
      });

      // Refresh constraint status
      await checkConstraints();
    } catch (error) {
      setMigrationStatus({
        running: false,
        success: false,
        message: 'Rollback failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Validate relationships
  const validateRelationships = async () => {
    setMigrationStatus({
      running: true,
      success: null,
      message: 'Validating foreign key relationships...'
    });

    try {
      const result = await MigrationUtils.validateForeignKeyRelationships();
      
      setMigrationStatus({
        running: false,
        success: result.success,
        message: result.message,
        error: result.error
      });
    } catch (error) {
      setMigrationStatus({
        running: false,
        success: false,
        message: 'Validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Database Migration Runner
            <Badge variant="outline">Foreign Key Relationships</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Status</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkConstraints}
                disabled={migrationStatus.running}
              >
                Check Constraints
              </Button>
              {constraintStatus.checked && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {constraintStatus.availability ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Availability FK</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {constraintStatus.messages ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">Messages FK</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Migration Status */}
          {migrationStatus.message && (
            <Alert>
              <div className="flex items-center gap-2">
                {migrationStatus.running ? (
                  <AlertCircle className="h-4 w-4 animate-spin" />
                ) : migrationStatus.success === true ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : migrationStatus.success === false ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {migrationStatus.message}
                  {migrationStatus.error && (
                    <div className="mt-1 text-sm text-red-600">
                      Error: {migrationStatus.error}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={runMigration}
              disabled={migrationStatus.running}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Run Migration
            </Button>
            
            <Button
              variant="outline"
              onClick={validateRelationships}
              disabled={migrationStatus.running}
            >
              Validate
            </Button>
            
            <Button
              variant="destructive"
              onClick={rollbackMigration}
              disabled={migrationStatus.running}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Rollback
            </Button>
          </div>

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This migration will add foreign key constraints to your database.
              Make sure to backup your data before running. The migration includes automatic rollback
              capabilities if validation fails.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};