import sys

from loguru import logger

from app.core.config import get_settings

settings = get_settings()


def configure_logging() -> None:
    logger.remove()  # Loguru attaches a default stderr handler on import — remove it
    # first, or you'd get every log line printed twice once we add our own below.

    if settings.log_format == "json":
        logger.add(
            sys.stdout,
            level=settings.log_level,
            serialize=True,  # one structured JSON object per line — what a log
            # aggregator (Datadog, CloudWatch, etc.) in v2 would expect
        )
    else:
        logger.add(
            sys.stdout,
            level=settings.log_level,
            format=(
                "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> "
                "- <level>{message}</level>"
            ),
        )
