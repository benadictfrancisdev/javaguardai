package ai.frameworkguard;

import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * HTTP client for sending data to FrameworkGuard backend.
 * Uses only java.net classes - no external dependencies.
 * All operations are wrapped in try-catch to never crash the application.
 */
public class HttpSender {
    
    private static final int CONNECT_TIMEOUT_MS = 5000; // 5 seconds
    private static final int READ_TIMEOUT_MS = 5000;    // 5 seconds
    private static final String CONTENT_TYPE = "application/json";
    private static final String USER_AGENT = "FrameworkGuard-Agent/1.0.0";
    
    private static boolean verbose = false;
    
    public static void setVerbose(boolean v) {
        verbose = v;
    }
    
    /**
     * Send a POST request with JSON body.
     * Never throws exceptions - all errors are caught and logged.
     * 
     * @param urlString The full URL to POST to
     * @param jsonBody The JSON string to send
     * @return true if successful (2xx response), false otherwise
     */
    public static boolean post(String urlString, String jsonBody) {
        HttpURLConnection connection = null;
        
        try {
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            
            // Configure connection
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            
            // Set headers
            connection.setRequestProperty("Content-Type", CONTENT_TYPE);
            connection.setRequestProperty("User-Agent", USER_AGENT);
            connection.setRequestProperty("Accept", "application/json");
            
            // Write JSON body
            byte[] bodyBytes = jsonBody.getBytes(StandardCharsets.UTF_8);
            connection.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));
            
            try (OutputStream os = connection.getOutputStream()) {
                os.write(bodyBytes);
                os.flush();
            }
            
            // Read response
            int responseCode = connection.getResponseCode();
            
            if (responseCode >= 200 && responseCode < 300) {
                if (verbose) {
                    // Read response body for debugging
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                        StringBuilder response = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            response.append(line);
                        }
                        System.out.println("[FrameworkGuard] Response: " + response.toString());
                    }
                }
                return true;
            } else {
                // Read error body
                String errorBody = "";
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
                    StringBuilder error = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        error.append(line);
                    }
                    errorBody = error.toString();
                } catch (Exception e) {
                    // Ignore error reading error stream
                }
                
                System.err.println("[FrameworkGuard] Send failed: HTTP " + responseCode + " - " + errorBody);
                return false;
            }
            
        } catch (java.net.SocketTimeoutException e) {
            System.err.println("[FrameworkGuard] Send failed: Connection timeout");
            return false;
        } catch (java.net.ConnectException e) {
            System.err.println("[FrameworkGuard] Send failed: Cannot connect to " + urlString);
            return false;
        } catch (Exception e) {
            System.err.println("[FrameworkGuard] Send failed: " + e.getMessage());
            if (verbose) {
                e.printStackTrace();
            }
            return false;
        } finally {
            if (connection != null) {
                try {
                    connection.disconnect();
                } catch (Exception e) {
                    // Ignore
                }
            }
        }
    }
    
    /**
     * Escape a string for JSON.
     */
    public static String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        
        StringBuilder sb = new StringBuilder();
        for (char c : str.toCharArray()) {
            switch (c) {
                case '"':
                    sb.append("\\\"");
                    break;
                case '\\':
                    sb.append("\\\\");
                    break;
                case '\b':
                    sb.append("\\b");
                    break;
                case '\f':
                    sb.append("\\f");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (c < ' ') {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }
}
