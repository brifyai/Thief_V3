'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHealthCheck, SystemHealth, HealthCheckResult } from '@/lib/health-check';
import { SuspenseWrapper } from '@/components/common/SuspenseWrapper';
import { 
  Activity, 
  Database, 
  Cloud, 
  Cpu, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Clock,
  Zap,
  Server
} from 'lucide-react';

interface ServiceStatusProps {
  name: string;
  result: HealthCheckResult;
  icon: React.ReactNode;
}

const ServiceStatus: React.FC<ServiceStatusProps> = ({ name, result, icon }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${getStatusColor(result.status)} bg-opacity-10`}>
          {icon}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">{name}</span>
            {getStatusIcon(result.status)}
          </div>
          <div className="text-sm text-gray-500">
            Response time: {result.responseTime}ms
          </div>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={result.status === 'healthy' ? 'default' : 'destructive'}>
          {result.status}
        </Badge>
        <div className="text-xs text-gray-400 mt-1">
          {new Date(result.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

const SystemHealthDashboard: React.FC = () => {
  const { health, loading, error, checkHealth } = useHealthCheck();
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkHealth();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, checkHealth]);

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'api': return <Server className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'external-services': return <Cloud className="h-4 w-4" />;
      case 'memory': return <Cpu className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading && !health) {
    return (
      <SuspenseWrapper>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </SuspenseWrapper>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Error loading system health: {error}</span>
          </div>
          <Button 
            onClick={checkHealth} 
            variant="outline" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <SuspenseWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <Activity className="h-6 w-6" />
              <span>System Health</span>
            </h1>
            <p className="text-gray-600">Real-time monitoring of system components</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-blue-50 border-blue-200' : ''}
            >
              <Clock className="h-4 w-4 mr-2" />
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button onClick={checkHealth} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        {health && (
          <>
            {/* Overall Status */}
            <Card className={`border-2 ${getOverallStatusColor(health.overall)}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Overall System Status</span>
                  <Badge variant={health.overall === 'healthy' ? 'default' : 'destructive'} className="text-sm">
                    {health.overall.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Uptime: {formatUptime(health.uptime / 1000)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4" />
                    <span className="text-sm">Version: {health.version}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Last check: {new Date(health.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(health.services).map(([name, result]) => (
                    <ServiceStatus
                      key={name}
                      name={name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      result={result}
                      icon={getServiceIcon(name)}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(health.services).map(([name, result]) => (
                      <div key={name} className="border-l-4 border-gray-200 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{name.replace('-', ' ')}</span>
                          <Badge variant="outline">{result.responseTime}ms</Badge>
                        </div>
                        
                        {result.details && (
                          <div className="text-sm text-gray-600 space-y-1">
                            {Object.entries(result.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                <span className="font-mono">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {result.error && (
                          <div className="text-sm text-red-600 mt-2">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Services</p>
                      <p className="text-2xl font-bold">{Object.keys(health.services).length}</p>
                    </div>
                    <Server className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Healthy</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Object.values(health.services).filter(s => s.status === 'healthy').length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Degraded</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {Object.values(health.services).filter(s => s.status === 'degraded').length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Unhealthy</p>
                      <p className="text-2xl font-bold text-red-600">
                        {Object.values(health.services).filter(s => s.status === 'unhealthy').length}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </SuspenseWrapper>
  );
};

export default SystemHealthDashboard;