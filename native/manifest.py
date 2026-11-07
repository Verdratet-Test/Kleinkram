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
    # Wecker mit Aufgabe: pünktlich klingeln, über dem Sperrbildschirm, nach Neustart wieder einplanen
    'android.permission.USE_EXACT_ALARM',
    'android.permission.USE_FULL_SCREEN_INTENT',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.WAKE_LOCK',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
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
# Wecker: Empfänger (Weckzeit, Neustart) und Klingel-Dienst
comp = '''
        <receiver android:name=".WeckerReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
        </receiver>
        <service android:name=".WeckerService" android:exported="false" android:foregroundServiceType="mediaPlayback" />
        <receiver android:name=".KleinkramWidget" android:exported="true" android:label="Kleinkram">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/kk_widget_info" />
        </receiver>
'''
if '.WeckerReceiver' not in s:
    s = s.replace('</application>', comp + '    </application>', 1)
open(p, 'w').write(s)
print('Berechtigungen:', len(lines))
