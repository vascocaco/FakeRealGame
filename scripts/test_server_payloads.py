from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server.js"


def main():
    text = SERVER.read_text(encoding="utf-8")
    required = [
        "function createRoundStartPayload",
        "function createRoundRevealPayload",
        "function grantPlayerHelper",
        "socket.on('request-helper'",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        print("Server payload test failed: missing " + ", ".join(missing))
        return 1

    start = text.index("function createRoundStartPayload")
    end = text.index("function createRoundRevealPayload")
    start_payload = text[start:end]
    forbidden = ["fake:", "hint:", "evidence:"]
    leaked = [token for token in forbidden if token in start_payload]
    if leaked:
        print("Server payload test failed: round-start payload leaks " + ", ".join(leaked))
        return 1

    print("server payload tests passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
