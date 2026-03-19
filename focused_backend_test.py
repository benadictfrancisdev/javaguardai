#!/usr/bin/env python3
"""
Focused Backend Test for FrameworkGuard AI
Testing specific features mentioned in review request
"""

import requests
import json
import time
from datetime import datetime

class FocusedAPITester:
    def __init__(self):
        self.base_url = "https://guard-incidents.preview.emergentagent.com"
        self.test_user_token = "bc1ee4da-cea3-4eb6-88f3-ba23fe523477"
        self.test_api_key = "fg_3254cefbdcb5a3471a7d83952d99a29625d3f7a3dacc5c1e"
        
    def log(self, message: str):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def test_health(self):
        """Test /api/health endpoint"""
        self.log("=== Testing Health Endpoint ===")
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200 and response.json().get("status") == "ok":
                self.log("✅ Health endpoint working")
                return True
            else:
                self.log(f"❌ Health endpoint failed: {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Health endpoint error: {e}")
            return False
    
    def test_incident_stats_with_token(self):
        """Test /api/incidents/stats with valid token"""
        self.log("=== Testing Incident Stats with Valid Token ===")
        try:
            headers = {'Authorization': f'Bearer {self.test_user_token}'}
            response = requests.get(f"{self.base_url}/api/incidents/stats", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_today', 'total_week', 'critical_count', 'avg_risk_score', 'hours_saved_estimate']
                
                missing = [field for field in required_fields if field not in data]
                if not missing:
                    self.log("✅ Incident stats endpoint working with all required fields")
                    self.log(f"   hours_saved_estimate: {data.get('hours_saved_estimate')}")
                    return True
                else:
                    self.log(f"❌ Missing fields in stats: {missing}")
                    return False
            else:
                self.log(f"❌ Stats endpoint failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Stats endpoint error: {e}")
            return False
    
    def test_incident_stats_without_token(self):
        """Test /api/incidents/stats without token (should return 401)"""
        self.log("=== Testing Incident Stats without Token ===")
        try:
            response = requests.get(f"{self.base_url}/api/incidents/stats", timeout=10)
            
            if response.status_code == 401:
                self.log("✅ Stats endpoint correctly returns 401 without token")
                return True
            else:
                self.log(f"❌ Stats endpoint should return 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Stats endpoint error: {e}")
            return False
    
    def test_exception_with_valid_api_key(self):
        """Test creating incident with valid API key"""
        self.log("=== Testing Exception Creation with Valid API Key ===")
        try:
            data = {
                "api_key": self.test_api_key,
                "exception_class": "java.lang.IllegalArgumentException",
                "message": "Invalid parameter passed to method",
                "stack_trace": "java.lang.IllegalArgumentException: Invalid parameter\n\tat com.test.Service.validate(Service.java:25)",
                "heap_used_mb": 350.5,
                "thread_count": 12,
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(f"{self.base_url}/api/exceptions", json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("incident_id"):
                    self.log(f"✅ Exception created with valid API key - ID: {result['incident_id']}")
                    return True, result.get("incident_id")
                else:
                    self.log("❌ Exception created but no incident_id returned")
                    return False, None
            else:
                self.log(f"❌ Exception creation failed: {response.status_code} - {response.text}")
                return False, None
        except Exception as e:
            self.log(f"❌ Exception creation error: {e}")
            return False, None
    
    def test_exception_with_invalid_api_key(self):
        """Test creating incident with invalid API key"""
        self.log("=== Testing Exception Creation with Invalid API Key ===")
        try:
            data = {
                "api_key": "invalid_key_123",
                "exception_class": "java.lang.RuntimeException",
                "message": "Test with invalid key",
                "stack_trace": "java.lang.RuntimeException\n\tat com.test.Main.main(Main.java:10)",
                "heap_used_mb": 100.0,
                "thread_count": 5
            }
            
            response = requests.post(f"{self.base_url}/api/exceptions", json=data, timeout=10)
            
            if response.status_code == 401:
                self.log("✅ Exception creation correctly rejected invalid API key")
                return True
            else:
                self.log(f"❌ Should reject invalid API key with 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Invalid API key test error: {e}")
            return False
    
    def test_get_incidents_with_token(self):
        """Test getting incidents list with valid token"""
        self.log("=== Testing Get Incidents with Valid Token ===")
        try:
            headers = {'Authorization': f'Bearer {self.test_user_token}'}
            response = requests.get(f"{self.base_url}/api/incidents", headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if "incidents" in data:
                    incidents = data["incidents"]
                    self.log(f"✅ Incidents retrieved successfully - Count: {len(incidents)}")
                    
                    # Check customer_id filtering (all incidents should have the same customer_id)
                    customer_ids = set(incident.get("customer_id") for incident in incidents if incident.get("customer_id"))
                    if len(customer_ids) <= 1:
                        self.log("✅ Multi-tenant security working - customer_id filtering active")
                        return True
                    else:
                        self.log(f"❌ Multi-tenant security issue - found {len(customer_ids)} different customer_ids")
                        return False
                else:
                    self.log("❌ Response missing 'incidents' field")
                    return False
            else:
                self.log(f"❌ Get incidents failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Get incidents error: {e}")
            return False
    
    def test_get_incidents_without_token(self):
        """Test getting incidents without token (should return 401)"""
        self.log("=== Testing Get Incidents without Token ===")
        try:
            response = requests.get(f"{self.base_url}/api/incidents", timeout=10)
            
            if response.status_code == 401:
                self.log("✅ Get incidents correctly returns 401 without token")
                return True
            else:
                self.log(f"❌ Should return 401 without token, got {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Get incidents without token error: {e}")
            return False
    
    def run_focused_tests(self):
        """Run focused tests for review request requirements"""
        self.log("🚀 Starting Focused FrameworkGuard AI Backend Tests")
        
        results = {}
        
        # Core feature tests
        results['health'] = self.test_health()
        results['stats_with_token'] = self.test_incident_stats_with_token()
        results['stats_without_token'] = self.test_incident_stats_without_token()
        
        # API key validation tests
        success, incident_id = self.test_exception_with_valid_api_key()
        results['exception_valid_key'] = success
        results['exception_invalid_key'] = self.test_exception_with_invalid_api_key()
        
        # Multi-tenant security tests
        results['incidents_with_token'] = self.test_get_incidents_with_token()
        results['incidents_without_token'] = self.test_get_incidents_without_token()
        
        # Summary
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        
        self.log("=" * 60)
        self.log("🏁 FOCUSED TESTS COMPLETE")
        self.log(f"Tests passed: {passed}/{total} ({(passed/total)*100:.1f}%)")
        
        for test, result in results.items():
            status = "✅" if result else "❌"
            self.log(f"{status} {test}")
        
        return results

def main():
    tester = FocusedAPITester()
    results = tester.run_focused_tests()
    
    # Check if all critical tests passed
    critical_tests = ['health', 'stats_with_token', 'exception_valid_key', 'exception_invalid_key']
    critical_passed = all(results.get(test, False) for test in critical_tests)
    
    if critical_passed:
        print("\n🎉 All critical features working correctly!")
        return 0
    else:
        print("\n⚠️ Some critical tests failed")
        return 1

if __name__ == "__main__":
    exit(main())