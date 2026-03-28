"""
JavaGuard AI Engine
-------------------
Uses Emergent LLM API (OpenAI-compatible) in production.
Falls back to Claude Anthropic API if ANTHROPIC_API_KEY is set.
Falls back to structured mock in local dev when no keys are available.
"""
import asyncio
import hashlib
import json
import logging
import os
from typing import Optional

from core.config import settings

logger = logging.getLogger(__name__)

AI_ANALYSIS_TIMEOUT = 30.0
AI_MODEL = settings.AI_MODEL  # e.g. gpt-4o-mini or claude-...

SYSTEM_PROMPT = """You are a senior Java backend engineer with 10+ years experience.

Analyze the given Java error and return ONLY valid JSON with these four fields:
{
  "root_cause": "specific one-line root cause (mention class/method if possible)",
  "why": "detailed explanation of why this error happened",
  "fix_steps": "numbered step-by-step fix instructions",
  "code_fix": "concrete Java code snippet that fixes the issue"
}

Rules:
- Be specific (mention class, method if possible)
- No generic advice — only actionable solutions
- For code_fix, provide actual Java code that resolves the issue
- For fix_steps, use numbered steps (1. ... 2. ... 3. ...)
- Return ONLY the JSON object, no markdown fences, no extra text"""

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------
_cache: dict = {}


def get_cached_analysis(error_hash: str) -> Optional[dict]:
    return _cache.get(error_hash)


def set_cached_analysis(error_hash: str, analysis: dict) -> None:
    _cache[error_hash] = analysis


# ---------------------------------------------------------------------------
# Client setup — tries Emergent first, then Anthropic SDK, then mock
# ---------------------------------------------------------------------------

def _get_ai_client():
    """Return (client, mode) tuple. mode is 'openai', 'anthropic', or 'mock'."""
    emergent_key = settings.EMERGENT_LLM_KEY or settings.OPENAI_API_KEY
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")

    # 1. Emergent (or any OpenAI-compatible key)
    if emergent_key and emergent_key.startswith("sk-emergent"):
        try:
            from openai import AsyncOpenAI
            base_url = settings.OPENAI_BASE_URL or "https://api.emergent.sh/v1"
            client = AsyncOpenAI(api_key=emergent_key, base_url=base_url)
            logger.info(f"AI Engine: using Emergent API at {base_url}")
            return client, "openai"
        except Exception as e:
            logger.warning(f"Emergent client init failed: {e}")

    # 2. Anthropic
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=anthropic_key)
            logger.info("AI Engine: using Anthropic Claude API")
            return client, "anthropic"
        except Exception as e:
            logger.warning(f"Anthropic client init failed: {e}")

    # 3. Any other OpenAI-compatible key
    if emergent_key:
        try:
            from openai import AsyncOpenAI
            base_url = settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
            client = AsyncOpenAI(api_key=emergent_key, base_url=base_url)
            logger.info(f"AI Engine: using OpenAI-compatible API at {base_url}")
            return client, "openai"
        except Exception as e:
            logger.warning(f"OpenAI client init failed: {e}")

    logger.warning("AI Engine: no API key found — using smart mock for local dev")
    return None, "mock"


_ai_client, _ai_mode = _get_ai_client()


# ---------------------------------------------------------------------------
# Smart mock for local development / testing
# ---------------------------------------------------------------------------

_MOCK_RESPONSES = {
    "NullPointerException": {
        "root_cause": "NullPointerException — attempting to call a method on a null object reference",
        "why": "A variable that was expected to hold an object reference is null. This commonly happens when: an object was never initialized, a method returned null unexpectedly, or a field was not set before use.",
        "fix_steps": "1. Identify the line throwing the NPE from the stack trace\n2. Add a null check before accessing the object\n3. Ensure the object is properly initialized before the method call\n4. Consider using Optional<T> to handle potentially null values",
        "code_fix": "// Before (dangerous)\nString result = str.toUpperCase();\n\n// After (safe)\nif (str != null) {\n    String result = str.toUpperCase();\n} else {\n    // handle null case\n    String result = \"\";\n}\n\n// Or using Optional\nString result = Optional.ofNullable(str)\n    .map(String::toUpperCase)\n    .orElse(\"\");",
    },
    "ClassCastException": {
        "root_cause": "ClassCastException — illegal cast between incompatible types at runtime",
        "why": "The JVM cannot cast an object to the target type because the actual runtime type is incompatible. This typically occurs with unchecked generic casts or incorrect assumptions about object types.",
        "fix_steps": "1. Use instanceof check before casting\n2. Review the class hierarchy to ensure the cast is valid\n3. Use generics properly to catch type errors at compile time",
        "code_fix": "// Before (unsafe cast)\nMyClass obj = (MyClass) someObject;\n\n// After (safe with instanceof check)\nif (someObject instanceof MyClass) {\n    MyClass obj = (MyClass) someObject;\n    // use obj\n} else {\n    // handle type mismatch\n    throw new IllegalArgumentException(\"Expected MyClass, got: \" + someObject.getClass());\n}",
    },
    "StackOverflowError": {
        "root_cause": "StackOverflowError — infinite or excessively deep recursion exhausted the call stack",
        "why": "A recursive method has no proper base case or the base case is never reached, causing the call stack to overflow.",
        "fix_steps": "1. Identify the recursive method in the stack trace\n2. Verify the base case exists and is reachable\n3. Check that recursive calls converge toward the base case\n4. Consider converting to iterative solution using an explicit stack",
        "code_fix": "// Problematic recursive method (no base case)\npublic int factorial(int n) {\n    return n * factorial(n - 1); // WRONG: no base case\n}\n\n// Fixed with proper base case\npublic int factorial(int n) {\n    if (n <= 1) return 1; // base case\n    return n * factorial(n - 1);\n}\n\n// Or iterative approach\npublic int factorial(int n) {\n    int result = 1;\n    for (int i = 2; i <= n; i++) result *= i;\n    return result;\n}",
    },
    "ArrayIndexOutOfBoundsException": {
        "root_cause": "ArrayIndexOutOfBoundsException — accessing array index outside valid range [0, length-1]",
        "why": "Code attempted to access an array element at an index that does not exist. Off-by-one errors and incorrect loop bounds are the most common causes.",
        "fix_steps": "1. Check array length before accessing elements\n2. Verify loop bounds use array.length correctly\n3. Add defensive bounds checking",
        "code_fix": "// Dangerous\nString first = arr[0]; // throws if arr is empty\n\n// Safe\nif (arr != null && arr.length > 0) {\n    String first = arr[0];\n}\n\n// In loops — use arr.length not a hard-coded value\nfor (int i = 0; i < arr.length; i++) {\n    System.out.println(arr[i]);\n}",
    },
}

_DEFAULT_MOCK = {
    "root_cause": "Runtime exception detected — see stack trace for the exact failure point",
    "why": "An unexpected condition occurred during execution. The stack trace indicates the method call chain that led to this failure. Review the top frame in the stack trace for the immediate cause.",
    "fix_steps": "1. Read the full exception message and stack trace carefully\n2. Identify the first line in your own code (not library code)\n3. Check inputs, null values, and boundary conditions at that line\n4. Add appropriate error handling and input validation\n5. Write a unit test that reproduces the issue",
    "code_fix": "try {\n    // your code here\n} catch (Exception e) {\n    logger.error(\"Operation failed: {}\", e.getMessage(), e);\n    // handle gracefully or rethrow as business exception\n    throw new ServiceException(\"Operation failed\", e);\n}",
}


def _mock_analyse(error_text: str) -> dict:
    """Return a realistic structured analysis based on exception type."""
    for exc_type, response in _MOCK_RESPONSES.items():
        if exc_type in error_text:
            return response
    return _DEFAULT_MOCK


# ---------------------------------------------------------------------------
# Core analysis function
# ---------------------------------------------------------------------------

async def analyse_error(error_text: str, error_hash: str) -> dict:
    """
    Analyse a Java error trace.
    Priority: cache → Emergent AI → Anthropic → smart mock
    """
    # Cache check
    cached = get_cached_analysis(error_hash)
    if cached:
        logger.info(f"CACHE HIT for hash {error_hash[:12]}")
        return cached

    logger.info(f"Analysing error (mode={_ai_mode}, hash={error_hash[:12]}...)")
    prompt = f"Analyze the following Java error:\n\n{error_text}"

    analysis = None

    if _ai_mode == "openai" and _ai_client:
        try:
            response = await asyncio.wait_for(
                _ai_client.chat.completions.create(
                    model=AI_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=1024,
                ),
                timeout=AI_ANALYSIS_TIMEOUT,
            )
            raw = response.choices[0].message.content.strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            analysis = json.loads(raw)
            for key in ("root_cause", "why", "fix_steps", "code_fix"):
                analysis.setdefault(key, "")
            logger.info("Emergent AI analysis complete")
        except asyncio.TimeoutError:
            logger.error("Emergent API timed out — falling back to mock")
        except Exception as e:
            logger.error(f"Emergent API error: {e} — falling back to mock")

    elif _ai_mode == "anthropic" and _ai_client:
        try:
            response = await asyncio.wait_for(
                _ai_client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=1024,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": prompt}],
                ),
                timeout=AI_ANALYSIS_TIMEOUT,
            )
            raw = response.content[0].text.strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            analysis = json.loads(raw)
            for key in ("root_cause", "why", "fix_steps", "code_fix"):
                analysis.setdefault(key, "")
            logger.info("Anthropic Claude analysis complete")
        except asyncio.TimeoutError:
            logger.error("Anthropic API timed out — falling back to mock")
        except Exception as e:
            logger.error(f"Anthropic API error: {e} — falling back to mock")

    # Fall back to smart mock
    if analysis is None:
        logger.info("Using smart mock analysis")
        analysis = _mock_analyse(error_text)

    set_cached_analysis(error_hash, analysis)
    return analysis
