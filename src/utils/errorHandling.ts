import { toast } from '@/hooks/use-toast';

export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface ErrorHandlingResult {
  shouldRetry: boolean;
  userMessage: string;
  logMessage: string;
  fallbackAction?: () => void;
}

/**
 * Comprehensive error handling utilities for database operations
 */
export class ErrorHandler {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  /**
   * Handle database relationship errors
   */
  static handleDatabaseError(error: any, context: string): ErrorHandlingResult {
    const dbError = this.parseError(error);
    
    // Foreign key relationship errors
    if (dbError.code === 'PGRST200' && dbError.message?.includes('relationship')) {
      return {
        shouldRetry: false,
        userMessage: "Database relationship issue detected. Please contact support if this persists.",
        logMessage: `Foreign key relationship error in ${context}: ${dbError.message}`,
        fallbackAction: () => this.logRelationshipError(context, dbError)
      };
    }

    // Foreign key constraint violations
    if (dbError.code === '23503') {
      return {
        shouldRetry: false,
        userMessage: "Data integrity issue detected. Please refresh the page and try again.",
        logMessage: `Foreign key constraint violation in ${context}: ${dbError.message}`,
        fallbackAction: () => this.suggestRefresh()
      };
    }

    // Connection/timeout errors
    if (dbError.code === 'PGRST301' || dbError.message?.includes('timeout')) {
      return {
        shouldRetry: true,
        userMessage: "Connection timeout. Retrying...",
        logMessage: `Connection timeout in ${context}: ${dbError.message}`,
        fallbackAction: () => this.scheduleRetry(context)
      };
    }

    // Rate limiting
    if (dbError.code === '429' || dbError.message?.includes('rate limit')) {
      return {
        shouldRetry: true,
        userMessage: "Too many requests. Please wait a moment...",
        logMessage: `Rate limit exceeded in ${context}: ${dbError.message}`,
        fallbackAction: () => this.scheduleRetry(context, 5000) // Longer delay for rate limits
      };
    }

    // Generic database errors
    return {
      shouldRetry: this.shouldRetryError(dbError),
      userMessage: "An unexpected error occurred. Please try again.",
      logMessage: `Database error in ${context}: ${dbError.code} - ${dbError.message}`,
      fallbackAction: () => this.logGenericError(context, dbError)
    };
  }

  /**
   * Handle query optimization errors with fallback strategies
   */
  static handleQueryError(error: any, context: string, fallbackQuery?: () => Promise<any>): ErrorHandlingResult {
    const dbError = this.parseError(error);

    // JOIN query failures - use fallback separate queries
    if (dbError.code === 'PGRST200' && dbError.message?.includes('relationship')) {
      return {
        shouldRetry: false,
        userMessage: "Loading data with alternative method...",
        logMessage: `JOIN query failed in ${context}, using fallback: ${dbError.message}`,
        fallbackAction: fallbackQuery
      };
    }

    return this.handleDatabaseError(error, context);
  }

  /**
   * Handle infinite loop detection and prevention
   */
  static handleInfiniteLoop(context: string, lastExecutionTime: number): boolean {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;
    
    // Prevent execution if less than 1 second since last execution
    if (timeSinceLastExecution < 1000) {
      console.warn(`🔄 Infinite loop detected in ${context}, preventing execution`);
      
      toast({
        title: "Performance Warning",
        description: "Rapid repeated operations detected. Please wait a moment.",
        variant: "destructive",
      });
      
      return false; // Prevent execution
    }
    
    return true; // Allow execution
  }

  /**
   * Retry logic with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset retry count on success
        this.retryAttempts.delete(context);
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break; // Don't retry on last attempt
        }
        
        const errorResult = this.handleDatabaseError(error, context);
        
        if (!errorResult.shouldRetry) {
          break; // Don't retry if error is not retryable
        }
        
        // Wait before retrying
        const delay = this.RETRY_DELAYS[attempt] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        console.log(`⏳ Retrying ${context} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    this.retryAttempts.delete(context);
    throw lastError;
  }

  /**
   * Parse error object into standardized format
   */
  private static parseError(error: any): DatabaseError {
    if (typeof error === 'object' && error !== null) {
      return {
        code: error.code || 'UNKNOWN',
        message: error.message || 'Unknown error',
        details: error.details,
        hint: error.hint
      };
    }
    
    return {
      code: 'UNKNOWN',
      message: String(error),
    };
  }

  /**
   * Determine if error should be retried
   */
  private static shouldRetryError(error: DatabaseError): boolean {
    const retryableCodes = [
      'PGRST301', // Connection timeout
      '429',      // Rate limit
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];
    
    return retryableCodes.includes(error.code) || 
           error.message?.includes('timeout') ||
           error.message?.includes('connection');
  }

  /**
   * Log relationship errors for monitoring
   */
  private static logRelationshipError(context: string, error: DatabaseError): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      type: 'foreign_key_relationship',
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
    
    console.error('🔗 Foreign key relationship error:', errorLog);
    
    // Store in localStorage for debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('relationship_errors') || '[]');
      existingLogs.push(errorLog);
      
      // Keep only last 50 errors
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      localStorage.setItem('relationship_errors', JSON.stringify(existingLogs));
    } catch (e) {
      console.warn('Could not store relationship error log:', e);
    }
  }

  /**
   * Suggest page refresh for data integrity issues
   */
  private static suggestRefresh(): void {
    toast({
      title: "Data Integrity Issue",
      description: "Please refresh the page to resolve data synchronization issues.",
      variant: "destructive",
      action: {
        altText: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }

  /**
   * Schedule retry with delay
   */
  private static scheduleRetry(context: string, delay: number = 2000): void {
    setTimeout(() => {
      console.log(`🔄 Scheduled retry for ${context}`);
      // This would trigger a retry in the calling component
      // Implementation depends on the specific component architecture
    }, delay);
  }

  /**
   * Log generic errors
   */
  private static logGenericError(context: string, error: DatabaseError): void {
    console.error(`❌ Database error in ${context}:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create fallback display data when profile data is unavailable
   */
  static createFallbackProfileDisplay(userId: string): {
    display_name: string;
    avatar_url: string | null;
    initials: string;
  } {
    const shortId = userId.slice(0, 8);
    return {
      display_name: `User ${shortId}`,
      avatar_url: null,
      initials: shortId.slice(0, 2).toUpperCase()
    };
  }

  /**
   * Handle cache miss gracefully
   */
  static handleCacheMiss(userId: string, context: string): void {
    console.log(`📦 Cache miss for user ${userId} in ${context}`);
    
    // Could trigger background profile fetch here
    // For now, just log the miss for monitoring
  }
}