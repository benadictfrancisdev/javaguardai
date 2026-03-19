#!/usr/bin/env python3
"""
FrameworkGuard AI Backend API Testing Suite
Tests all endpoints including health, auth, incidents, and metrics
"""

import requests
import json
import sys
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
import time

class FrameworkGuardAPITester:
    def __init__(self, base_url: str = "https://guard-incidents.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.api_key = None
        self.customer_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from review request
        self.test_user_token = "bc1ee4da-cea3-4eb6-88f3-ba23fe523477"
        self.test_api_key = "fg_3254cefbdcb5a3471a7d83952d99a29625d3f7a3dacc5c1e"
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Any]:
        """Run a single API test and return success status and response data"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.session_token and not headers:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        self.tests_run += 1
        self.log(f"🔍 Testing {name} - {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}")
                except:
                    self.log(f"   Error text: {response.text}")
                return False, {}
                
        except requests.exceptions.RequestException as e:
            self.failed_tests.append(f"{name} - Network error: {str(e)}")
            self.log(f"❌ {name} - Network error: {str(e)}", "ERROR")
            return False, {}
        except Exception as e:
            self.failed_tests.append(f"{name} - Error: {str(e)}")
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            return False, {}

    def test_health_endpoint(self) -> bool:
        """Test the health check endpoint"""
        self.log("=== Testing Health Endpoint ===")
        success, response = self.run_test("Health Check", "GET", "/api/health", 200)
        
        if success and response.get("status") == "ok":
            self.log("✅ Health endpoint returns correct status")
            return True
        else:
            self.log("❌ Health endpoint failed or incorrect response")
            return False
    
    def test_user_registration(self) -> bool:
        """Test user registration flow"""
        self.log("=== Testing User Registration ===")
        
        # Generate unique test data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_email = f"test_user_{timestamp}@example.com"
        test_password = "TestPassword123!"
        test_company = f"Test Company {timestamp}"
        
        registration_data = {
            "email": test_email,
            "password": test_password,
            "company_name": test_company
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "/api/auth/register", 
            200,
            data=registration_data
        )
        
        if success:
            self.log(f"Registration response: {json.dumps(response, indent=2)}")
            customer_info = response.get("customer", {})
            if customer_info.get("api_key"):
                self.api_key = customer_info.get("api_key")
                self.customer_data = {
                    "email": customer_info.get("email"),
                    "id": customer_info.get("id"),
                    "api_key": self.api_key
                }
                self.log(f"✅ Registration successful - API Key: {self.api_key[:20]}...")
                return True
            elif response.get("api_key"):
                self.api_key = response.get("api_key") 
                self.customer_data = response
                self.log(f"✅ Registration successful - API Key: {self.api_key[:20]}...")
                return True
            else:
                self.log("❌ Registration failed - no API key in response")
                return False
        else:
            self.log("❌ Registration failed")
            return False
    
    def test_user_login(self) -> bool:
        """Test user login flow"""
        if not self.customer_data:
            self.log("❌ Cannot test login - no customer data from registration")
            return False
            
        self.log("=== Testing User Login ===")
        
        login_data = {
            "email": self.customer_data["email"],
            "password": "TestPassword123!"  # Using the same password from registration
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/api/auth/login",
            200,
            data=login_data
        )
        
        if success and response.get("token"):
            self.session_token = response.get("token")
            self.log(f"✅ Login successful - Token: {self.session_token[:20]}...")
            return True
        else:
            self.log("❌ Login failed")
            return False
    
    def test_get_current_user(self) -> bool:
        """Test getting current user info"""
        if not self.session_token:
            self.log("❌ Cannot test /auth/me - no session token")
            return False
            
        self.log("=== Testing Get Current User ===")
        
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/api/auth/me",
            200
        )
        
        if success and response.get("email"):
            self.log(f"✅ Current user endpoint works - Email: {response.get('email')}")
            return True
        else:
            self.log("❌ Get current user failed")
            return False
    
    def test_report_exception(self) -> str:
        """Test exception reporting - returns incident ID if successful"""
        if not self.api_key:
            self.log("❌ Cannot test exception reporting - no API key")
            return None
            
        self.log("=== Testing Exception Reporting ===")
        
        exception_data = {
            "api_key": self.api_key,
            "exception_class": "java.lang.OutOfMemoryError",
            "message": "Java heap space",
            "stack_trace": "java.lang.OutOfMemoryError: Java heap space\n\tat com.example.App.main(App.java:15)",
            "heap_used_mb": 512.5,
            "thread_count": 25,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Exception Reporting",
            "POST",
            "/api/exceptions",
            200,
            data=exception_data
        )
        
        if success and response.get("incident_id"):
            incident_id = response.get("incident_id")
            self.log(f"✅ Exception reported successfully - ID: {incident_id}")
            return incident_id
        else:
            self.log("❌ Exception reporting failed")
            return None
    
    def test_get_incidents(self) -> bool:
        """Test getting incidents list"""
        if not self.session_token:
            self.log("❌ Cannot test incidents list - no session token")
            return False
            
        self.log("=== Testing Get Incidents ===")
        
        success, response = self.run_test(
            "Get Incidents List",
            "GET",
            "/api/incidents",
            200
        )
        
        if success and "incidents" in response:
            incidents_count = len(response.get("incidents", []))
            self.log(f"✅ Incidents list retrieved - Count: {incidents_count}")
            return True
        else:
            self.log("❌ Get incidents list failed")
            return False
    
    def test_report_metrics(self) -> bool:
        """Test metrics reporting"""
        if not self.api_key:
            self.log("❌ Cannot test metrics reporting - no API key")
            return False
            
        self.log("=== Testing Metrics Reporting ===")
        
        metrics_data = {
            "api_key": self.api_key,
            "heap_used_mb": 256.0,
            "heap_max_mb": 512.0,
            "thread_count": 15,
            "gc_count": 5,
            "jvm_uptime_ms": 3600000,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Metrics Reporting",
            "POST",
            "/api/metrics",
            200,
            data=metrics_data
        )
        
        if success and response.get("received"):
            self.log(f"✅ Metrics reported successfully - ID: {response.get('id')}")
            return True
        else:
            self.log("❌ Metrics reporting failed")
            return False
    
    def test_get_latest_metrics(self) -> bool:
        """Test getting latest metrics"""
        if not self.session_token:
            self.log("❌ Cannot test latest metrics - no session token")
            return False
            
        self.log("=== Testing Get Latest Metrics ===")
        
        success, response = self.run_test(
            "Get Latest Metrics",
            "GET",
            "/api/metrics/latest",
            200
        )
        
        if success and "metrics" in response:
            metrics_count = len(response.get("metrics", []))
            self.log(f"✅ Latest metrics retrieved - Count: {metrics_count}")
            return True
        else:
            self.log("❌ Get latest metrics failed")
            return False
    
    def test_get_incident_stats(self) -> bool:
        """Test getting incident statistics"""
        if not self.session_token:
            self.log("❌ Cannot test incident stats - no session token")
            return False
            
        self.log("=== Testing Get Incident Stats ===")
        
        success, response = self.run_test(
            "Get Incident Stats",
            "GET",
            "/api/incidents/stats",
            200
        )
        
        if success:
            required_fields = ['total_today', 'total_week', 'critical_count', 'avg_risk_score', 'hours_saved_estimate']
            all_fields_present = all(field in response for field in required_fields)
            
            if all_fields_present:
                self.log(f"✅ Incident stats retrieved successfully")
                self.log(f"   Total today: {response.get('total_today')}")
                self.log(f"   Total week: {response.get('total_week')}")
                self.log(f"   Critical count: {response.get('critical_count')}")
                self.log(f"   Avg risk score: {response.get('avg_risk_score')}")
                self.log(f"   Hours saved estimate: {response.get('hours_saved_estimate')}")
                return True
            else:
                missing_fields = [field for field in required_fields if field not in response]
                self.log(f"❌ Missing required fields in stats response: {missing_fields}")
                return False
        else:
            self.log("❌ Get incident stats failed")
            return False
    
    def test_api_key_validation(self) -> bool:
        """Test API key validation by using invalid key"""
        self.log("=== Testing API Key Validation ===")
        
        invalid_exception_data = {
            "api_key": "invalid_key_12345",
            "exception_class": "java.lang.RuntimeException",
            "message": "Test exception for invalid API key",
            "stack_trace": "java.lang.RuntimeException: Test\n\tat com.test.Main.main(Main.java:10)",
            "heap_used_mb": 100.0,
            "thread_count": 5,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Invalid API Key Test",
            "POST",
            "/api/exceptions",
            401,  # Expecting 401 for invalid API key
            data=invalid_exception_data
        )
        
        if success:
            self.log("✅ API key validation works - correctly rejected invalid key")
            return True
        else:
            self.log("❌ API key validation failed - should have returned 401")
            return False
    
    def test_with_provided_credentials(self) -> bool:
        """Test using provided test credentials from review request"""
        self.log("=== Testing with Provided Test Credentials ===")
        
        # Use provided token and API key
        self.session_token = self.test_user_token
        self.api_key = self.test_api_key
        
        # Test incident stats with provided credentials
        success, response = self.run_test(
            "Incident Stats with Test Token",
            "GET",
            "/api/incidents/stats",
            200
        )
        
        if success:
            self.log("✅ Test credentials working for incident stats")
            required_fields = ['total_today', 'total_week', 'critical_count', 'avg_risk_score', 'hours_saved_estimate']
            has_hours_saved = 'hours_saved_estimate' in response
            
            if has_hours_saved:
                self.log(f"✅ hours_saved_estimate field present: {response.get('hours_saved_estimate')}")
            else:
                self.log("❌ hours_saved_estimate field missing from response")
                
            return success and has_hours_saved
        else:
            self.log("❌ Test credentials failed")
            return False
    
    def test_exception_with_customer_id(self) -> str:
        """Test exception reporting with customer_id validation"""
        if not self.api_key:
            self.log("❌ Cannot test exception with customer_id - no API key")
            return None
            
        self.log("=== Testing Exception Reporting with Customer ID ===")
        
        exception_data = {
            "api_key": self.test_api_key,  # Use test API key
            "exception_class": "java.lang.NullPointerException", 
            "message": "Cannot invoke method on null object",
            "stack_trace": "java.lang.NullPointerException: Cannot invoke method on null object\n\tat com.frameworkguard.Service.process(Service.java:42)\n\tat com.frameworkguard.Controller.handle(Controller.java:28)",
            "heap_used_mb": 750.2,
            "thread_count": 30,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.run_test(
            "Exception Reporting with Customer ID",
            "POST",
            "/api/exceptions",
            200,
            data=exception_data
        )
        
    def test_multi_tenant_security(self) -> bool:
        """Test that users can only see their own incidents (multi-tenant security)"""
        if not self.session_token:
            self.log("❌ Cannot test multi-tenant security - no session token")
            return False
            
        self.log("=== Testing Multi-Tenant Security ===")
        
        # Get incidents for the current user
        success, response = self.run_test(
            "Multi-tenant Security Check",
            "GET",
            "/api/incidents",
            200
        )
        
        if success and "incidents" in response:
            incidents = response.get("incidents", [])
            customer_id = self.customer_data.get("id") if self.customer_data else None
            
            # Check that all incidents have the correct customer_id
            mismatched_incidents = []
            for incident in incidents:
                if incident.get("customer_id") != customer_id:
                    mismatched_incidents.append(incident.get("id"))
            
            if len(mismatched_incidents) == 0:
                self.log("✅ Multi-tenant security working - all incidents belong to current customer")
                return True
            else:
                self.log(f"❌ Multi-tenant security failed - found {len(mismatched_incidents)} incidents from other customers")
                return False
        else:
            self.log("❌ Multi-tenant security test failed - couldn't retrieve incidents")
            return False
    
    def run_full_test_suite(self) -> Dict[str, Any]:
        """Run complete test suite and return results"""
        self.log("🚀 Starting FrameworkGuard AI Backend Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        test_results = {}
        
        # Test 1: Health endpoint
        test_results['health'] = self.test_health_endpoint()
        
        # Test 2: User registration  
        test_results['registration'] = self.test_user_registration()
        
        # Test 3: User login
        test_results['login'] = self.test_user_login()
        
        # Test 4: Get current user
        test_results['current_user'] = self.test_get_current_user()
        
        # Test 5: Exception reporting
        incident_id = self.test_report_exception()
        test_results['exception_reporting'] = incident_id is not None
        
        # Test 6: Get incidents
        test_results['get_incidents'] = self.test_get_incidents()
        
        # Test 7: Metrics reporting
        test_results['metrics_reporting'] = self.test_report_metrics()
        
        # Test 8: Get latest metrics
        test_results['get_latest_metrics'] = self.test_get_latest_metrics()
        
        # Test 9: Test with provided credentials (NEW)
        test_results['provided_credentials'] = self.test_with_provided_credentials()
        
        # Test 10: Exception with customer_id (NEW FEATURE)
        incident_id2 = self.test_exception_with_customer_id()
        test_results['exception_with_customer_id'] = incident_id2 is not None
        
        # Test 11: Get incident stats (NEW FEATURE)
        test_results['incident_stats'] = self.test_get_incident_stats()
        
        # Test 12: API key validation (SECURITY FEATURE)
        test_results['api_key_validation'] = self.test_api_key_validation()
        
        # Test 13: Multi-tenant security (SECURITY FEATURE)
        test_results['multi_tenant_security'] = self.test_multi_tenant_security()
        
        end_time = time.time()
        
        # Print summary
        self.log("=" * 60)
        self.log("🏁 TEST SUITE COMPLETE")
        self.log(f"Total tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Tests failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        self.log(f"Execution time: {end_time - start_time:.2f}s")
        
        if self.failed_tests:
            self.log("Failed tests:")
            for failure in self.failed_tests:
                self.log(f"  - {failure}")
        
        return {
            'test_results': test_results,
            'tests_run': self.tests_run,
            'tests_passed': self.tests_passed,
            'success_rate': (self.tests_passed/self.tests_run)*100,
            'failed_tests': self.failed_tests,
            'execution_time': end_time - start_time,
            'api_key': self.api_key,
            'session_token': self.session_token
        }

def main():
    tester = FrameworkGuardAPITester()
    results = tester.run_full_test_suite()
    
    # Return appropriate exit code
    if results['tests_passed'] == results['tests_run']:
        sys.exit(0)  # All tests passed
    else:
        sys.exit(1)  # Some tests failed

if __name__ == "__main__":
    main()