package ai.frameworkguard;

import java.lang.instrument.Instrumentation;

/**
 * FrameworkGuard Java Agent
 * 
 * Automatically monitors Java applications for:
 * - Uncaught exceptions (sent to /api/exceptions)
 * - JVM metrics: heap, threads, GC (sent to /api/metrics every 30s)
 * 
 * Usage:
 *   java -javaagent:frameworkguard-agent.jar=apiKey=YOUR_KEY,endpoint=http://your-backend.com -jar app.jar
 * 
 * Arguments:
 *   apiKey   - (required) Your FrameworkGuard API key
 *   endpoint - (optional) Backend URL, default: http://localhost:8000
 *   interval - (optional) Metrics interval in seconds, default: 30
 *   verbose  - (optional) Enable debug logging, default: false
 */
public class FrameworkGuardAgent {
    
    private static final String VERSION = "1.0.0";
    private static AgentConfig config;
    private static MetricsCollector metricsCollector;
    private static Thread metricsThread;
    
    /**
     * JVM agent entry point (called before main()).
     */
    public static void premain(String args, Instrumentation inst) {
        initialize(args);
    }
    
    /**
     * Attach API entry point (for dynamic attach).
     */
    public static void agentmain(String args, Instrumentation inst) {
        initialize(args);
    }
    
    /**
     * Initialize the agent.
     */
    private static void initialize(String args) {
        System.out.println();
        System.out.println("╔══════════════════════════════════════════════════╗");
        System.out.println("║         FrameworkGuard AI Agent v" + VERSION + "          ║");
        System.out.println("║     AI-Powered Production Monitoring            ║");
        System.out.println("╚══════════════════════════════════════════════════╝");
        System.out.println();
        
        // Parse configuration
        config = AgentConfig.parse(args);
        
        // Validate configuration
        if (!config.isValid()) {
            System.err.println("[FrameworkGuard] ERROR: API key is required!");
            System.err.println("[FrameworkGuard] Usage: -javaagent:frameworkguard-agent.jar=apiKey=YOUR_KEY");
            System.err.println("[FrameworkGuard] Agent NOT started.");
            return;
        }
        
        // Set verbose mode for HTTP sender
        HttpSender.setVerbose(config.isVerbose());
        
        System.out.println("[FrameworkGuard] Configuration: " + config);
        
        // Start metrics collector on daemon thread
        startMetricsCollector();
        
        // Install exception capture
        installExceptionCapture();
        
        // Register shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[FrameworkGuard] Shutting down...");
            if (metricsCollector != null) {
                metricsCollector.stop();
            }
        }));
        
        System.out.println();
        System.out.println("[FrameworkGuard] Agent loaded. Monitoring started.");
        System.out.println("[FrameworkGuard] Endpoint: " + config.getEndpoint());
        System.out.println();
    }
    
    /**
     * Start the metrics collector on a background daemon thread.
     */
    private static void startMetricsCollector() {
        metricsCollector = new MetricsCollector(config);
        metricsThread = new Thread(metricsCollector, "FrameworkGuard-MetricsCollector");
        metricsThread.setDaemon(true); // Don't prevent JVM shutdown
        metricsThread.start();
    }
    
    /**
     * Install the uncaught exception handler.
     */
    private static void installExceptionCapture() {
        ExceptionCapture capture = new ExceptionCapture(config);
        capture.install();
    }
    
    /**
     * Get the current configuration (for programmatic access).
     */
    public static AgentConfig getConfig() {
        return config;
    }
    
    /**
     * Manually report an exception (can be called from application code).
     */
    public static void reportException(Throwable throwable) {
        if (config != null && config.isValid()) {
            ExceptionCapture.reportException(config, throwable);
        }
    }
}
