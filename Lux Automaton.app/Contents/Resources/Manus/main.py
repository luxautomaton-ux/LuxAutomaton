import argparse
import asyncio
import os
import sys

from app.agent.manus import Manus
from app.logger import logger


async def run_cli():
    """Run interactive CLI mode."""
    agent = Manus()
    while True:
        try:
            prompt = input("Enter your prompt (or 'exit'/'quit' to quit): ")
            prompt_lower = prompt.lower()
            if prompt_lower in ["exit", "quit"]:
                logger.info("Goodbye!")
                break
            if not prompt.strip():
                logger.warning("Skipping empty prompt.")
                continue
            logger.warning("Processing your request...")
            await agent.run(prompt)
        except KeyboardInterrupt:
            logger.warning("Goodbye!")
            break


async def run_web():
    """Start web application mode."""
    # Run uvicorn in the current process
    import uvicorn

    # Ensure required directories exist
    from web_run import check_websocket_dependencies, ensure_directories

    ensure_directories()

    if not check_websocket_dependencies():
        logger.error("Exiting application. Install required dependencies and retry.")
        return

    logger.info("Starting OpenManus web application...")
    logger.info("Open http://localhost:8000 to begin")

    # Enable automatic browser launch
    os.environ["AUTO_OPEN_BROWSER"] = "1"

    # Start Uvicorn server in current process
    uvicorn.run("app.web.app:app", host="0.0.0.0", port=8000)


def main():
    """Entry point; choose CLI or web mode."""
    parser = argparse.ArgumentParser(description="OpenManus - AI assistant")
    parser.add_argument("--web", action="store_true", help="Run in web mode (CLI is default)")

    args = parser.parse_args()

    try:
        if args.web:
            # Start web mode
            logger.info("Starting web mode...")
            asyncio.run(run_web())
        else:
            # Start CLI mode
            logger.info("Starting interactive CLI mode...")
            asyncio.run(run_cli())
    except KeyboardInterrupt:
        logger.warning("Program exited")
    except Exception as e:
        logger.error(f"Program exited with an error: {str(e)}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
