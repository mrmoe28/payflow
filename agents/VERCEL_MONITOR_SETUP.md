# PayFlow Vercel Deployment Monitor Setup Guide

This guide walks through setting up the advanced Vercel deployment monitoring agent that automatically detects and fixes deployment errors for PayFlow.

## 🚀 Features

### Automatic Error Detection & Resolution
- **Real-time Monitoring**: Webhook-based instant error detection
- **Intelligent Classification**: AI-powered error categorization and severity assessment
- **Automatic Fixes**: Self-healing deployment issues without human intervention
- **PayFlow-Specific Knowledge**: Optimized for Next.js + tRPC + Prisma + NextAuth architecture

### Monitoring Capabilities
- Build error analysis and resolution
- Runtime error detection and fixes
- Environment variable validation and correction
- Database connection monitoring
- Performance issue identification
- Security vulnerability detection

### Alert & Notification System
- Multi-channel alerts (Slack, Email, Discord, PagerDuty)
- Severity-based escalation
- Maintenance window support
- Error trend analysis

## 📋 Prerequisites

1. **Vercel Account** with API access
2. **Python 3.8+** installed
3. **Vercel CLI** installed and configured
4. **PayFlow project** deployed on Vercel
5. **Server/VPS** to run the monitoring agent (optional for webhook mode)

## 🔧 Installation

### 1. Install Python Dependencies

```bash
cd agents/
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy configuration template
cp vercel-monitor-config.yaml.example vercel-monitor-config.yaml

# Set required environment variables
export VERCEL_TOKEN="your-vercel-api-token"
export VERCEL_TEAM_ID="your-team-id"  # Optional
export WEBHOOK_SECRET="your-webhook-secret"
```

### 3. Get Vercel API Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Create a new token with appropriate permissions:
   - `Read` access for deployments and projects
   - `Write` access for environment variables (for auto-fixes)
3. Copy the token to `VERCEL_TOKEN` environment variable

### 4. Configure Webhook (Optional but Recommended)

For real-time monitoring, set up Vercel webhooks:

1. Go to your PayFlow project in Vercel dashboard
2. Navigate to **Settings → Git → Deploy Hooks**
3. Add webhook URL: `https://your-server.com/webhook/vercel`
4. Select events:
   - `deployment.created`
   - `deployment.ready`
   - `deployment.error` 
   - `deployment.canceled`

## 🚦 Usage Modes

### Mode 1: Interactive Analysis

Run one-time deployment analysis:

```bash
python3 payflow-vercel-deployment-monitor-agent.py
```

**Interactive Options:**
1. **Health Check** - Comprehensive deployment health analysis
2. **Deployment Analysis** - Analyze specific deployment for errors
3. **Best Practices** - View Vercel optimization recommendations
4. **Continuous Monitoring** - Start background monitoring loop

### Mode 2: Webhook Server (Recommended)

Run real-time webhook monitoring server:

```bash
# Start webhook server
python3 webhook-monitor.py --port 3001

# With debug mode
python3 webhook-monitor.py --port 3001 --debug
```

### Mode 3: Background Service

Run as a system service for production:

```bash
# Create systemd service
sudo cp vercel-monitor.service /etc/systemd/system/
sudo systemctl enable vercel-monitor
sudo systemctl start vercel-monitor

# Check status
sudo systemctl status vercel-monitor
```

## 🔍 Monitoring Dashboard

Access monitoring dashboard at:
- **Status**: `http://localhost:3001/status`
- **Health**: `http://localhost:3001/health`

### Dashboard Features
- Recent deployments status
- Error history and trends
- Auto-fix success rate
- Performance metrics
- Alert status

## 🛠 Automatic Fixes

The agent can automatically fix these common issues:

### Environment Variable Issues
- Missing `NEXTAUTH_SECRET` → Generates secure secret
- Incorrect `NEXTAUTH_URL` → Sets to deployment URL
- Missing database variables → Prompts for configuration

### Prisma/Database Issues
- Missing `prisma generate` → Adds to build script
- Connection pool exhaustion → Adjusts configuration
- Migration failures → Provides fix suggestions

### Build Issues
- TypeScript compilation errors → Provides fix guidance
- Missing dependencies → Attempts resolution
- tRPC configuration errors → Auto-corrects common patterns

### Performance Issues
- Bundle size optimization suggestions
- Memory usage optimization
- Function timeout adjustments

## 📊 Error Classification

### Severity Levels
- **CRITICAL**: Deployment completely broken (auto-rollback triggered)
- **HIGH**: Major functionality impaired (immediate alerts)
- **MEDIUM**: Partial functionality affected (standard alerts)
- **LOW**: Minor issues or warnings (logged only)

### Error Categories
- **BUILD**: Compilation, bundling, dependency issues
- **RUNTIME**: API failures, crashes, timeouts
- **ENVIRONMENT**: Configuration, secrets, variables
- **DATABASE**: Connection, query, migration issues
- **AUTHENTICATION**: OAuth, session, security problems
- **PERFORMANCE**: Speed, memory, optimization issues

## 🔔 Alert Configuration

### Slack Integration

```yaml
alerts:
  channels:
    slack:
      enabled: true
      webhook_url: "${SLACK_WEBHOOK_URL}"
      channel: "#deployments"
```

### Email Alerts

```yaml
alerts:
  channels:
    email:
      enabled: true
      smtp_host: "smtp.gmail.com"
      smtp_port: 587
      username: "${SMTP_USERNAME}"
      password: "${SMTP_PASSWORD}"
      to_addresses: ["admin@payflow.com"]
```

### Discord Integration

```yaml
alerts:
  channels:
    discord:
      enabled: true
      webhook_url: "${DISCORD_WEBHOOK_URL}"
```

## 📈 Advanced Configuration

### Custom Error Patterns

Add PayFlow-specific error patterns:

```python
custom_patterns = {
    ErrorCategory.BUILD: {
        r"PayFlow.*configuration.*error": {
            "severity": ErrorSeverity.HIGH,
            "fixes": ["Check PayFlow configuration files"],
            "auto_fixable": True
        }
    }
}
```

### Performance Thresholds

```yaml
payflow:
  performance:
    max_build_time: 300  # 5 minutes
    max_function_duration: 10  # 10 seconds
    max_memory_usage: 512  # MB
```

### Maintenance Windows

```yaml
maintenance:
  windows:
    daily:
      start: "02:00"  # UTC
      end: "04:00"    # UTC
```

## 🔒 Security

### Webhook Signature Verification

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)
```

### API Rate Limiting

The agent includes built-in rate limiting to prevent API abuse:
- 60 requests per minute to Vercel API
- Exponential backoff on errors
- Request queuing for burst handling

## 📝 Logging

Logs are written to:
- **Console**: Real-time monitoring output
- **File**: `logs/vercel-monitor.log` (with rotation)
- **Structured**: JSON format for log aggregation

### Log Levels
- **DEBUG**: Detailed execution information
- **INFO**: General operational messages
- **WARNING**: Potential issues identified
- **ERROR**: Error conditions that need attention
- **CRITICAL**: Severe errors requiring immediate action

## 🧪 Testing

### Test Webhook Integration

```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/webhook/vercel \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deployment.error",
    "payload": {
      "deploymentId": "test-123",
      "errorMessage": "Build failed"
    }
  }'
```

### Test Auto-Fix Mechanisms

```bash
# Simulate environment variable error
python3 -c "
from payflow_vercel_deployment_monitor_agent import *
agent = PayFlowVercelDeploymentMonitor()
error = DeploymentError(
    category=ErrorCategory.ENVIRONMENT,
    severity=ErrorSeverity.HIGH,
    message='Environment variable NEXTAUTH_SECRET not found',
    log_excerpt='',
    timestamp=datetime.datetime.now(),
    deployment_id='test',
    suggested_fixes=['Set NEXTAUTH_SECRET'],
    auto_fixable=True
)
result = agent.apply_automatic_fix(error)
print(f'Auto-fix result: {result}')
"
```

## 🚨 Troubleshooting

### Common Issues

**Agent won't start:**
- Check `VERCEL_TOKEN` is set correctly
- Verify Python dependencies are installed
- Check network connectivity to Vercel API

**Webhooks not received:**
- Verify webhook URL is publicly accessible
- Check firewall settings allow incoming HTTP
- Validate webhook secret configuration

**Auto-fixes not working:**
- Ensure agent has write permissions to project files
- Check Vercel API permissions include environment variable access
- Verify auto-fix is enabled in configuration

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with verbose output
python3 webhook-monitor.py --debug
```

## 📚 Best Practices

### Production Deployment
1. Run agent on reliable server/VPS
2. Use process manager (PM2, systemd)
3. Enable log rotation
4. Set up monitoring for the monitor (meta-monitoring)
5. Regular health checks and updates

### Security Hardening
1. Use webhook signature verification
2. Implement IP whitelisting
3. Regular API token rotation
4. Secure log storage
5. Encrypted configuration files

### Performance Optimization
1. Adjust monitoring intervals based on deployment frequency
2. Use connection pooling for database checks
3. Implement caching for repeated API calls
4. Archive old deployment data regularly

---

**PayFlow Vercel Monitor** - Autonomous deployment error detection and resolution system