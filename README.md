# LLM Evaluation Harness

The LLM Evaluation Harness is an API-first backend system that allows AI developers to systematically evaluate the quality of LLM outputs across multiple dimensions, track evaluation scores over time, and detect regressions when any part of their system changes.

The core insight the system is built around: most real-world LLM tasks do not have a single correct answer. A customer support bot, a document summarizer, a code reviewer — all of these produce outputs that must be judged on dimensions like correctness, tone, faithfulness, and conciseness simultaneously. When a developer changes their system prompt, swaps their model, or tunes their RAG pipeline, they need to know *exactly* what got better and what got worse across all those dimensions. This system provides that infrastructure.

## Installation

...

## Usage

...

## Project Progress

<!-- AUTO-GENERATED:START -->

### Current Progress
- Application configuration management using Pydantic settings for database, LLMs, and logging.
- Structured and human-readable logging setup using Loguru.
- Asynchronous PostgreSQL database connection, ORM base, and session management using SQLAlchemy 2.0.
- Fully defined SQLAlchemy ORM models (`Dataset`, `TestCase`) with UUIDs, timestamps, JSONB fields, and relationships.
- Pydantic schemas for API request/response validation (`DatasetCreate`, `DatasetResponse`, `TestCaseCreate`, `TestCaseResponse`).
- An automated script (`scripts/update_readme.py`) for generating and updating the `README.md` using the Google Gemini API based on the repository content.

### Recent State
The repository currently establishes a strong foundational backend for a data management service, specifically focused on datasets and their associated test cases. It leverages modern Python practices with Pydantic for settings, Loguru for logging, and SQLAlchemy 2.0 with PostgreSQL for data persistence. While the core infrastructure, data models, and API schemas are well-defined, the actual FastAPI application entry point and the API endpoints for managing datasets and test cases are still placeholders, meaning the application is not yet functional. An interesting addition is the auto-generated README script, indicating a focus on maintainability and documentation.

### Next Steps
1.  **Implement FastAPI Application and API Endpoints:** Populate `app/main.py` to initialize the FastAPI app and define the CRUD (Create, Read, Update, Delete) API endpoints for datasets and test cases in `app/api/datasets.py`.
2.  **Develop Comprehensive Test Suite:** Write unit and integration tests in `tests/test_datasets.py` to ensure the correctness of data models, schemas, and the newly implemented API endpoints, including database interactions.
3.  **Setup Development Environment with Docker Compose:** Create a `docker-compose.yml` to orchestrate PostgreSQL, Ollama, and potentially other services like Groq/Gemini for a complete local development and testing environment.
4.  **Integrate LLM Judging Logic:** Design and implement the core logic for running AI models against test cases and evaluating their responses using the configured Ollama or Groq judge models, making use of `regression_threshold` and `judge_disagreement_threshold` settings.
5.  **Expand Data Models and Schemas:** Consider adding models for 'Models', 'Runs', 'Evaluations', or 'Users' to support the intended AI model evaluation workflow and user management.

<!-- AUTO-GENERATED:END -->
