from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MULTIPLAYER = ROOT / "multiplayer.js"


def main():
    text = MULTIPLAYER.read_text(encoding="utf-8")
    required = [
        "function requestHelper",
        "socket.timeout(2500).emit('request-helper'",
        "showHelperError",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        print("Multiplayer helper client test failed: missing " + ", ".join(missing))
        return 1

    print("multiplayer helper client tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
