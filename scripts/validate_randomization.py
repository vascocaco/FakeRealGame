from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"


def main():
    source = DATA_JS.read_text(encoding="utf-8")
    failures = []

    if "sort(() => Math.random() - 0.5)" in source:
        failures.append("data.js still uses biased random comparator shuffling")

    if "function shuffle(" not in source:
        failures.append("data.js must use an explicit shuffle helper")

    if "for (let i = copy.length - 1; i > 0; i -= 1)" not in source:
        failures.append("shuffle helper must use a Fisher-Yates pass")

    if "randomInt(" not in source:
        failures.append("shuffle helper must pick random swap indexes through randomInt")

    if "function buildBalancedRoundSet(" not in source:
        failures.append("buildGame must select questions through a balanced random round-set helper")

    if "recentQuestionKeys" not in source:
        failures.append("buildGame must track recent question keys to reduce immediate repeats")

    if "groupRoundsByCategory" not in source:
        failures.append("buildGame must group rounds by category before selection")

    if failures:
        for failure in failures:
            print(f"Randomization validation failed: {failure}")
        return 1

    print("Randomization OK: buildGame uses Fisher-Yates shuffling.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
