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
# Nur Handy-Prozessoren (ARM) einpacken – spart ~20 MB (x86 gibt es nur im Emulator)
if "abiFilters" not in src:
    d = re.search(r"defaultConfig\s*\{", src)
    if d:
        src = src[: d.end()] + "\n        ndk { abiFilters 'arm64-v8a', 'armeabi-v7a' }" + src[d.end():]
open(path, "w", encoding="utf-8").write(src)
print("build.gradle ergänzt:", add.strip() or "(schon vorhanden)")
