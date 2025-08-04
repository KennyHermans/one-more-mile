import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Checkbox } from "./checkbox";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error-handler";
import { 
  Download, 
  Calendar, 
  FileText, 
  BarChart3, 
  Users, 
  TrendingUp,
  Clock,
  Filter,
  Mail,
  RefreshCw
} from "lucide-react";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'analytics' | 'operational' | 'financial' | 'performance';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  isActive: boolean;
  lastGenerated?: string;
  nextScheduled?: string;
}

interface ExportConfiguration {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  selectedMetrics: string[];
  customFilters: {
    [key: string]: any;
  };
}

export function ComprehensiveReporting() {
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [exportConfig, setExportConfig] = useState<ExportConfiguration>({
    format: 'pdf',
    includeCharts: true,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    selectedMetrics: [],
    customFilters: {}
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const availableMetrics = [
    { id: 'booking_trends', name: 'Booking Trends', category: 'Analytics' },
    { id: 'sensei_performance', name: 'Sensei Performance', category: 'Performance' },
    { id: 'revenue_analysis', name: 'Revenue Analysis', category: 'Financial' },
    { id: 'customer_satisfaction', name: 'Customer Satisfaction', category: 'Performance' },
    { id: 'operational_efficiency', name: 'Operational Efficiency', category: 'Operational' },
    { id: 'conversion_funnels', name: 'Conversion Funnels', category: 'Analytics' },
    { id: 'demand_forecasting', name: 'Demand Forecasting', category: 'Analytics' },
    { id: 'backup_assignment_stats', name: 'Backup Assignment Stats', category: 'Operational' },
    { id: 'alert_management', name: 'Alert Management', category: 'Operational' },
    { id: 'geographic_distribution', name: 'Geographic Distribution', category: 'Analytics' }
  ];

  useEffect(() => {
    initializeReportTemplates();
  }, []);

  const initializeReportTemplates = async () => {
    try {
      setLoading(true);

      // Initialize default report templates
      const defaultTemplates: ReportTemplate[] = [
        {
          id: '1',
          name: 'Daily Operations Summary',
          description: 'Daily overview of platform activities, alerts, and key metrics',
          type: 'operational',
          frequency: 'daily',
          recipients: ['admin@onemile.com'],
          isActive: true,
          nextScheduled: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          name: 'Weekly Performance Report',
          description: 'Comprehensive weekly analysis of sensei performance and booking trends',
          type: 'performance',
          frequency: 'weekly',
          recipients: ['admin@onemile.com', 'analytics@onemile.com'],
          isActive: true,
          nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          name: 'Monthly Business Intelligence',
          description: 'Monthly strategic insights with predictive analytics and forecasting',
          type: 'analytics',
          frequency: 'monthly',
          recipients: ['admin@onemile.com', 'management@onemile.com'],
          isActive: true,
          nextScheduled: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          name: 'Quarterly Financial Summary',
          description: 'Quarterly revenue analysis, projections, and financial health metrics',
          type: 'financial',
          frequency: 'quarterly',
          recipients: ['admin@onemile.com', 'finance@onemile.com'],
          isActive: false,
          nextScheduled: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setReportTemplates(defaultTemplates);
      
      // Set default selected metrics
      setExportConfig(prev => ({
        ...prev,
        selectedMetrics: ['booking_trends', 'sensei_performance', 'revenue_analysis']
      }));

    } catch (error) {
      handleError(error, {
        component: 'ComprehensiveReporting',
        action: 'initializeTemplates'
      }, true, "Failed to load report templates");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (templateId?: string) => {
    try {
      setIsGenerating(true);

      // Fetch data for report generation
      const [
        { data: trips },
        { data: bookings },
        { data: senseis },
        { data: reviews },
        { data: alerts }
      ] = await Promise.all([
        supabase.from('trips').select('*').gte('created_at', exportConfig.dateRange.start).lte('created_at', exportConfig.dateRange.end),
        supabase.from('trip_bookings').select('*').gte('created_at', exportConfig.dateRange.start).lte('created_at', exportConfig.dateRange.end),
        supabase.from('sensei_profiles').select('*'),
        supabase.from('trip_reviews').select('*').gte('created_at', exportConfig.dateRange.start).lte('created_at', exportConfig.dateRange.end),
        supabase.from('admin_alerts').select('*').gte('created_at', exportConfig.dateRange.start).lte('created_at', exportConfig.dateRange.end)
      ]);

      // Generate comprehensive report data
      const reportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          dateRange: exportConfig.dateRange,
          metrics: exportConfig.selectedMetrics,
          templateId,
          format: exportConfig.format
        },
        analytics: generateAnalyticsData(trips || [], bookings || [], senseis || [], reviews || []),
        operational: generateOperationalData(alerts || [], bookings || []),
        performance: generatePerformanceData(senseis || [], reviews || [], bookings || []),
        financial: generateFinancialData(bookings || []),
        summary: generateExecutiveSummary(trips || [], bookings || [], senseis || [], alerts || [])
      };

      // Export report based on format
      await exportReportData(reportData, templateId);

      // Update template last generated time
      if (templateId) {
        setReportTemplates(prev => 
          prev.map(template => 
            template.id === templateId 
              ? { ...template, lastGenerated: new Date().toISOString() }
              : template
          )
        );
      }

      toast({
        title: "Report Generated",
        description: `Report has been generated and exported as ${exportConfig.format.toUpperCase()}`,
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReportData = async (reportData: any, templateId?: string) => {
    const template = templateId ? reportTemplates.find(t => t.id === templateId) : null;
    const fileName = template 
      ? `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
      : `Custom_Report_${new Date().toISOString().split('T')[0]}`;

    if (exportConfig.format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${fileName}.json`);
    } else if (exportConfig.format === 'csv') {
      const csvData = convertToCSV(reportData);
      const blob = new Blob([csvData], { type: 'text/csv' });
      downloadBlob(blob, `${fileName}.csv`);
    } else {
      // For PDF and Excel, we'll create a simple text representation
      const textData = generateTextReport(reportData);
      const blob = new Blob([textData], { type: 'text/plain' });
      downloadBlob(blob, `${fileName}.txt`);
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateAnalyticsData = (trips: any[], bookings: any[], senseis: any[], reviews: any[]) => ({
    totalTrips: trips.length,
    totalBookings: bookings.length,
    averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
    conversionRate: trips.length > 0 ? (bookings.filter(b => b.payment_status === 'paid').length / trips.length) * 100 : 0,
    popularDestinations: getPopularDestinations(trips),
    bookingTrends: getBookingTrends(bookings)
  });

  const generateOperationalData = (alerts: any[], bookings: any[]) => ({
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.priority === 'critical').length,
    resolvedAlerts: alerts.filter(a => a.is_resolved).length,
    averageResolutionTime: calculateAverageResolutionTime(alerts),
    paymentFailures: bookings.filter(b => b.payment_status === 'failed').length
  });

  const generatePerformanceData = (senseis: any[], reviews: any[], bookings: any[]) => ({
    totalSenseis: senseis.length,
    activeSenseis: senseis.filter(s => s.is_active).length,
    topPerformers: senseis.sort((a, b) => b.rating - a.rating).slice(0, 5),
    customerSatisfaction: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  });

  const generateFinancialData = (bookings: any[]) => {
    const paidBookings = bookings.filter(b => b.payment_status === 'paid');
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    
    return {
      totalRevenue,
      paidBookings: paidBookings.length,
      pendingPayments: bookings.filter(b => b.payment_status === 'pending').length,
      averageBookingValue: paidBookings.length > 0 ? totalRevenue / paidBookings.length : 0
    };
  };

  const generateExecutiveSummary = (trips: any[], bookings: any[], senseis: any[], alerts: any[]) => ({
    keyHighlights: [
      `${trips.length} total trips managed`,
      `${bookings.filter(b => b.payment_status === 'paid').length} successful bookings`,
      `${senseis.filter(s => s.is_active).length} active senseis`,
      `${alerts.filter(a => a.is_resolved).length} alerts resolved`
    ],
    recommendations: [
      'Continue monitoring sensei performance metrics',
      'Focus on improving booking conversion rates',
      'Optimize backup assignment automation'
    ]
  });

  // Helper functions
  const getPopularDestinations = (trips: any[]) => {
    const destinations: { [key: string]: number } = {};
    trips.forEach(trip => {
      if (trip.destination) {
        destinations[trip.destination] = (destinations[trip.destination] || 0) + 1;
      }
    });
    return Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count }));
  };

  const getBookingTrends = (bookings: any[]) => {
    const trends: { [key: string]: number } = {};
    bookings.forEach(booking => {
      const month = new Date(booking.created_at).toISOString().slice(0, 7);
      trends[month] = (trends[month] || 0) + 1;
    });
    return Object.entries(trends).map(([month, count]) => ({ month, count }));
  };

  const calculateAverageResolutionTime = (alerts: any[]) => {
    const resolvedAlerts = alerts.filter(a => a.is_resolved && a.resolved_at);
    if (resolvedAlerts.length === 0) return 0;
    
    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const created = new Date(alert.created_at).getTime();
      const resolved = new Date(alert.resolved_at).getTime();
      return sum + (resolved - created);
    }, 0);
    
    return totalTime / resolvedAlerts.length / (1000 * 60 * 60); // Convert to hours
  };

  const convertToCSV = (data: any) => {
    // Simple CSV conversion for analytics data
    const analytics = data.analytics;
    return [
      'Metric,Value',
      `Total Trips,${analytics.totalTrips}`,
      `Total Bookings,${analytics.totalBookings}`,
      `Average Rating,${analytics.averageRating.toFixed(2)}`,
      `Conversion Rate,${analytics.conversionRate.toFixed(2)}%`
    ].join('\n');
  };

  const generateTextReport = (data: any) => {
    return [
      `COMPREHENSIVE PLATFORM REPORT`,
      `Generated: ${data.metadata.generatedAt}`,
      `Date Range: ${data.metadata.dateRange.start} to ${data.metadata.dateRange.end}`,
      ``,
      `ANALYTICS SUMMARY:`,
      `- Total Trips: ${data.analytics.totalTrips}`,
      `- Total Bookings: ${data.analytics.totalBookings}`,
      `- Average Rating: ${data.analytics.averageRating.toFixed(2)}`,
      `- Conversion Rate: ${data.analytics.conversionRate.toFixed(2)}%`,
      ``,
      `OPERATIONAL METRICS:`,
      `- Total Alerts: ${data.operational.totalAlerts}`,
      `- Critical Alerts: ${data.operational.criticalAlerts}`,
      `- Resolution Rate: ${((data.operational.resolvedAlerts / data.operational.totalAlerts) * 100).toFixed(1)}%`,
      ``,
      `FINANCIAL OVERVIEW:`,
      `- Total Revenue: €${data.financial.totalRevenue.toLocaleString()}`,
      `- Paid Bookings: ${data.financial.paidBookings}`,
      `- Average Booking Value: €${data.financial.averageBookingValue.toFixed(0)}`,
      ``,
      `EXECUTIVE SUMMARY:`,
      ...data.summary.keyHighlights.map((highlight: string) => `- ${highlight}`),
      ``,
      `RECOMMENDATIONS:`,
      ...data.summary.recommendations.map((rec: string) => `- ${rec}`)
    ].join('\n');
  };

  const toggleTemplate = (templateId: string) => {
    setReportTemplates(prev => 
      prev.map(template => 
        template.id === templateId 
          ? { ...template, isActive: !template.isActive }
          : template
      )
    );
  };

  const toggleMetric = (metricId: string) => {
    setExportConfig(prev => ({
      ...prev,
      selectedMetrics: prev.selectedMetrics.includes(metricId)
        ? prev.selectedMetrics.filter(id => id !== metricId)
        : [...prev.selectedMetrics, metricId]
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            Comprehensive Reporting & Export
          </h2>
          <p className="text-muted-foreground">
            Generate detailed reports with scheduling and automated distribution
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => initializeReportTemplates()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => generateReport()} 
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate Custom Report'}
          </Button>
        </div>
      </div>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Export Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Export Format</Label>
              <Select 
                value={exportConfig.format} 
                onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="excel">Excel Workbook</SelectItem>
                  <SelectItem value="csv">CSV Data</SelectItem>
                  <SelectItem value="json">JSON Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={exportConfig.dateRange.start}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={exportConfig.dateRange.end}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="include-charts"
                checked={exportConfig.includeCharts}
                onCheckedChange={(checked) => setExportConfig(prev => ({ 
                  ...prev, 
                  includeCharts: checked as boolean 
                }))}
              />
              <Label htmlFor="include-charts">Include Charts</Label>
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <Label className="text-base font-medium">Select Metrics to Include</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-2">
              {availableMetrics.map((metric) => (
                <div key={metric.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={metric.id}
                    checked={exportConfig.selectedMetrics.includes(metric.id)}
                    onCheckedChange={() => toggleMetric(metric.id)}
                  />
                  <Label htmlFor={metric.id} className="text-sm">
                    {metric.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Report Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportTemplates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{template.name}</h4>
                    <Badge variant={template.isActive ? "default" : "outline"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="secondary">{template.frequency}</Badge>
                    <Badge variant="outline">{template.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {template.recipients.length} recipients
                    </span>
                    {template.lastGenerated && (
                      <span>Last: {new Date(template.lastGenerated).toLocaleString()}</span>
                    )}
                    {template.nextScheduled && (
                      <span>Next: {new Date(template.nextScheduled).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateReport(template.id)}
                    disabled={isGenerating}
                  >
                    Generate Now
                  </Button>
                  <Button
                    variant={template.isActive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleTemplate(template.id)}
                  >
                    {template.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}