#!/usr/bin/env python3
"""Build كلمة اليوم lists from Hermit Dave's FrequencyWords (MIT).

Source file (not committed): content/2018/ar/ar_50k.txt
https://github.com/hermitdave/FrequencyWords
License: MIT, copyright 2016 Hermit Dave.

Normalisation: strip tashkeel and tatweel; أ إ آ ٱ -> ا; ة -> ه; ى -> ي;
ؤ -> و; ئ -> ي; drop a standalone hamza. Keep words that are then exactly
five Arabic letters. Answers are the most frequent 400 after a small
profanity filter. Guesses are every remaining five-letter word, sorted
alphabetically so frequency order is not the client file order.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path("/tmp/ar_50k.txt")
TASH = re.compile(r"[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]")
MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي", "ء": ""})
AR = re.compile(r"^[\u0627-\u064A]+$")
# Whole-word drops. Short stems are avoided so ordinary words stay.
BLOCK = {
    "شرمو", "قحبه", "عاهره", "متناك", "منيوك", "كسامك", "يلعن",
    "زنا", "لعنة",
}
BLOCK_PART = ("كسام", "شرمو", "قحب", "عاهر", "منيوك", "زبري", "نياك")


def norm(word):
    word = TASH.sub("", word).translate(MAP).replace("ـ", "")
    return word


def blocked(word):
    if word in BLOCK:
        return True
    return any(part in word for part in BLOCK_PART)


def main():
    if not SRC.exists():
        sys.exit("missing /tmp/ar_50k.txt — download FrequencyWords content/2018/ar/ar_50k.txt")
    seen = set()
    ranked = []
    dropped = 0
    for line in SRC.read_text(encoding="utf-8").splitlines():
        raw = line.split()
        if not raw:
            continue
        word = norm(raw[0])
        if len(word) != 5 or not AR.match(word) or word in seen:
            continue
        seen.add(word)
        if blocked(word) or len(set(word)) == 1:
            dropped += 1
            continue
        ranked.append(word)
    answers = ranked[:400]
    if len(answers) < 365:
        sys.exit(f"only {len(answers)} answers")
    guesses = sorted(ranked)
    missing = [w for w in answers if w not in guesses]
    if missing:
        sys.exit("answers missing from guesses")
    header = (
        "/* كلمة اليوم lists. Source: Hermit Dave, FrequencyWords, 2018 Arabic 50k.\n"
        "   https://github.com/hermitdave/FrequencyWords  License: MIT.\n"
        "   Normalised alef, hamza carriers, taa marbuta and alef maqsura.\n"
        "   This file is the allowed-guess list. It is not the daily answer order. */\n"
    )
    guess_js = header + "globalThis.KALIMA_GUESSES=" + json_array(guesses) + ";\n"
    ans_js = (
        "/* Daily answers for كلمة اليوم. Same MIT FrequencyWords source as the guess list.\n"
        "   Server only. Do not add this file to the service worker, the artifact, or app.js. */\n"
        "globalThis.KALIMA_ANSWERS=" + json_array(answers) + ";\n"
    )
    (ROOT / "js" / "kalima_guesses.js").write_text(guess_js, encoding="utf-8")
    (ROOT / "supabase" / "functions" / "spider" / "kalima_answers.js").write_text(ans_js, encoding="utf-8")
    print(f"answers {len(answers)} guesses {len(guesses)} dropped {dropped}")


def json_array(words):
    return "[" + ",".join('"' + w + '"' for w in words) + "]"


if __name__ == "__main__":
    main()
