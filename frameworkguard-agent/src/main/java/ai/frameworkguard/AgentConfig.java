package ai.frameworkguard;

/**
 * Configuration parser for FrameworkGuard Agent.
 * Parses agent arguments in format: apiKey=KEY,endpoint=URL
 */
public class AgentConfig {
    
    private static final String DEFAULT_ENDPOINT = "http://localhost:8000";
    private static final int DEFAULT_METRICS_INTERVAL = 30; // seconds
    
    private String apiKey;
    private String endpoint;
    private int metricsIntervalSeconds;
    private boolean verbose;
    
    public AgentConfig() {
        this.endpoint = DEFAULT_ENDPOINT;
        this.metricsIntervalSeconds = DEFAULT_METRICS_INTERVAL;
        this.verbose = false;
    }
    
    /**
     * Parse agent arguments string.
     * Format: apiKey=YOUR_KEY,endpoint=http://your-backend.com,interval=30,verbose=true
     * 
     * @param args The agent arguments string
     * @return Parsed AgentConfig
     */
    public static AgentConfig parse(String args) {
        AgentConfig config = new AgentConfig();
        
        if (args == null || args.trim().isEmpty()) {
            return config;
        }
        
        String[] pairs = args.split(",");
        for (String pair : pairs) {
            String[] keyValue = pair.trim().split("=", 2);
            if (keyValue.length != 2) {
                continue;
            }
            
            String key = keyValue[0].trim().toLowerCase();
            String value = keyValue[1].trim();
            
            switch (key) {
                case "apikey":
                case "api_key":
                case "key":
                    config.apiKey = value;
                    break;
                case "endpoint":
                case "url":
                case "server":
                    config.endpoint = value;
                    // Remove trailing slash if present
                    if (config.endpoint.endsWith("/")) {
                        config.endpoint = config.endpoint.substring(0, config.endpoint.length() - 1);
                    }
                    break;
                case "interval":
                case "metrics_interval":
                    try {
                        config.metricsIntervalSeconds = Integer.parseInt(value);
                    } catch (NumberFormatException e) {
                        // Keep default
                    }
                    break;
                case "verbose":
                case "debug":
                    config.verbose = Boolean.parseBoolean(value);
                    break;
            }
        }
        
        return config;
    }
    
    public String getApiKey() {
        return apiKey;
    }
    
    public String getEndpoint() {
        return endpoint;
    }
    
    public int getMetricsIntervalSeconds() {
        return metricsIntervalSeconds;
    }
    
    public boolean isVerbose() {
        return verbose;
    }
    
    public boolean isValid() {
        return apiKey != null && !apiKey.isEmpty();
    }
    
    @Override
    public String toString() {
        return "AgentConfig{" +
                "apiKey='" + (apiKey != null ? apiKey.substring(0, Math.min(8, apiKey.length())) + "..." : "null") + '\'' +
                ", endpoint='" + endpoint + '\'' +
                ", metricsIntervalSeconds=" + metricsIntervalSeconds +
                ", verbose=" + verbose +
                '}';
    }
}
