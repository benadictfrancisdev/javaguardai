package ai.frameworkguard;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Instant;
import java.time.format.DateTimeFormatter;

/**
 * Captures uncaught exceptions and sends them to FrameworkGuard backend.
 * Installs a default uncaught exception handler while preserving any existing handler.
 */
public class ExceptionCapture implements Thread.UncaughtExceptionHandler {
    
    private final AgentConfig config;
    private final Thread.UncaughtExceptionHandler originalHandler;
    
    public ExceptionCapture(AgentConfig config) {
        this.config = config;
        this.originalHandler = Thread.getDefaultUncaughtExceptionHandler();
    }
    
    /**
     * Install the exception capture handler.
     */
    public void install() {
        Thread.setDefaultUncaughtExceptionHandler(this);
        System.out.println("[FrameworkGuard] Exception capture installed.");
    }
    
    @Override
    public void uncaughtException(Thread thread, Throwable throwable) {
        try {
            captureAndSendException(thread, throwable);
        } catch (Exception e) {
            // Never let our code prevent the exception from being handled
            System.err.println("[FrameworkGuard] Error capturing exception: " + e.getMessage());
        } finally {
            // Always call the original handler if it exists
            if (originalHandler != null) {
                originalHandler.uncaughtException(thread, throwable);
            } else {
                // Default behavior: print stack trace and exit
                System.err.println("Exception in thread \"" + thread.getName() + "\" ");
                throwable.printStackTrace();
            }
        }
    }
    
    /**
     * Capture exception details and send to backend.
     */
    private void captureAndSendException(Thread thread, Throwable throwable) {
        // Get exception class name
        String exceptionClass = throwable.getClass().getName();
        
        // Get exception message
        String message = throwable.getMessage();
        if (message == null) {
            message = "No message";
        }
        
        // Get stack trace as formatted string
        String stackTrace = getStackTraceString(throwable);
        
        // Get current JVM metrics
        double heapUsedMb = MetricsCollector.getCurrentHeapUsedMb();
        int threadCount = MetricsCollector.getCurrentThreadCount();
        
        // Get timestamp
        String timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        
        // Build JSON manually
        String json = String.format(
            "{\"api_key\":\"%s\",\"exception_class\":\"%s\",\"message\":\"%s\"," +
            "\"stack_trace\":\"%s\",\"heap_used_mb\":%.2f,\"thread_count\":%d,\"timestamp\":\"%s\"}",
            HttpSender.escapeJson(config.getApiKey()),
            HttpSender.escapeJson(exceptionClass),
            HttpSender.escapeJson(message),
            HttpSender.escapeJson(stackTrace),
            heapUsedMb,
            threadCount,
            timestamp
        );
        
        // Send to backend
        String url = config.getEndpoint() + "/api/exceptions";
        boolean success = HttpSender.post(url, json);
        
        if (config.isVerbose() || success) {
            System.out.println("[FrameworkGuard] Exception captured: " + exceptionClass + 
                    " (sent=" + success + ")");
        }
    }
    
    /**
     * Convert a Throwable's stack trace to a formatted string.
     */
    private String getStackTraceString(Throwable throwable) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        throwable.printStackTrace(pw);
        return sw.toString();
    }
    
    /**
     * Static method to manually report an exception.
     * Can be called from application code.
     */
    public static void reportException(AgentConfig config, Throwable throwable) {
        new ExceptionCapture(config).captureAndSendException(Thread.currentThread(), throwable);
    }
}
