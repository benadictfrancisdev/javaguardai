import pytest
import sys
sys.path.insert(0, '/app/backend')

from services.risk_scorer import enhance_risk_score, get_risk_level


class TestEnhanceRiskScore:
    """Tests for enhance_risk_score function."""
    
    def test_base_score_returned_when_no_rules_match(self):
        """Test that base score is returned unchanged when no enhancement rules match."""
        base_score = 50
        result = enhance_risk_score(
            base_score=base_score,
            exception_class='java.lang.RuntimeException',
            heap_used_percent=50,  # Below 80% threshold
            stack_trace='at com.example.SomeClass.someMethod(SomeClass.java:10)'
        )
        # No rules should match, so score should remain unchanged
        assert result == base_score

    def test_heap_above_80_adds_20_points(self):
        """Test that heap usage above 80% adds 20 points to score."""
        base_score = 50
        result = enhance_risk_score(
            base_score=base_score,
            exception_class='java.lang.RuntimeException',
            heap_used_percent=85,  # Above 80% threshold
            stack_trace='at com.example.SomeClass.someMethod(SomeClass.java:10)'
        )
        assert result == base_score + 20

    def test_score_never_exceeds_100(self):
        """Test that final score never exceeds 100."""
        base_score = 95
        result = enhance_risk_score(
            base_score=base_score,
            exception_class='java.lang.OutOfMemoryError',  # +minimum 85
            heap_used_percent=90,  # +20 points
            stack_trace='at com.example.PaymentController.process(PaymentController.java:10)'
        )
        assert result <= 100

    def test_outofmemoryerror_minimum_score_85(self):
        """Test that OutOfMemoryError has minimum score of 85."""
        base_score = 20  # Low base score
        result = enhance_risk_score(
            base_score=base_score,
            exception_class='java.lang.OutOfMemoryError',
            heap_used_percent=50,
            stack_trace='at com.example.SomeClass.someMethod(SomeClass.java:10)'
        )
        assert result >= 85

    def test_nullpointerexception_in_paymentcontroller_adds_15(self):
        """Test that NullPointerException in PaymentController adds 15 to score."""
        base_score = 50
        result = enhance_risk_score(
            base_score=base_score,
            exception_class='java.lang.NullPointerException',
            heap_used_percent=50,
            stack_trace='at com.example.PaymentController.processPayment(PaymentController.java:42)'
        )
        assert result == base_score + 15


class TestGetRiskLevel:
    """Tests for get_risk_level function."""
    
    def test_critical_level_for_score_85_plus(self):
        """Test that score >= 85 returns CRITICAL."""
        assert get_risk_level(85) == "CRITICAL"
        assert get_risk_level(100) == "CRITICAL"

    def test_high_level_for_score_60_to_84(self):
        """Test that score 60-84 returns HIGH."""
        assert get_risk_level(60) == "HIGH"
        assert get_risk_level(84) == "HIGH"

    def test_medium_level_for_score_30_to_59(self):
        """Test that score 30-59 returns MEDIUM."""
        assert get_risk_level(30) == "MEDIUM"
        assert get_risk_level(59) == "MEDIUM"

    def test_low_level_for_score_below_30(self):
        """Test that score < 30 returns LOW."""
        assert get_risk_level(0) == "LOW"
        assert get_risk_level(29) == "LOW"
