import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useCacheAnalytics } from "@/hooks/use-advanced-cache";
import { useRequestAnalytics } from "@/hooks/use-request-optimizer";
import { useRealtimeHealth } from "@/hooks/use-realtime-optimizer";
import { useRateLimit } from "@/hooks/use-rate-limiting";
import { Activity, Database, Globe, Zap, TrendingUp, AlertTriangle } from "lucide-react";

export function PerformanceDashboard() {
  const { analytics: cacheAnalytics, refreshAnalytics } = useCacheAnalytics();
  const { getStats: getRequestStats } = useRequestAnalytics();
  const { getConnectionHealth, getChannelStats, getAnalytics: getRealtimeAnalytics } = useRealtimeHealth();
  const { getRateLimitStats } = useRateLimit();

  const [requestStats, setRequestStats] = useState(getRequestStats());
  const [realtimeHealth, setRealtimeHealth] = useState(getConnectionHealth());
  const [channelStats, setChannelStats] = useState(getChannelStats());
  const [realtimeAnalytics, setRealtimeAnalytics] = useState(getRealtimeAnalytics());
  const [rateLimitStats, setRateLimitStats] = useState(getRateLimitStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setRequestStats(getRequestStats());
      setRealtimeHealth(getConnectionHealth());
      setChannelStats(getChannelStats());
      setRealtimeAnalytics(getRealtimeAnalytics());
      setRateLimitStats(getRateLimitStats());
      refreshAnalytics();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshAnalytics, getRequestStats, getConnectionHealth, getChannelStats, getRealtimeAnalytics, getRateLimitStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor system performance, caching, and real-time connections
          </p>
        </div>
        <Button onClick={refreshAnalytics} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(cacheAnalytics.hitRate * 100).toFixed(1)}%
            </div>
            <Progress value={cacheAnalytics.hitRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Request Efficiency</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((1 - requestStats.errorRate) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {requestStats.totalRequests} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realtime Health</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={realtimeHealth.connected ? "default" : "destructive"}>
                {realtimeHealth.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Latency: {realtimeHealth.latency}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtimeAnalytics.activeChannels}</div>
            <p className="text-xs text-muted-foreground">
              {realtimeAnalytics.messagesReceived} messages received
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cache" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cache">Cache Analytics</TabsTrigger>
          <TabsTrigger value="requests">Request Optimization</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Performance</TabsTrigger>
          <TabsTrigger value="ratelimit">Rate Limiting</TabsTrigger>
        </TabsList>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cache Statistics</CardTitle>
                <CardDescription>Performance metrics for the caching system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <Badge variant="secondary">{cacheAnalytics.totalRequests}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hits</span>
                    <Badge variant="default">{cacheAnalytics.hits}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Misses</span>
                    <Badge variant="outline">{cacheAnalytics.misses}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Warmups</span>
                    <Badge variant="secondary">{cacheAnalytics.warmups}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Compression Savings</span>
                    <Badge variant="default">{Math.round(cacheAnalytics.compressionSavings)} bytes</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hit Rate Breakdown</CardTitle>
                <CardDescription>Cache effectiveness over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Hit Rate</span>
                      <span>{(cacheAnalytics.hitRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={cacheAnalytics.hitRate * 100} className="mt-2" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    A high hit rate indicates effective caching strategy
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request Optimization</CardTitle>
                <CardDescription>Batching and deduplication metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <Badge variant="secondary">{requestStats.totalRequests}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Batched Requests</span>
                    <Badge variant="default">{requestStats.batchedRequests}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Deduplicated</span>
                    <Badge variant="default">{requestStats.deduplicatedRequests}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Requests</span>
                    <Badge variant={requestStats.failedRequests > 0 ? "destructive" : "secondary"}>
                      {requestStats.failedRequests}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Rates</CardTitle>
                <CardDescription>Efficiency improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Batching Rate</span>
                      <span>{(requestStats.batchingRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={requestStats.batchingRate * 100} className="mt-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Deduplication Rate</span>
                      <span>{(requestStats.duplicateRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={requestStats.duplicateRate * 100} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Connection Health</CardTitle>
                <CardDescription>Real-time connection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <Badge variant={realtimeHealth.connected ? "default" : "destructive"}>
                      {realtimeHealth.connected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency</span>
                    <Badge variant="secondary">{realtimeHealth.latency}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Reconnects</span>
                    <Badge variant="outline">{realtimeHealth.reconnectCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message Analytics</CardTitle>
                <CardDescription>Real-time message processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Messages Received</span>
                    <Badge variant="default">{realtimeAnalytics.messagesReceived}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Throttled Messages</span>
                    <Badge variant="secondary">{realtimeAnalytics.messagesThrottled}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Throttled Rate</span>
                      <span>{(realtimeAnalytics.throttledRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={realtimeAnalytics.throttledRate * 100} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ratelimit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Status</CardTitle>
              <CardDescription>API rate limiting and quotas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Keys</span>
                  <Badge variant="secondary">{rateLimitStats.totalKeys}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Configs</span>
                  <Badge variant="default">{rateLimitStats.configs.length}</Badge>
                </div>
                {rateLimitStats.configs.length === 0 && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>No rate limit violations detected</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}