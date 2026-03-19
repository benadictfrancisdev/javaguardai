# FrameworkGuard Java Agent

A lightweight Java agent that automatically monitors your Java applications and sends exception reports and JVM metrics to FrameworkGuard AI for analysis.

## Features

- **Automatic Exception Capture**: Catches all uncaught exceptions and sends stack traces
- **JVM Metrics Collection**: Heap usage, thread count, GC stats sent every 30 seconds
- **Zero Code Changes**: Just add the agent to your JVM args
- **Minimal Overhead**: Uses only standard Java libraries
- **Non-Intrusive**: Never crashes your application, even if the backend is unavailable

## Quick Start

### 1. Build the Agent

```bash
cd frameworkguard-agent
mvn clean package
```

The agent JAR will be at `target/frameworkguard-agent-1.0.0.jar`

### 2. Get Your API Key

1. Go to your FrameworkGuard dashboard
2. Navigate to Settings
3. Copy your API key (starts with `fg_`)

### 3. Run Your Application with the Agent

```bash
java -javaagent:frameworkguard-agent-1.0.0.jar=apiKey=YOUR_API_KEY,endpoint=https://your-backend.com \
     -jar your-application.jar
```

## Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `apiKey` | Yes | - | Your FrameworkGuard API key |
| `endpoint` | No | `http://localhost:8000` | Backend URL |
| `interval` | No | `30` | Metrics collection interval (seconds) |
| `verbose` | No | `false` | Enable debug logging |

### Examples

```bash
# Minimal (local backend)
java -javaagent:agent.jar=apiKey=fg_abc123 -jar app.jar

# Production
java -javaagent:agent.jar=apiKey=fg_abc123,endpoint=https://api.frameworkguard.ai -jar app.jar

# Debug mode with 60s metrics interval
java -javaagent:agent.jar=apiKey=fg_abc123,endpoint=https://api.example.com,interval=60,verbose=true -jar app.jar
```

## What Gets Sent

### Exception Reports (`POST /api/exceptions`)

```json
{
  "api_key": "fg_your_key",
  "exception_class": "java.lang.NullPointerException",
  "message": "Cannot invoke method on null object",
  "stack_trace": "java.lang.NullPointerException: ...\n  at com.example.Service.process(Service.java:42)\n  ...",
  "heap_used_mb": 512.5,
  "thread_count": 48,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### JVM Metrics (`POST /api/metrics`)

```json
{
  "api_key": "fg_your_key",
  "heap_used_mb": 512.5,
  "heap_max_mb": 1024.0,
  "thread_count": 48,
  "gc_count": 125,
  "jvm_uptime_ms": 3600000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Testing with Sample App

```bash
# Build sample app
cd frameworkguard-agent
mvn clean package

# Run with agent (replace with your API key and endpoint)
java -javaagent:target/frameworkguard-agent-1.0.0.jar=apiKey=fg_your_key,endpoint=https://your-backend.com,verbose=true \
     -cp target/classes ai.frameworkguard.sample.SampleJavaApp
```

The sample app will:
1. Print status every second for 10 seconds
2. Throw a NullPointerException
3. The agent will capture and send the exception

## Programmatic Usage

You can also manually report exceptions in your code:

```java
import ai.frameworkguard.FrameworkGuardAgent;

try {
    riskyOperation();
} catch (Exception e) {
    FrameworkGuardAgent.reportException(e);
    throw e; // Re-throw if needed
}
```

## Troubleshooting

### Agent not starting
- Check that `apiKey` is provided
- Look for `[FrameworkGuard]` messages in console

### Exceptions not being captured
- Verify the backend is reachable
- Enable `verbose=true` to see HTTP responses
- Check backend logs for incoming requests

### High memory usage
- Reduce `interval` if metrics are causing issues
- The agent itself uses minimal memory (<1MB)

## Building from Source

Requirements:
- Java 11+
- Maven 3.6+

```bash
git clone https://github.com/your-org/frameworkguard-agent.git
cd frameworkguard-agent
mvn clean package
```

## License

MIT License
