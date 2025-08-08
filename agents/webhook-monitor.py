#!/usr/bin/env python3
"""
PayFlow Webhook Monitor
Real-time deployment monitoring via Vercel webhooks for instant error detection and resolution.
"""

import json
import time
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from flask import Flask, request, jsonify
import threading
import logging
from dataclasses import asdict

from payflow_vercel_deployment_monitor_agent import (
    PayFlowVercelDeploymentMonitor, 
    ErrorSeverity,
    ErrorCategory
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebhookMonitor:
    def __init__(self, port: int = 3001):
        self.app = Flask(__name__)
        self.port = port
        self.deployment_agent = PayFlowVercelDeploymentMonitor()
        self.recent_deployments = []
        self.error_history = []
        self.setup_routes()
        
    def setup_routes(self):
        """Set up Flask routes for webhook handling"""
        
        @self.app.route('/webhook/vercel', methods=['POST'])
        def handle_vercel_webhook():
            return self.process_vercel_webhook(request)
        
        @self.app.route('/status', methods=['GET'])
        def get_status():
            return self.get_monitor_status()
        
        @self.app.route('/health', methods=['GET'])
        def health_check():
            return {"status": "healthy", "timestamp": datetime.now().isoformat()}
    
    def process_vercel_webhook(self, request) -> Dict[str, Any]:
        """Process incoming Vercel webhook"""
        try:
            # Verify webhook signature (implement based on Vercel's webhook security)
            payload = request.get_json()
            
            if not payload:
                return {"error": "Invalid payload"}, 400
            
            event_type = payload.get("type")
            deployment_data = payload.get("payload", {})
            
            logger.info(f"Received webhook: {event_type} for deployment {deployment_data.get('deploymentId', 'unknown')}")
            
            # Process different webhook events
            if event_type == "deployment.created":
                return self.handle_deployment_created(deployment_data)
            elif event_type == "deployment.ready":
                return self.handle_deployment_ready(deployment_data)
            elif event_type == "deployment.error":
                return self.handle_deployment_error(deployment_data)
            elif event_type == "deployment.canceled":
                return self.handle_deployment_canceled(deployment_data)
            
            return {"message": "Webhook processed", "event": event_type}
            
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return {"error": str(e)}, 500
    
    def handle_deployment_created(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle deployment creation event"""
        deployment_id = data.get("deploymentId")
        
        # Store deployment for tracking
        self.recent_deployments.append({
            "id": deployment_id,
            "status": "created",
            "timestamp": datetime.now().isoformat(),
            "url": data.get("url", "")
        })
        
        logger.info(f"Deployment created: {deployment_id}")
        return {"message": "Deployment creation tracked"}
    
    def handle_deployment_ready(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle successful deployment completion"""
        deployment_id = data.get("deploymentId")
        
        # Update deployment status
        for deployment in self.recent_deployments:
            if deployment["id"] == deployment_id:
                deployment["status"] = "ready"
                deployment["completed_at"] = datetime.now().isoformat()
                break
        
        # Run post-deployment health checks
        self.schedule_health_check(deployment_id)
        
        logger.info(f"Deployment ready: {deployment_id}")
        return {"message": "Deployment completion tracked"}
    
    def handle_deployment_error(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle deployment error event - CRITICAL PATH"""
        deployment_id = data.get("deploymentId")
        error_message = data.get("errorMessage", "Unknown error")
        
        logger.error(f"Deployment error detected: {deployment_id} - {error_message}")
        
        # Immediate error analysis
        deployment_info = {"uid": deployment_id}
        errors = self.deployment_agent.analyze_deployment(deployment_info)
        
        # Attempt automatic fixes
        fixes_applied = 0
        for error in errors:
            if error.auto_fixable:
                if self.deployment_agent.apply_automatic_fix(error):
                    fixes_applied += 1
                    logger.info(f"Auto-fix applied for: {error.message[:50]}")
        
        # Store error for history
        error_record = {
            "deployment_id": deployment_id,
            "timestamp": datetime.now().isoformat(),
            "message": error_message,
            "errors_found": len(errors),
            "auto_fixes_applied": fixes_applied,
            "severity": "high" if errors else "unknown"
        }
        
        self.error_history.append(error_record)
        
        # If critical errors remain, trigger alerts
        critical_errors = [e for e in errors if e.severity == ErrorSeverity.CRITICAL]
        if critical_errors:
            self.trigger_critical_alert(deployment_id, critical_errors)
        
        return {
            "message": "Error processed",
            "errors_analyzed": len(errors),
            "fixes_applied": fixes_applied
        }
    
    def handle_deployment_canceled(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle deployment cancellation"""
        deployment_id = data.get("deploymentId")
        
        # Update deployment status
        for deployment in self.recent_deployments:
            if deployment["id"] == deployment_id:
                deployment["status"] = "canceled"
                deployment["canceled_at"] = datetime.now().isoformat()
                break
        
        logger.warning(f"Deployment canceled: {deployment_id}")
        return {"message": "Deployment cancellation tracked"}
    
    def schedule_health_check(self, deployment_id: str):
        """Schedule a health check for a successful deployment"""
        def run_health_check():
            time.sleep(30)  # Wait 30 seconds after deployment
            
            try:
                # Run comprehensive health check
                health_report = self.deployment_agent.generate_health_check_report()
                
                if health_report["total_errors_found"] > 0:
                    logger.warning(f"Post-deployment health check found issues for {deployment_id}")
                else:
                    logger.info(f"Post-deployment health check passed for {deployment_id}")
                    
            except Exception as e:
                logger.error(f"Health check failed for {deployment_id}: {e}")
        
        # Run health check in background thread
        thread = threading.Thread(target=run_health_check)
        thread.daemon = True
        thread.start()
    
    def trigger_critical_alert(self, deployment_id: str, critical_errors: List[Any]):
        """Trigger alerts for critical deployment errors"""
        alert_message = f"CRITICAL: Deployment {deployment_id} has {len(critical_errors)} critical errors"
        
        # Log critical alert
        logger.critical(alert_message)
        
        # Here you would integrate with:
        # - Slack notifications
        # - Email alerts  
        # - PagerDuty
        # - Discord webhooks
        # - SMS alerts
        
        # For now, just log the details
        for error in critical_errors:
            logger.critical(f"Critical Error: {error.message}")
            logger.critical(f"Suggested fixes: {', '.join(error.suggested_fixes[:2])}")
    
    def get_monitor_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        # Clean old deployments (keep last 24 hours)
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.recent_deployments = [
            d for d in self.recent_deployments 
            if datetime.fromisoformat(d["timestamp"]) > cutoff_time
        ]
        
        # Clean old errors (keep last 7 days)
        error_cutoff = datetime.now() - timedelta(days=7)
        self.error_history = [
            e for e in self.error_history
            if datetime.fromisoformat(e["timestamp"]) > error_cutoff
        ]
        
        return {
            "status": "active",
            "timestamp": datetime.now().isoformat(),
            "recent_deployments": len(self.recent_deployments),
            "error_history": len(self.error_history),
            "deployments": self.recent_deployments[-10:],  # Last 10
            "recent_errors": self.error_history[-5:],  # Last 5
            "agent_version": self.deployment_agent.version
        }
    
    def run(self, debug: bool = False):
        """Start the webhook monitor server"""
        logger.info(f"Starting PayFlow Webhook Monitor on port {self.port}")
        logger.info("Configure Vercel webhook URL: http://your-domain/webhook/vercel")
        
        self.app.run(
            host='0.0.0.0',
            port=self.port,
            debug=debug,
            threaded=True
        )

def main():
    """Main function to run the webhook monitor"""
    import argparse
    
    parser = argparse.ArgumentParser(description='PayFlow Vercel Webhook Monitor')
    parser.add_argument('--port', type=int, default=3001, help='Port to run webhook server')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    monitor = WebhookMonitor(port=args.port)
    
    try:
        monitor.run(debug=args.debug)
    except KeyboardInterrupt:
        logger.info("Webhook monitor stopped by user")

if __name__ == "__main__":
    main()