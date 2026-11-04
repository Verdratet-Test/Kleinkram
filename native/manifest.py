"""Berechtigungen in AndroidManifest.xml eintragen (nach `npx cap add android`)."""
import re, sys
p = sys.argv[1]
s = open(p).read()
perms = [
    'android.permission.CAMERA',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.VIBRATE',
    # Handy aufräumen: Fotos/Videos lesen, Dateien verwalten (immer mit Bestätigung)
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    ('android.permission.READ_EXTERNAL_STORAGE', ' android:maxSdkVersion="32"'),
    'android.permission.MANAGE_EXTERNAL_STORAGE',
    # Ordnung: Aufnahmeort der Fotos lesen (Reise-Alben), nur im Gerät
    'android.permission.ACCESS_MEDIA_LOCATION',
]
lines = []
for x in perms:
    name, extra = (x, '') if isinstance(x, str) else x
    if f'android:name="{name}"' in s:
        continue
    lines.append(f'    <uses-permission android:name="{name}"{extra} />')
anchor = '<uses-permission android:name="android.permission.INTERNET" />'
if anchor not in s:
    sys.exit('INTERNET-Berechtigung als Anker nicht gefunden')
s = s.replace(anchor, anchor + '\n' + '\n'.join(lines), 1)
if 'xmlns:tools=' not in s:
    s = s.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ', 1)
s = s.replace('android.permission.MANAGE_EXTERNAL_STORAGE" />', 'android.permission.MANAGE_EXTERNAL_STORAGE" tools:ignore="ScopedStorage" />')
open(p, 'w').write(s)
print('Berechtigungen:', len(lines))
