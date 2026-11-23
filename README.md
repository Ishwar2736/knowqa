# KnowQA – AI-based Document Question Answering System (AID201A, Assignment 1)

A dependency-free website: open `index.html` in any browser (no server, no internet needed).

## Files
- `index.html` – UI (Knowledge Base, Ask, Evaluation, Design & Syntax tabs)
- `engine.js` – KB construction, forward-chaining inference, question templates, evaluation
- `samples.js` – two sample documents + evaluation question sets (15 questions each)
- `app.js` – UI wiring · `test.js` – headless test (`node test.js`)

## Technique (no NLP, no RAG)
Semantic network of triples + if-then rules; forward chaining (transitivity, symmetry, inverse, user rules);
default inheritance with exceptions; BFS / exhaustive search; template-based answer generation with proof trees.
Text→KB uses a controlled syntax matched by fixed templates; questions are matched to fixed question patterns.

## Usage
1. Pick a sample or upload `.txt/.md/.csv`, press **Build Knowledge Base**.
2. **Ask Questions** – click an example or type one; expand “Reasoning / proof”.
3. **Evaluation** – runs the test set (editable JSON) and shows accuracy, P/R/F1, coverage, abstention accuracy, time.
Syntax and question patterns are listed in the “Design & Syntax” tab.
