import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

interface StatusResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  latencyMs?: number;
}

const pretty = (v: any) => JSON.stringify(v, null, 2);

const SystemStatus: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<StatusResult>({ ok: false });
  const [healthCheck, setHealthCheck] = useState<StatusResult>({ ok: false });
  const [mapboxStatus, setMapboxStatus] = useState<StatusResult>({ ok: false });
  const [authStatus, setAuthStatus] = useState<StatusResult>({ ok: false });

  const runChecks = async () => {
    setLoading(true);
    try {
      // Auth/session check
      const t0 = performance.now();
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      const t1 = performance.now();
      setAuthStatus({ ok: !sessionErr, data: { loggedIn: !!sessionRes.session }, error: sessionErr?.message, latencyMs: Math.round(t1 - t0) });

      // System status function
      const s0 = performance.now();
      const sys = await supabase.functions.invoke("system-status");
      const s1 = performance.now();
      setSystemStatus({ ok: !sys.error, data: sys.data, error: (sys.error as any)?.message, latencyMs: Math.round(s1 - s0) });

      // Health check function
      const h0 = performance.now();
      const health = await supabase.functions.invoke("health-check");
      const h1 = performance.now();
      setHealthCheck({ ok: !health.error, data: health.data, error: (health.error as any)?.message, latencyMs: Math.round(h1 - h0) });

      // Mapbox token check
      const m0 = performance.now();
      const map = await supabase.functions.invoke("get-mapbox-token");
      const m1 = performance.now();
      setMapboxStatus({ ok: !map.error && !!map.data?.token, data: { hasToken: !!map.data?.token }, error: (map.error as any)?.message || (!map.data?.token ? "MAPBOX_PUBLIC_TOKEN not configured" : undefined), latencyMs: Math.round(m1 - m0) });
    } catch (e: any) {
      console.error("SystemStatus checks failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = "System Status | One More Mile";
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Status</h1>
            <p className="text-muted-foreground">Quick diagnostics for core services</p>
          </div>
          <Button onClick={runChecks} disabled={loading}>{loading ? "Running…" : "Re-run checks"}</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Authentication</span>
                <span className={authStatus.ok ? "text-green-600" : "text-destructive"}>{authStatus.ok ? "OK" : "Error"}</span>
              </div>
              <div className="text-sm text-muted-foreground">Logged in: {String((authStatus.data as any)?.loggedIn)}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>System Function</span>
                <span className={systemStatus.ok ? "text-green-600" : "text-destructive"}>{systemStatus.ok ? "OK" : "Error"}</span>
              </div>
              <div className="text-sm text-muted-foreground">Latency: {systemStatus.latencyMs ?? "-"} ms</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Health Check</span>
                <span className={healthCheck.ok ? "text-green-600" : "text-destructive"}>{healthCheck.ok ? "OK" : "Error"}</span>
              </div>
              <div className="text-sm text-muted-foreground">Latency: {healthCheck.latencyMs ?? "-"} ms</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Mapbox Token</span>
                <span className={mapboxStatus.ok ? "text-green-600" : "text-destructive"}>{mapboxStatus.ok ? "OK" : "Missing"}</span>
              </div>
              <div className="text-sm text-muted-foreground">Has token: {String((mapboxStatus.data as any)?.hasToken)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">System Status</h3>
              {systemStatus.ok ? (
                <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-md overflow-auto">{pretty(systemStatus.data)}</pre>
              ) : (
                <Alert variant="destructive"><AlertDescription>{systemStatus.error || "Unavailable"}</AlertDescription></Alert>
              )}
            </div>
            <Separator />
            <div>
              <h3 className="font-medium mb-2">Health Check</h3>
              {healthCheck.ok ? (
                <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-md overflow-auto">{pretty(healthCheck.data)}</pre>
              ) : (
                <Alert variant="destructive"><AlertDescription>{healthCheck.error || "Unavailable"}</AlertDescription></Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemStatus;
