import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "questions.json"


def fail(message):
    print(f"Question database validation failed: {message}", file=sys.stderr)
    return False


def validate_question(question, index):
    ok = True
    label = f"questions[{index}]"

    if not isinstance(question, dict):
        return fail(f"{label} must be an object")

    if not isinstance(question.get("category"), str) or not question["category"].strip():
        ok = fail(f"{label}.category must be a non-empty string") and ok

    if not isinstance(question.get("hint"), str) or len(question["hint"].strip()) < 20:
        ok = fail(f"{label}.hint must be a helpful string") and ok

    options = question.get("options")
    if not isinstance(options, list) or len(options) != 4:
        return fail(f"{label}.options must contain exactly 4 options") and ok

    words = set()
    fake_count = 0
    for option_index, option in enumerate(options):
        option_label = f"{label}.options[{option_index}]"
        if not isinstance(option, dict):
            ok = fail(f"{option_label} must be an object") and ok
            continue
        word = option.get("word")
        if not isinstance(word, str) or not word.strip():
            ok = fail(f"{option_label}.word must be a non-empty string") and ok
        else:
            normalized = word.strip().lower()
            if normalized in words:
                ok = fail(f'{label} contains duplicate option word "{word}"') and ok
            words.add(normalized)
        if not isinstance(option.get("fake"), bool):
            ok = fail(f"{option_label}.fake must be boolean") and ok
        elif option["fake"]:
            fake_count += 1

    if fake_count != 1:
        ok = fail(f"{label} must contain exactly one fake option") and ok

    return ok


def main():
    if not DB_PATH.exists():
        return 1 if not fail(f"missing {DB_PATH.relative_to(ROOT)}") else 0

    try:
        database = json.loads(DB_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"invalid JSON: {error}")
        return 1

    ok = True
    categories = database.get("categories")
    questions = database.get("questions")

    if not isinstance(categories, list) or len(categories) < 10:
        ok = fail("categories must contain at least 10 category names") and ok

    if not isinstance(questions, list):
        ok = fail("questions must be an array") and ok
    else:
        if len(questions) != 250:
            ok = fail(f"questions must contain exactly 250 entries, found {len(questions)}") and ok
        for index, question in enumerate(questions):
            ok = validate_question(question, index) and ok

    if not ok:
        return 1

    print(f"Question database OK: {len(questions)} questions across {len(categories)} categories.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
