"""LLM callback wrapper that adds callback hooks to an existing LLM instance."""
import functools
import inspect
import os
from typing import Any, Callable, Dict


class LLMCallbackWrapper:
    """Wrapper class that adds callback support to an LLM."""

    def __init__(self, llm_instance):
        self._llm = llm_instance
        self._callbacks = {
            "before_request": [],  # Before request is sent
            "after_request": [],  # After response is received
            "on_error": [],  # When an error occurs
        }
        self._wrap_methods()

    def _wrap_methods(self):
        """Wrap common LLM methods with callback hooks."""
        # Common method names
        method_names = ["completion", "chat", "generate", "run", "call", "__call__"]

        for name in method_names:
            if hasattr(self._llm, name) and callable(getattr(self._llm, name)):
                original_method = getattr(self._llm, name)

                # Check whether method is asynchronous
                is_async = inspect.iscoroutinefunction(original_method)

                if is_async:

                    @functools.wraps(original_method)
                    async def async_wrapped(*args, **kwargs):
                        # Run pre-request callbacks
                        request_data = {"args": args, "kwargs": kwargs}
                        self._execute_callbacks("before_request", request_data)

                        try:
                            # Call original method
                            result = await original_method(*args, **kwargs)

                            # Run post-request callbacks
                            response_data = {
                                "request": request_data,
                                "response": result,
                            }
                            self._execute_callbacks("after_request", response_data)

                            # Save conversation in workspace if enabled
                            current_dir = os.getcwd()
                            if "workspace" in current_dir:
                                self._save_conversation_to_file(args, kwargs, result)

                            return result
                        except Exception as e:
                            # Error callbacks
                            error_data = {
                                "request": request_data,
                                "error": str(e),
                                "exception": e,
                            }
                            self._execute_callbacks("on_error", error_data)
                            raise

                    # Replace with wrapped async method
                    setattr(self, name, async_wrapped)
                else:

                    @functools.wraps(original_method)
                    def wrapped(*args, **kwargs):
                        # Run pre-request callbacks
                        request_data = {"args": args, "kwargs": kwargs}
                        self._execute_callbacks("before_request", request_data)

                        try:
                            # Call original method
                            result = original_method(*args, **kwargs)

                            # Run post-request callbacks
                            response_data = {
                                "request": request_data,
                                "response": result,
                            }
                            self._execute_callbacks("after_request", response_data)

                            return result
                        except Exception as e:
                            # Error callbacks
                            error_data = {
                                "request": request_data,
                                "error": str(e),
                                "exception": e,
                            }
                            self._execute_callbacks("on_error", error_data)
                            raise

                    # Replace with wrapped sync method
                    setattr(self, name, wrapped)

    def _save_conversation_to_file(self, args, kwargs, result):
        """Persist prompt/response to a file when enabled."""
        try:
            # Check environment flag for conversation persistence
            if os.environ.get("SAVE_LLM_CONVERSATION", "0") == "1":
                prompt = kwargs.get("prompt", "")
                if not prompt and args:
                    prompt = args[0]

                if not prompt:
                    return

                # Append to conversation log file
                with open("llm_conversation.txt", "a", encoding="utf-8") as f:
                    f.write("\n--- LLM REQUEST ---\n")
                    f.write(str(prompt)[:2000])  # Length limit
                    f.write("\n\n--- LLM RESPONSE ---\n")

                    # Extract response content
                    response_content = ""
                    if isinstance(result, str):
                        response_content = result
                    elif isinstance(result, dict) and "content" in result:
                        response_content = result["content"]
                    elif hasattr(result, "content"):
                        response_content = result.content
                    else:
                        response_content = str(result)

                    f.write(response_content[:2000])  # Length limit
                    f.write("\n\n--------------------\n")
        except Exception as e:
            print(f"Error saving conversation to file: {str(e)}")

    def register_callback(self, event_type: str, callback: Callable):
        """Register a callback.

        Args:
            event_type: Event type. One of "before_request", "after_request", or "on_error".
            callback: Callback function that receives event data.
        """
        if event_type in self._callbacks:
            self._callbacks[event_type].append(callback)
            return True
        return False

    def unregister_callback(self, event_type: str, callback: Callable):
        """Unregister a specific callback."""
        if event_type in self._callbacks and callback in self._callbacks[event_type]:
            self._callbacks[event_type].remove(callback)
            return True
        return False

    def clear_callbacks(self, event_type: str = None):
        """Clear callbacks for one event type or all types."""
        if event_type is None:
            # Clear all callback types
            for event in self._callbacks:
                self._callbacks[event] = []
        elif event_type in self._callbacks:
            # Clear one callback type
            self._callbacks[event_type] = []

    def _execute_callbacks(self, event_type: str, data: Dict[str, Any]):
        """Execute callbacks for the given event type."""
        if event_type in self._callbacks:
            for callback in self._callbacks[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    print(f"Callback execution error: {str(e)}")

    def __getattr__(self, name):
        """Forward unknown attributes to the wrapped LLM instance."""
        return getattr(self._llm, name)
