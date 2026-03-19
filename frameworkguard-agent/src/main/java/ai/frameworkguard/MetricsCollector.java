package ai.frameworkguard;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Collects JVM metrics and sends them to FrameworkGuard backend.
 * Runs on a background daemon thread.
 */
public class MetricsCollector implements Runnable {
    
    private final AgentConfig config;
    private final MemoryMXBean memoryBean;
    private final ThreadMXBean threadBean;
    private final RuntimeMXBean runtimeBean;
    private final List<GarbageCollectorMXBean> gcBeans;
    
    private volatile boolean running = true;
    
    public MetricsCollector(AgentConfig config) {
        this.config = config;
        this.memoryBean = ManagementFactory.getMemoryMXBean();
        this.threadBean = ManagementFactory.getThreadMXBean();
        this.runtimeBean = ManagementFactory.getRuntimeMXBean();
        this.gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
    }
    
    @Override
    public void run() {
        System.out.println("[FrameworkGuard] Metrics collector started. Interval: " + 
                config.getMetricsIntervalSeconds() + " seconds");
        
        while (running) {
            try {
                collectAndSendMetrics();
                Thread.sleep(config.getMetricsIntervalSeconds() * 1000L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                System.err.println("[FrameworkGuard] Error collecting metrics: " + e.getMessage());
                if (config.isVerbose()) {
                    e.printStackTrace();
                }
            }
        }
        
        System.out.println("[FrameworkGuard] Metrics collector stopped.");
    }
    
    /**
     * Collect current JVM metrics and send to backend.
     */
    private void collectAndSendMetrics() {
        // Get heap memory
        MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
        long heapUsedBytes = heapUsage.getUsed();
        long heapMaxBytes = heapUsage.getMax();
        
        // Convert to MB
        double heapUsedMb = heapUsedBytes / (1024.0 * 1024.0);
        double heapMaxMb = heapMaxBytes > 0 ? heapMaxBytes / (1024.0 * 1024.0) : heapUsedMb * 2;
        
        // Get thread count
        int threadCount = threadBean.getThreadCount();
        
        // Get GC count (sum of all collectors)
        long gcCount = 0;
        for (GarbageCollectorMXBean gcBean : gcBeans) {
            long count = gcBean.getCollectionCount();
            if (count > 0) {
                gcCount += count;
            }
        }
        
        // Get JVM uptime
        long uptimeMs = runtimeBean.getUptime();
        
        // Get timestamp
        String timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        
        // Build JSON manually (no external dependencies)
        String json = String.format(
            "{\"api_key\":\"%s\",\"heap_used_mb\":%.2f,\"heap_max_mb\":%.2f," +
            "\"thread_count\":%d,\"gc_count\":%d,\"jvm_uptime_ms\":%d,\"timestamp\":\"%s\"}",
            HttpSender.escapeJson(config.getApiKey()),
            heapUsedMb,
            heapMaxMb,
            threadCount,
            gcCount,
            uptimeMs,
            timestamp
        );
        
        // Send to backend
        String url = config.getEndpoint() + "/api/metrics";
        boolean success = HttpSender.post(url, json);
        
        if (config.isVerbose()) {
            System.out.println("[FrameworkGuard] Metrics sent: heap=" + 
                    String.format("%.1f", heapUsedMb) + "MB, threads=" + threadCount + 
                    ", gc=" + gcCount + ", success=" + success);
        }
    }
    
    /**
     * Stop the metrics collector.
     */
    public void stop() {
        running = false;
    }
    
    /**
     * Get current heap usage in MB (static utility method).
     */
    public static double getCurrentHeapUsedMb() {
        MemoryUsage heapUsage = ManagementFactory.getMemoryMXBean().getHeapMemoryUsage();
        return heapUsage.getUsed() / (1024.0 * 1024.0);
    }
    
    /**
     * Get current thread count (static utility method).
     */
    public static int getCurrentThreadCount() {
        return ManagementFactory.getThreadMXBean().getThreadCount();
    }
}
