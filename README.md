# LLM Evaluation Harness

The LLM Evaluation Harness is an API-first backend system that allows AI developers to systematically evaluate the quality of LLM outputs across multiple dimensions, track evaluation scores over time, and detect regressions when any part of their system changes.

The core insight the system is built around: most real-world LLM tasks do not have a single correct answer. A customer support bot, a document summarizer, a code reviewer — all of these produce outputs that must be judged on dimensions like correctness, tone, faithfulness, and conciseness simultaneously. When a developer changes their system prompt, swaps their model, or tunes their RAG pipeline, they need to know *exactly* what got better and what got worse across all those dimensions. This system provides that infrastructure.
