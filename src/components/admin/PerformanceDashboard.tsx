import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PerformanceMonitor, 
  PerformanceDashboard as DashboardData,
  OperationStats 
} from '@/utils/performanceMonitor';
import { 
  Activity, 
  Clock, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export const PerformanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load dashboard data
  const loadDashboardData = () => {
    setLoading(true);
    try {
      const data = PerformanceMonitor.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthScoreVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No performance data available. Start using the application to see metrics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="flex items-center gap-2 h-11 px-4 sm:h-9"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-11 px-4 sm:h-9"
          >
            Auto-refresh
          </Button>
        </div>
      </div>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold">
                  {dashboardData.healthScore.toFixed(0)}%
                </span>
                <Badge variant={getHealthScoreVariant(dashboardData.healthScore)}>
                  {dashboardData.healthScore >= 90 ? 'Excellent' : 
                   dashboardData.healthScore >= 70 ? 'Good' : 'Needs Attention'}
                </Badge>
              </div>
              <Progress value={dashboardData.healthScore} className="h-2" />
            </div>
            {dashboardData.healthScore >= 90 ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total Operations</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {dashboardData.totalOperations.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Error Rate</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {dashboardData.overallErrorRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {formatDuration(dashboardData.averageResponseTime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Cache Hit Rate</span>
            </div>
            <div className="text-2xl font-bold mt-1">
              {dashboardData.cacheHitRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(dashboardData.slowOperations.length > 0 || dashboardData.errorProneOperations.length > 0) && (
        <div className="space-y-4">
          {dashboardData.slowOperations.length > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Slow Operations Detected:</strong> {dashboardData.slowOperations.length} operations 
                are taking longer than 2 seconds on average.
              </AlertDescription>
            </Alert>
          )}

          {dashboardData.errorProneOperations.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>High Error Rate:</strong> {dashboardData.errorProneOperations.length} operations 
                have error rates above 10%.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.recentOperations.map((operation, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg touch-manipulation">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{operation.operationName}</span>
                    <Badge variant={operation.successRate >= 95 ? "default" : "destructive"}>
                      {operation.successRate.toFixed(1)}% success
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {operation.totalOperations} operations • 
                    Last: {formatTimestamp(operation.lastOperation)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDuration(operation.averageDuration)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    avg ({formatDuration(operation.p95Duration)} p95)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Problem Operations */}
      {(dashboardData.slowOperations.length > 0 || dashboardData.errorProneOperations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardData.slowOperations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Slow Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.slowOperations.map((operation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 sm:p-2 border rounded touch-manipulation">
                      <span className="font-medium">{operation.operationName}</span>
                      <span className="text-red-600 font-medium">
                        {formatDuration(operation.averageDuration)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {dashboardData.errorProneOperations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Error-Prone Operations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.errorProneOperations.map((operation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 sm:p-2 border rounded touch-manipulation">
                      <span className="font-medium">{operation.operationName}</span>
                      <span className="text-red-600 font-medium">
                        {operation.successRate.toFixed(1)}% success
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};