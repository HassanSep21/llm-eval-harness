# Importing this subpackage triggers registration of all built-in metrics
# as a side effect — anything that imports from app.metrics.registry can
# rely on the registry already being populated.
from app.metrics import implementations  # noqa: F401
