package ai.frameworkguard.sample;

/**
 * Sample Java Application for testing FrameworkGuard Agent.
 * 
 * This app:
 * 1. Prints "App running" every second
 * 2. After 10 seconds, deliberately throws a NullPointerException
 * 
 * Usage:
 *   # Compile
 *   javac -d target SampleJavaApp.java
 *   
 *   # Create JAR
 *   jar cfe target/sample-app.jar ai.frameworkguard.sample.SampleJavaApp -C target .
 *   
 *   # Run with FrameworkGuard Agent
 *   java -javaagent:frameworkguard-agent-1.0.0.jar=apiKey=YOUR_KEY,endpoint=http://localhost:8000 \
 *        -jar target/sample-app.jar
 */
public class SampleJavaApp {
    
    public static void main(String[] args) {
        System.out.println("╔═══════════════════════════════════════╗");
        System.out.println("║   Sample Java App for FrameworkGuard  ║");
        System.out.println("╚═══════════════════════════════════════╝");
        System.out.println();
        System.out.println("This app will throw a NullPointerException in 10 seconds...");
        System.out.println();
        
        // Run for 10 seconds
        for (int i = 1; i <= 10; i++) {
            System.out.println("[" + i + "/10] App running... (heap: " + 
                    getHeapUsedMB() + " MB, threads: " + Thread.activeCount() + ")");
            
            // Allocate some memory to make metrics interesting
            byte[] data = new byte[1024 * 1024]; // 1 MB
            
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        
        System.out.println();
        System.out.println(">>> Throwing NullPointerException now!");
        System.out.println();
        
        // Deliberately cause a NullPointerException
        triggerNullPointerException();
    }
    
    /**
     * Method that triggers a NullPointerException.
     * The stack trace will show this method name.
     */
    private static void triggerNullPointerException() {
        String nullString = null;
        // This will throw NullPointerException
        int length = nullString.length();
        System.out.println("Length: " + length); // Never reached
    }
    
    /**
     * Get current heap usage in MB.
     */
    private static long getHeapUsedMB() {
        Runtime runtime = Runtime.getRuntime();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        return usedMemory / (1024 * 1024);
    }
}
