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