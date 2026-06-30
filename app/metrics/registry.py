from app.metrics.base import Metric

_REGISTRY: dict[str, Metric] = {}


def register(metric: Metric) -> None:
    """Add a metric instance to the registry, keyed by its name."""
    _REGISTRY[metric.name] = metric


def get_metric(name: str) -> Metric:
    """Look up a registered metric by name. Raises KeyError if unknown."""
    return _REGISTRY[name]


def list_metrics() -> list[str]:
    """Names of all currently registered metrics."""
    return list(_REGISTRY.keys())
