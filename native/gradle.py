"""Fügt zusätzliche Bibliotheken in android/app/build.gradle ein (beim Bau auf GitHub).

Aufruf: python3 native/gradle.py android/app/build.gradle
"""
import re
import sys

DEPS = [
    # Texterkennung auf dem Gerät (Modell in der App enthalten, kein Internet nötig)
    "implementation 'com.google.mlkit:text-recognition:16.0.1'",
    # App-Sperre mit Fingerabdruck / Display-Sperre
    "implementation 'androidx.biometric:biometric:1.1.0'",
    # Fotos nach Inhalt erkennen (Katze, Hund, Essen …), Modell in der App, offline
    "implementation 'com.google.mlkit:image-labeling:17.0.9'",
    # genaueres Zusatzmodell (ImageNet, 1000 Klassen) aus assets/imagenet.tflite
    "implementation 'com.google.mlkit:image-labeling-custom:17.0.3'",
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
# Modelle unkomprimiert einpacken (werden direkt aus der APK gelesen)
if "noCompress" not in src:
    a = re.search(r"^android\s*\{", src, re.M)
    if a:
        src = src[: a.end()] + "\n    androidResources { noCompress 'tflite' }" + src[a.end():]
open(path, "w", encoding="utf-8").write(src)
print("build.gradle ergänzt:", add.strip() or "(schon vorhanden)")
