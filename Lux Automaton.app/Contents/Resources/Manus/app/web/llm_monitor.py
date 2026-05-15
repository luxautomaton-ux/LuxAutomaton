"""LLM communication monitor for capture and simulation."""
import asyncio
import random
import time
from functools import wraps
from typing import Any, Callable, Dict, List, Optional


class LLMMonitor:
    """LLM communication monitor with multiple tracking modes."""

    def __init__(self):
        self.interceptors = []
        self.communications = []

    def register_interceptor(self, func: Callable):
        """Register an interceptor called on every communication event."""
        self.interceptors.append(func)
        return func

    def record_communication(self, direction: str, content: Any):
        """Record a communication event."""
        comm_record = {
            "direction": direction,
            "content": str(content)[:1000],
            "timestamp": time.time(),
        }
        self.communications.append(comm_record)

        # Notify all interceptors
        for interceptor in self.interceptors:
            try:
                interceptor(comm_record)
            except Exception as e:
                print(f"Interceptor error: {str(e)}")

    def get_communications(self, start_idx: int = 0) -> List[Dict[str, Any]]:
        """Get communication records."""
        return self.communications[start_idx:]

    def clear(self):
        """Clear all communication records."""
        self.communications = []

    def intercept_method(self, obj, method_name):
        """Intercept method calls on an object."""
        if not hasattr(obj, method_name):
            return False

        original_method = getattr(obj, method_name)

        @wraps(original_method)
        async def wrapped_method(*args, **kwargs):
            # Record input
            input_data = str(args[0]) if args else str(kwargs)
            self.record_communication("in", input_data)

            # Call original method
            result = await original_method(*args, **kwargs)

            # Record output
            self.record_communication("out", result)
            return result

        # Replace original method
        setattr(obj, method_name, wrapped_method)
        return True


# Create a global monitor instance
monitor = LLMMonitor()


# Simulation helper for demos and tests
async def simulate_llm_thinking(
    prompt: str, callback: Optional[Callable] = None, steps: int = 5, delay: float = 1.0
):
    """Simulate an LLM thinking sequence."""

    # Record input
    monitor.record_communication("in", prompt)

    thinking_steps = [
        "Analyze the request",
        "Retrieve relevant knowledge",
        "Organize and structure information",
        "Draft initial response",
        "Review and optimize response",
        "Generate final response",
    ]

    # Adjust thinking steps for coding prompts
    lower_prompt = prompt.lower()
    if "code" in lower_prompt or "program" in lower_prompt or "coding" in lower_prompt:
        thinking_steps = [
            "Understand code requirements",
            "Design code structure",
            "Implement core functions",
            "Add error handling",
            "Test code behavior",
            "Optimize code efficiency",
        ]

    # Ensure reasonable step count
    actual_steps = min(steps, len(thinking_steps))

    # Simulate thinking process
    for i in range(actual_steps):
        step_msg = thinking_steps[i]
        if callback:
            callback(step_msg)
        await asyncio.sleep(delay * (0.5 + random.random()))

    # Generate a simulated response
    result = f"Here is a response to your prompt \"{prompt[:30]}...\".\n\n"
    result += "Based on the analysis, here are key recommendations:\n"
    result += "1. Confirm the core problem first.\n"
    result += "2. Evaluate multiple solution paths.\n"
    result += "3. Execute the most suitable approach."

    # Record output
    monitor.record_communication("out", result)
    return result
