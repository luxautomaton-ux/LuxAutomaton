"""Simple log handling module for web app log capture."""
import threading
from contextlib import contextmanager
from datetime import datetime
from typing import Dict, List

from loguru import logger


# Global log storage
session_logs: Dict[str, List[Dict]] = {}
_lock = threading.Lock()


# Register a custom log handler keyed by session ID
class SessionLogHandler:
    def __init__(self, session_id: str):
        self.session_id = session_id

    def __call__(self, record):
        log_entry = {
            # "time": record["time"].strftime("%Y-%m-%d %H:%M:%S.%f"),
            # "level": record["level"].name,
            "message": record,
            "timestamp": datetime.now().timestamp(),
        }

        with _lock:
            if self.session_id not in session_logs:
                session_logs[self.session_id] = []
            session_logs[self.session_id].append(log_entry)

        # Pass record through to continue processing chain
        return True


class SimpleLogCapture:
    """Simple log capture wrapper with a logger-like interface."""

    def __init__(self, session_id: str):
        self.session_id = session_id

    def info(self, message: str) -> None:
        """Record an info-level log message."""
        add_log(self.session_id, "INFO", message)
        logger.info(message)

    def warning(self, message: str) -> None:
        """Record a warning-level log message."""
        add_log(self.session_id, "WARNING", message)
        logger.warning(message)

    def error(self, message: str) -> None:
        """Record an error-level log message."""
        add_log(self.session_id, "ERROR", message)
        logger.error(message)

    def debug(self, message: str) -> None:
        """Record a debug-level log message."""
        add_log(self.session_id, "DEBUG", message)
        logger.debug(message)

    def exception(self, message: str) -> None:
        """Record an exception-level log message."""
        add_log(self.session_id, "ERROR", message)
        logger.exception(message)


@contextmanager
def capture_session_logs(session_id: str):
    """
    Context manager for capturing logs for a specific session.
    Returns a SimpleLogCapture instance instead of a raw list.
    """
    # Create storage for this session
    with _lock:
        if session_id not in session_logs:
            session_logs[session_id] = []

    # Attach session-specific handler
    handler_id = logger.add(SessionLogHandler(session_id))

    # Create capture wrapper
    log_capture = SimpleLogCapture(session_id)

    try:
        # Return capture object, not raw list
        yield log_capture
    finally:
        # Remove temporary handler
        logger.remove(handler_id)


def add_log(session_id: str, level: str, message: str) -> None:
    """Add a log message to a specific session."""
    with _lock:
        if session_id not in session_logs:
            session_logs[session_id] = []

        session_logs[session_id].append(
            {
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),
                "level": level,
                "message": message,
                "timestamp": datetime.now().timestamp(),
            }
        )


def get_logs(session_id: str) -> List[Dict]:
    """Get logs for a specific session."""
    with _lock:
        return session_logs.get(session_id, [])[:]


def clear_logs(session_id: str) -> None:
    """Clear logs for a specific session."""
    with _lock:
        if session_id in session_logs:
            session_logs[session_id] = []
