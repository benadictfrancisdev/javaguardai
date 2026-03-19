import re


def enhance_risk_score(
    base_score: int, 
    exception_class: str, 
    heap_used_percent: float,
    stack_trace: str = ""
) -> int:
    """
    Enhance the base risk score based on exception type, heap usage, and stack trace context.
    
    Rules:
    - OutOfMemoryError: minimum score of 85
    - Heap usage above 80%: add 20 points
    - NullPointerException in payment/checkout paths: add 15 points
    
    Args:
        base_score: Initial risk score from AI analysis (0-100)
        exception_class: The exception class name
        heap_used_percent: Current heap usage as percentage (0-100)
        stack_trace: Full stack trace for context analysis
        
    Returns:
        Final risk score capped at 0-100
    """
    final_score = base_score
    
    # OutOfMemoryError is critical - minimum 85
    if 'OutOfMemoryError' in exception_class:
        final_score = max(final_score, 85)
    
    # High heap usage adds urgency
    if heap_used_percent > 80:
        final_score += 20
    
    # NullPointerException in payment/checkout paths is critical
    if 'NullPointerException' in exception_class:
        # Check stack trace for payment/checkout related classes
        payment_patterns = [
            r'payment', r'checkout', r'billing', r'transaction',
            r'PaymentController', r'PaymentService', r'CheckoutController',
            r'BillingService', r'TransactionHandler', r'OrderService'
        ]
        
        stack_lower = stack_trace.lower() if stack_trace else ""
        
        for pattern in payment_patterns:
            if re.search(pattern, stack_lower, re.IGNORECASE):
                final_score += 15
                break
    
    # Cap the score between 0 and 100
    return max(0, min(100, final_score))


def calculate_heap_percent(heap_used_mb: float, heap_max_mb: float) -> float:
    """Calculate heap usage percentage."""
    if heap_max_mb <= 0:
        return 0
    return (heap_used_mb / heap_max_mb) * 100


def get_risk_level(score: int) -> str:
    """Get risk level label from score."""
    if score >= 85:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 30:
        return "MEDIUM"
    else:
        return "LOW"
