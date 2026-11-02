"""Statusleiste und Fensterhintergrund passend zur App (hell/dunkel)."""
import os, re, sys
res = sys.argv[1]
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(text)
write(f"{res}/values/kk_theme.xml", '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="kk_bg">#ECEFE9</color>\n    <bool name="kk_light_bars">true</bool>\n</resources>\n')
write(f"{res}/values-night/kk_theme.xml", '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="kk_bg">#121815</color>\n    <bool name="kk_light_bars">false</bool>\n</resources>\n')
p = f"{res}/values/styles.xml"
s = open(p).read()
items = ('\n        <item name="android:windowBackground">@color/kk_bg</item>'
         '\n        <item name="android:statusBarColor">@color/kk_bg</item>'
         '\n        <item name="android:navigationBarColor">@color/kk_bg</item>'
         '\n        <item name="android:windowLightStatusBar">@bool/kk_light_bars</item>')
s2, n = re.subn(r'(<style name="AppTheme\.NoActionBar"[^>]*>)', lambda m: m.group(1) + items, s)
if n != 1:
    sys.exit("AppTheme.NoActionBar nicht gefunden in styles.xml")
open(p, "w").write(s2)
print("Theme angepasst")
