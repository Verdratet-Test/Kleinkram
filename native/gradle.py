"""Fügt zusätzliche Bibliotheken in android/app/build.gradle ein (beim Bau auf GitHub).

Aufruf: python3 native/gradle.py android/app/build.gradle
"""
import re
import sys

DEPS = [
    # Texterkennung auf dem Gerät (Modell in der App enthalten, kein Internet nötig)
    "implementation 'com.google.mlkit:text-recognition:16.0.1'",
]

path = sys.argv[1]
src = open(path, encoding="utf-8").read()
m = re.search(r"^dependencies\s*\{", src, re.M)
if not m:
    sys.exit("dependencies-Block nicht gefunden")
add = "".join(f"\n    {d}" for d in DEPS if d not in src)
src = src[: m.end()] + add + src[m.end():]
open(path, "w", encoding="utf-8").write(src)
print("build.gradle ergänzt:", add.strip() or "(schon vorhanden)")
