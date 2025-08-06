// Performance monitoring utilities and Core Web Vitals tracking

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVitalsMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
    this.trackNavigationTiming();
  }

  // Initialize performance observers
  private initializeObservers() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          this.recordWebVital({
            name: 'LCP',
            value: lastEntry.startTime,
            rating: this.getRating('LCP', lastEntry.startTime),
            timestamp: Date.now(),
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            this.recordWebVital({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              rating: this.getRating('FID', entry.processingStart - entry.startTime),
              timestamp: Date.now(),
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          let clsValue = 0;
          const entries = entryList.getEntries();
          
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.recordWebVital({
            name: 'CLS',
            value: clsValue,
            rating: this.getRating('CLS', clsValue),
            timestamp: Date.now(),
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  // Track navigation timing
  private trackNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        
        if (navigation) {
          // First Contentful Paint
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          
          if (fcpEntry) {
            this.recordWebVital({
              name: 'FCP',
              value: fcpEntry.startTime,
              rating: this.getRating('FCP', fcpEntry.startTime),
              timestamp: Date.now(),
            });
          }

          // Time to First Byte
          this.recordWebVital({
            name: 'TTFB',
            value: navigation.responseStart - navigation.requestStart,
            rating: this.getRating('TTFB', navigation.responseStart - navigation.requestStart),
            timestamp: Date.now(),
          });

          // Custom metrics
          this.recordMetric({
            name: 'dom-content-loaded',
            value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            timestamp: Date.now(),
            metadata: { type: 'navigation' },
          });

          this.recordMetric({
            name: 'load-complete',
            value: navigation.loadEventEnd - navigation.loadEventStart,
            timestamp: Date.now(),
            metadata: { type: 'navigation' },
          });
        }
      }, 100);
    });
  }

  // Get rating based on thresholds
  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // Record custom performance metrics
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Log significant metrics
    if (metric.value > 1000) {
      console.warn(`Performance warning: ${metric.name} took ${metric.value.toFixed(2)}ms`);
    }
  }

  // Record Web Vitals
  private recordWebVital(vital: WebVitalsMetric) {
    this.webVitals.push(vital);
    
    // Log poor performing vitals
    if (vital.rating === 'poor') {
      console.warn(`Poor Web Vital: ${vital.name} = ${vital.value.toFixed(2)} (${vital.rating})`);
    }
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      metadata: { type: 'function' },
    });
    
    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.recordMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      metadata: { type: 'async-function' },
    });
    
    return result;
  }

  // Get performance summary
  getPerformanceSummary() {
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 60000); // Last minute
    const recentVitals = this.webVitals.filter(v => Date.now() - v.timestamp < 60000);

    return {
      metrics: recentMetrics,
      webVitals: recentVitals,
      summary: {
        totalMetrics: this.metrics.length,
        slowOperations: this.metrics.filter(m => m.value > 1000).length,
        averageResponseTime: recentMetrics.length > 0 
          ? recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length 
          : 0,
        webVitalsScore: this.calculateWebVitalsScore(recentVitals),
      },
    };
  }

  // Calculate overall Web Vitals score
  private calculateWebVitalsScore(vitals: WebVitalsMetric[]): number {
    if (vitals.length === 0) return 0;

    const scores = vitals.map(vital => {
      switch (vital.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 50;
        case 'poor': return 0;
        default: return 0;
      }
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility hooks and functions
export const measurePageLoad = () => {
  return performanceMonitor.measureAsyncFunction('page-load', async () => {
    return new Promise<void>(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  });
};

export const measureComponentRender = (componentName: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureFunction(
        `${componentName}.${propertyKey}`,
        () => originalMethod.apply(this, args)
      );
    };
    
    return descriptor;
  };
};