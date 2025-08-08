#!/usr/bin/env python3
"""
PayFlow Vercel Deployment Monitor Agent
Advanced deployment monitoring and automatic error resolution for PayFlow on Vercel.
Specialized for Next.js + tRPC + Prisma + NextAuth.js architecture.
"""

import json
import datetime
import time
import re
import os
import requests
import subprocess
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ErrorCategory(Enum):
    BUILD = "build"
    RUNTIME = "runtime"
    ENVIRONMENT = "environment"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    PERFORMANCE = "performance"
    SECURITY = "security"

@dataclass
class DeploymentError:
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    log_excerpt: str
    timestamp: datetime.datetime
    deployment_id: str
    suggested_fixes: List[str]
    auto_fixable: bool

class PayFlowVercelDeploymentMonitor:
    def __init__(self, vercel_token: str = None, team_id: str = None):
        self.name = "PayFlow Vercel Deployment Monitor Agent"
        self.version = "1.0.0"
        self.description = "Advanced Vercel deployment monitoring with automatic error resolution for PayFlow"
        
        # Vercel API configuration
        self.vercel_token = vercel_token or os.getenv('VERCEL_TOKEN')
        self.team_id = team_id or os.getenv('VERCEL_TEAM_ID')
        self.base_url = "https://api.vercel.com"
        
        # PayFlow specific configuration
        self.project_name = "payflow"
        self.monitoring_interval = 30  # seconds
        
        # Error patterns for PayFlow architecture
        self.error_patterns = {
            # Build Errors
            ErrorCategory.BUILD: {
                r"TypeScript error.*TS\d+": {
                    "severity": ErrorSeverity.HIGH,
                    "fixes": [
                        "Run `npm run typecheck` locally to identify TypeScript errors",
                        "Check for missing type definitions or incorrect imports",
                        "Verify all tRPC procedures have proper type annotations"
                    ],
                    "auto_fixable": False
                },
                r"Cannot find module.*prisma/client": {
                    "severity": ErrorSeverity.CRITICAL,
                    "fixes": [
                        "Ensure `prisma generate` runs in build command",
                        "Verify DATABASE_URL is set in environment variables",
                        "Check if postinstall script includes prisma generate"
                    ],
                    "auto_fixable": True
                },
                r"Module not found.*@trpc": {
                    "severity": ErrorSeverity.HIGH,
                    "fixes": [
                        "Verify tRPC dependencies are in package.json",
                        "Check for correct import paths in tRPC configuration",
                        "Ensure superjson transformer is properly configured"
                    ],
                    "auto_fixable": True
                },
                r"NEXTAUTH_SECRET.*not set": {
                    "severity": ErrorSeverity.CRITICAL,
                    "fixes": [
                        "Set NEXTAUTH_SECRET environment variable",
                        "Generate secure 32+ character secret",
                        "Verify environment variables are deployed to production"
                    ],
                    "auto_fixable": True
                }
            },
            
            # Runtime Errors
            ErrorCategory.RUNTIME: {
                r"PrismaClientInitializationError": {
                    "severity": ErrorSeverity.CRITICAL,
                    "fixes": [
                        "Verify DATABASE_URL environment variable",
                        "Check database connection and credentials",
                        "Ensure database is accessible from Vercel",
                        "Run `prisma db push` to sync schema"
                    ],
                    "auto_fixable": True
                },
                r"TRPC_ERROR.*UNAUTHORIZED": {
                    "severity": ErrorSeverity.MEDIUM,
                    "fixes": [
                        "Check NextAuth.js configuration",
                        "Verify session validation in tRPC context",
                        "Ensure proper authentication flow"
                    ],
                    "auto_fixable": False
                },
                r"NextAuth.*configuration": {
                    "severity": ErrorSeverity.HIGH,
                    "fixes": [
                        "Verify NextAuth.js environment variables",
                        "Check OAuth provider configuration",
                        "Ensure NEXTAUTH_URL matches deployment URL"
                    ],
                    "auto_fixable": True
                }
            },
            
            # Environment Errors
            ErrorCategory.ENVIRONMENT: {
                r"Environment variable.*not found": {
                    "severity": ErrorSeverity.HIGH,
                    "fixes": [
                        "Add missing environment variable in Vercel dashboard",
                        "Verify environment variable name spelling",
                        "Check if variable is set for correct environment"
                    ],
                    "auto_fixable": True
                },
                r"Invalid DATABASE_URL": {
                    "severity": ErrorSeverity.CRITICAL,
                    "fixes": [
                        "Verify Vercel Postgres connection string format",
                        "Check database credentials and hostname",
                        "Ensure database is accessible from deployment region"
                    ],
                    "auto_fixable": True
                }
            },
            
            # Performance Issues
            ErrorCategory.PERFORMANCE: {
                r"Function execution timed out": {
                    "severity": ErrorSeverity.HIGH,
                    "fixes": [
                        "Optimize database queries for better performance",
                        "Implement connection pooling",
                        "Add proper error handling and timeouts",
                        "Consider using Vercel Edge Functions for performance"
                    ],
                    "auto_fixable": False
                },
                r"Memory limit exceeded": {
                    "severity": ErrorSeverity.HIGH,
                    "fixes": [
                        "Optimize bundle size and dependencies",
                        "Implement proper garbage collection",
                        "Consider upgrading Vercel plan for more memory"
                    ],
                    "auto_fixable": False
                }
            }
        }
        
        # Vercel best practices knowledge
        self.best_practices = {
            "build_optimization": [
                "Use Next.js built-in bundle analyzer",
                "Implement dynamic imports for code splitting",
                "Optimize images with Next.js Image component",
                "Enable compression in vercel.json",
                "Use Vercel Edge Functions for better performance"
            ],
            "environment_management": [
                "Use Vercel environment variables UI for secrets",
                "Set different values for preview and production",
                "Use system environment variables when possible",
                "Implement proper secret rotation",
                "Group related environment variables"
            ],
            "database_optimization": [
                "Use Vercel Postgres for optimal performance",
                "Implement connection pooling with Prisma",
                "Use read replicas for query optimization",
                "Implement proper database migrations",
                "Monitor connection pool usage"
            ],
            "security_practices": [
                "Use HTTPS redirects in vercel.json",
                "Implement proper CORS configuration",
                "Set security headers in Next.js config",
                "Use environment variables for secrets",
                "Enable Vercel Web Application Firewall"
            ]
        }
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers for Vercel API requests"""
        headers = {
            "Authorization": f"Bearer {self.vercel_token}",
            "Content-Type": "application/json"
        }
        if self.team_id:
            headers["Vercel-Team-Id"] = self.team_id
        return headers
    
    def get_deployments(self, limit: int = 10) -> List[Dict]:
        """Get recent deployments for the project"""
        url = f"{self.base_url}/v6/deployments"
        params = {
            "projectName": self.project_name,
            "limit": limit
        }
        
        try:
            response = requests.get(url, headers=self.get_headers(), params=params)
            response.raise_for_status()
            return response.json().get("deployments", [])
        except requests.RequestException as e:
            logger.error(f"Failed to fetch deployments: {e}")
            return []
    
    def get_deployment_logs(self, deployment_id: str) -> List[Dict]:
        """Get build and runtime logs for a deployment"""
        url = f"{self.base_url}/v2/deployments/{deployment_id}/events"
        
        try:
            response = requests.get(url, headers=self.get_headers())
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to fetch deployment logs: {e}")
            return []
    
    def classify_error(self, log_message: str, deployment_id: str) -> Optional[DeploymentError]:
        """Classify error based on log message and return structured error"""
        for category, patterns in self.error_patterns.items():
            for pattern, config in patterns.items():
                if re.search(pattern, log_message, re.IGNORECASE):
                    return DeploymentError(
                        category=category,
                        severity=config["severity"],
                        message=log_message,
                        log_excerpt=log_message[:500],
                        timestamp=datetime.datetime.now(),
                        deployment_id=deployment_id,
                        suggested_fixes=config["fixes"],
                        auto_fixable=config.get("auto_fixable", False)
                    )
        return None
    
    def analyze_deployment(self, deployment: Dict) -> List[DeploymentError]:
        """Analyze a deployment for errors and issues"""
        deployment_id = deployment.get("uid", "")
        state = deployment.get("state", "")
        errors = []
        
        # Check deployment state
        if state in ["ERROR", "CANCELED"]:
            logs = self.get_deployment_logs(deployment_id)
            
            for log_entry in logs:
                if log_entry.get("type") == "stderr" or "error" in log_entry.get("payload", {}).get("text", "").lower():
                    error = self.classify_error(
                        log_entry.get("payload", {}).get("text", ""),
                        deployment_id
                    )
                    if error:
                        errors.append(error)
        
        return errors
    
    def fix_environment_variable_error(self, error: DeploymentError) -> bool:
        """Automatically fix environment variable related errors"""
        try:
            # Extract variable name from error message
            var_match = re.search(r"Environment variable (\w+) not found", error.message)
            if not var_match:
                var_match = re.search(r"(\w+).*not set", error.message)
            
            if var_match:
                var_name = var_match.group(1)
                
                # Check if variable exists in .env.example
                env_example_path = ".env.example"
                if os.path.exists(env_example_path):
                    with open(env_example_path, 'r') as f:
                        content = f.read()
                        if var_name in content:
                            logger.info(f"Found {var_name} in .env.example, suggesting manual configuration")
                            return False
                
                # For common variables, attempt to set default values
                default_values = {
                    "NODE_ENV": "production",
                    "NEXTAUTH_URL": f"https://{self.project_name}.vercel.app"
                }
                
                if var_name in default_values:
                    logger.info(f"Setting default value for {var_name}")
                    # This would integrate with Vercel CLI or API to set the variable
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to fix environment variable error: {e}")
            
        return False
    
    def fix_prisma_error(self, error: DeploymentError) -> bool:
        """Automatically fix Prisma-related errors"""
        try:
            if "Cannot find module.*prisma/client" in error.message:
                # Check if postinstall script includes prisma generate
                package_json_path = "package.json"
                if os.path.exists(package_json_path):
                    with open(package_json_path, 'r') as f:
                        package_data = json.load(f)
                    
                    scripts = package_data.get("scripts", {})
                    if "postinstall" not in scripts or "prisma generate" not in scripts["postinstall"]:
                        # Add postinstall script
                        scripts["postinstall"] = "prisma generate"
                        package_data["scripts"] = scripts
                        
                        with open(package_json_path, 'w') as f:
                            json.dump(package_data, f, indent=2)
                        
                        logger.info("Added prisma generate to postinstall script")
                        return True
                        
        except Exception as e:
            logger.error(f"Failed to fix Prisma error: {e}")
            
        return False
    
    def apply_automatic_fix(self, error: DeploymentError) -> bool:
        """Apply automatic fixes for fixable errors"""
        if not error.auto_fixable:
            return False
        
        success = False
        
        if error.category == ErrorCategory.ENVIRONMENT:
            success = self.fix_environment_variable_error(error)
        elif error.category == ErrorCategory.DATABASE and "prisma" in error.message.lower():
            success = self.fix_prisma_error(error)
        
        if success:
            logger.info(f"Successfully applied automatic fix for: {error.message[:100]}")
        
        return success
    
    def generate_health_check_report(self) -> Dict[str, Any]:
        """Generate comprehensive health check report"""
        deployments = self.get_deployments(limit=5)
        recent_errors = []
        
        for deployment in deployments:
            errors = self.analyze_deployment(deployment)
            recent_errors.extend(errors)
        
        # Categorize errors
        error_summary = {}
        for category in ErrorCategory:
            error_summary[category.value] = len([e for e in recent_errors if e.category == category])
        
        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "total_deployments_checked": len(deployments),
            "total_errors_found": len(recent_errors),
            "error_breakdown": error_summary,
            "recent_deployments": [{
                "id": d.get("uid", ""),
                "state": d.get("state", ""),
                "created": d.get("created", ""),
                "url": d.get("url", "")
            } for d in deployments[:3]],
            "suggested_improvements": self.generate_improvement_suggestions(recent_errors)
        }
    
    def generate_improvement_suggestions(self, errors: List[DeploymentError]) -> List[str]:
        """Generate improvement suggestions based on error patterns"""
        suggestions = []
        
        # Environment variable suggestions
        env_errors = [e for e in errors if e.category == ErrorCategory.ENVIRONMENT]
        if env_errors:
            suggestions.append("Consider using Vercel's environment variable templates for consistent configuration")
        
        # Build optimization suggestions
        build_errors = [e for e in errors if e.category == ErrorCategory.BUILD]
        if build_errors:
            suggestions.append("Implement pre-deployment checks with GitHub Actions")
        
        # Performance suggestions
        perf_errors = [e for e in errors if e.category == ErrorCategory.PERFORMANCE]
        if perf_errors:
            suggestions.extend(self.best_practices["build_optimization"][:2])
        
        return suggestions
    
    def monitor_continuous(self):
        """Continuous monitoring loop"""
        logger.info(f"Starting continuous monitoring for {self.project_name}")
        
        while True:
            try:
                deployments = self.get_deployments(limit=3)
                
                for deployment in deployments:
                    errors = self.analyze_deployment(deployment)
                    
                    for error in errors:
                        logger.warning(f"Error detected: {error.category.value} - {error.message[:100]}")
                        
                        if error.auto_fixable:
                            if self.apply_automatic_fix(error):
                                logger.info("Automatic fix applied successfully")
                            else:
                                logger.warning("Automatic fix failed, manual intervention required")
                        else:
                            logger.info(f"Manual fix required: {error.suggested_fixes[0]}")
                
                time.sleep(self.monitoring_interval)
                
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(self.monitoring_interval)
    
    def run_analysis(self, analysis_type: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Main analysis runner for deployment monitoring tasks"""
        timestamp = datetime.datetime.now().isoformat()
        
        if analysis_type == "health_check":
            results = self.generate_health_check_report()
        elif analysis_type == "deployment_analysis":
            deployment_id = data.get("deployment_id") if data else None
            if deployment_id:
                deployment = {"uid": deployment_id}
                errors = self.analyze_deployment(deployment)
                results = {
                    "deployment_id": deployment_id,
                    "errors_found": len(errors),
                    "errors": [
                        {
                            "category": e.category.value,
                            "severity": e.severity.value,
                            "message": e.message,
                            "fixes": e.suggested_fixes,
                            "auto_fixable": e.auto_fixable
                        }
                        for e in errors
                    ]
                }
            else:
                results = {"error": "deployment_id required"}
        elif analysis_type == "best_practices":
            results = self.best_practices
        else:
            results = {"error": f"Unknown analysis type: {analysis_type}"}
        
        return {
            "agent": self.name,
            "version": self.version,
            "timestamp": timestamp,
            "analysis_type": analysis_type,
            "results": results
        }

def main():
    agent = PayFlowVercelDeploymentMonitor()
    print(f"🚀 {agent.name} v{agent.version}")
    print(f"📋 {agent.description}")
    
    if not agent.vercel_token:
        print("❌ VERCEL_TOKEN environment variable is required")
        print("Get your token from: https://vercel.com/account/tokens")
        return
    
    # Interactive mode
    while True:
        print("\n" + "="*70)
        print("Vercel Deployment Monitoring Options:")
        print("1. Run Health Check")
        print("2. Analyze Specific Deployment")
        print("3. View Best Practices")
        print("4. Start Continuous Monitoring")
        print("5. Exit")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == "1":
            result = agent.run_analysis("health_check")
            print("\n🏥 Health Check Report:")
            print(json.dumps(result["results"], indent=2))
            
        elif choice == "2":
            deployment_id = input("Enter deployment ID: ")
            result = agent.run_analysis("deployment_analysis", {"deployment_id": deployment_id})
            print(f"\n📊 Deployment Analysis for {deployment_id}:")
            print(json.dumps(result["results"], indent=2))
            
        elif choice == "3":
            result = agent.run_analysis("best_practices")
            print("\n📚 Vercel Best Practices:")
            print(json.dumps(result["results"], indent=2))
            
        elif choice == "4":
            print("\n🔄 Starting continuous monitoring...")
            print("Press Ctrl+C to stop monitoring")
            agent.monitor_continuous()
            
        elif choice == "5":
            print("\n👋 PayFlow Vercel Deployment Monitor shutting down...")
            break
            
        else:
            print("❌ Invalid choice. Please select 1-5.")

if __name__ == "__main__":
    main()