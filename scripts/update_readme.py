from pathlib import Path
from google import genai

import os

client = genai.Client(
    api_key=os.environ["GEMINI_API_KEY"]
)

repo_content = []

allowed_extensions = {
    ".py",
    ".md",
    ".yaml",
    ".yml",
    ".json",
    ".toml",
}

for path in Path(".").rglob("*"):
    if path.suffix not in allowed_extensions:
        continue

    if "venv" in path.parts:
        continue

    if "__pycache__" in path.parts:
        continue

    try:
        content = path.read_text(encoding="utf-8")
        repo_content.append(
            f"\nFILE: {path}\n"
            f"{content[:3000]}"
        )
    except Exception:
        pass

prompt = f"""
Analyze this repository.

Write ONLY the following markdown:

### Current Progress
- completed features
- implemented modules
- important files

### Recent State
A short paragraph describing the current state.

### Next Steps
3-5 suggested next tasks.

Repository:

{''.join(repo_content)}
"""

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
)

generated = response.text

readme = Path("README.md").read_text()

start = "<!-- AUTO-GENERATED:START -->"
end = "<!-- AUTO-GENERATED:END -->"

before = readme.split(start)[0]
after = readme.split(end)[1]

new_readme = (
    before
    + start
    + "\n\n"
    + generated
    + "\n\n"
    + end
    + after
)

Path("README.md").write_text(new_readme)