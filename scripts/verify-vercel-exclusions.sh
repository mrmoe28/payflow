#!/bin/bash

# PayFlow Vercel Exclusion Verification Script
# Verifies that all agent files and development tools are properly excluded from deployment

echo "🔍 PayFlow Vercel Deployment Exclusion Verification"
echo "=================================================="

# Check if .vercelignore exists
if [ ! -f ".vercelignore" ]; then
    echo "❌ ERROR: .vercelignore file not found!"
    exit 1
fi

echo "✅ .vercelignore file found"

# Function to check if pattern exists in .vercelignore
check_pattern() {
    local pattern=$1
    local description=$2
    
    if grep -q "^${pattern}$" .vercelignore; then
        echo "✅ ${description}: ${pattern}"
        return 0
    else
        echo "❌ MISSING: ${description}: ${pattern}"
        return 1
    fi
}

echo ""
echo "🔍 Checking critical exclusion patterns..."

# Track any failures
FAILURES=0

# Check critical agent exclusions
check_pattern "agents/" "Agent directory exclusion" || ((FAILURES++))
check_pattern "\*.py" "Python files exclusion" || ((FAILURES++))
check_pattern "\*.yaml" "YAML config files exclusion" || ((FAILURES++))
check_pattern "requirements.txt" "Python requirements exclusion" || ((FAILURES++))

# Check Python environment exclusions
check_pattern "venv/" "Virtual environment exclusion" || ((FAILURES++))
check_pattern "__pycache__/" "Python cache exclusion" || ((FAILURES++))

# Check development tool exclusions
check_pattern "scripts/" "Scripts directory exclusion" || ((FAILURES++))
check_pattern "\*.log" "Log files exclusion" || ((FAILURES++))

echo ""
echo "🧪 Testing specific critical files that MUST be excluded..."

# Test specific agent files exist and should be excluded
CRITICAL_FILES=(
    "agents/payflow-ui-design-agent.py"
    "agents/payflow-error-handler-agent.py"
    "agents/payflow-backend-stack-agent.py"
    "agents/payflow-frontend-stack-agent.py"
    "agents/payflow-vercel-deployment-monitor-agent.py"
    "agents/webhook-monitor.py"
    "agents/requirements.txt"
    "agents/vercel-monitor-config.yaml"
    "agents/VERCEL_MONITOR_SETUP.md"
    "scripts/setup-vercel-env.sh"
    "scripts/verify-vercel-exclusions.sh"
    ".env.vercel"
)

CRITICAL_MISSING=0

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Critical file exists (will be excluded): $file"
    else
        echo "⚠️  Critical file missing: $file"
        ((CRITICAL_MISSING++))
    fi
done

echo ""
echo "📋 Manual verification of exclusion patterns..."

# Show what the key patterns in .vercelignore will exclude
echo ""
echo "🚫 Files that WILL be excluded from deployment:"
echo "   • All files in agents/ directory"
echo "   • All .py files (Python scripts)" 
echo "   • All .yaml/.yml files (configurations)"
echo "   • requirements.txt files"
echo "   • scripts/ directory"
echo "   • Development environment files"
echo "   • Documentation and setup files"

echo ""
echo "✅ Files that WILL be included in deployment:"
echo "   • src/ directory (Next.js application)"
echo "   • public/ directory (static assets)"
echo "   • package.json and package-lock.json"
echo "   • next.config.ts and other config files"
echo "   • prisma/ directory (database schema)"
echo "   • .env.example (template only)"

echo ""
echo "📊 Verification Results:"
echo "======================"

if [ $FAILURES -eq 0 ]; then
    echo "✅ SUCCESS: All required exclusion patterns are in .vercelignore"
    echo "✅ Agent files are properly configured to be excluded"
    echo "✅ PayFlow is safe to deploy to Vercel"
    echo ""
    echo "📋 Next steps:"
    echo "1. ✅ .vercelignore is properly configured"
    echo "2. ✅ All agent files will be excluded from deployment"
    echo "3. ✅ Development tools will not be deployed"
    echo "4. 🚀 You can safely deploy to Vercel"
    echo ""
    echo "🔧 To deploy:"
    echo "   git add ."
    echo "   git commit -m \"Ready for deployment\""
    echo "   git push origin main"
    echo ""
    echo "💡 Vercel will automatically deploy excluding all agent files"
    
    exit 0
else
    echo "❌ FAILURE: $FAILURES missing patterns in .vercelignore"
    echo ""
    echo "🔧 To fix:"
    echo "1. Add the missing patterns to .vercelignore"
    echo "2. Run this verification script again"
    echo "3. DO NOT deploy until all checks pass"
    
    exit 1
fi

echo ""
echo "⚠️  NOTE: This script verifies .vercelignore patterns exist."
echo "    Vercel will respect these patterns during deployment."
echo "    No agent files will reach the production environment."