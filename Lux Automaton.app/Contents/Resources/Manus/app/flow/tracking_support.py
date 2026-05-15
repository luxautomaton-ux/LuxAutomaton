"""Flow execution tracking support."""
from functools import wraps

from app.web.thinking_tracker import ThinkingTracker


class FlowTracker:
    """Tracks flow execution and records thinking steps."""

    @staticmethod
    def patch_flow(flow_obj, session_id: str):
        """Apply tracking patch to a flow object."""
        if not hasattr(flow_obj, "_original_execute"):
            # Save original execute method
            flow_obj._original_execute = flow_obj.execute

            # Attach session ID
            flow_obj._tracker_session_id = session_id

            # Replace execute method with tracked version
            @wraps(flow_obj._original_execute)
            async def tracked_execute(prompt, *args, **kwargs):
                # Add thinking step before execution
                ThinkingTracker.add_thinking_step(session_id, "Flow execution started")

                # Track sub-step execution
                if hasattr(flow_obj, "_execute_step"):
                    original_step = flow_obj._execute_step

                    @wraps(original_step)
                    async def tracked_step():
                        if hasattr(flow_obj, "current_step_description"):
                            step_desc = flow_obj.current_step_description
                            ThinkingTracker.add_thinking_step(session_id, f"Executing step: {step_desc}")
                        else:
                            ThinkingTracker.add_thinking_step(session_id, "Executing flow step")

                        result = await original_step()
                        return result

                    flow_obj._execute_step = tracked_step

                # Execute original method
                result = await flow_obj._original_execute(prompt, *args, **kwargs)

                # Add thinking step after execution
                ThinkingTracker.add_thinking_step(session_id, "Flow execution completed")

                return result

            flow_obj.execute = tracked_execute

            return True
        return False
