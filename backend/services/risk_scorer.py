def enhance_risk_score(base_score: int, exception_class: str, heap_used_percent: float) -> int:
    """
    Enhance the base risk score based on exception type and heap usage.
    
    Rules:
    - OutOfMemoryError: minimum score of 85
    - Heap usage above 80%: add 20 points
    - NullPointerException in payment/checkout paths: add 15 points
    
    Returns: Final risk score capped at 0-100
    """
    final_score = base_score
    
    # OutOfMemoryError is critical - minimum 85
    if 'OutOfMemoryError' in exception_class:
        final_score = max(final_score, 85)
    
    # High heap usage adds urgency
    if heap_used_percent > 80:
        final_score += 20
    
    # Payment/checkout related null pointers are critical
    if 'NullPointerException' in exception_class:
        # This would typically check the stack trace for payment/checkout paths
        # For now, we add 15 if it's a NPE (simplified)
        final_score += 15
    
    # Cap the score between 0 and 100
    return max(0, min(100, final_score))


def calculate_heap_percent(heap_used_mb: float, heap_max_mb: float) -> float:
    """Calculate heap usage percentage."""
    if heap_max_mb <= 0:
        return 0
    return (heap_used_mb / heap_max_mb) * 100
