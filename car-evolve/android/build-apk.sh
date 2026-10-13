#!/usr/bin/env bash
# Baut CarEvolvePlus.apk ohne Gradle (aapt2 + javac + d8 + apksigner).
# Benötigt: ANDROID_HOME mit platforms;android-34 und build-tools;35.0.0, JDK 17+.
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/35.0.0"
JAR="$SDK/platforms/android-34/android.jar"
OUT=build
rm -rf "$OUT"; mkdir -p "$OUT/assets/www/js" "$OUT/classes" "$OUT/res"

# Spiel-Dateien als Assets
cp ../index.html ../icon.png ../manifest.json "$OUT/assets/www/"
cp ../js/*.js "$OUT/assets/www/js/"

# Ressourcen
"$BT/aapt2" compile --dir res -o "$OUT/res/res.zip"
"$BT/aapt2" link -o "$OUT/unsigned.apk" -I "$JAR" --manifest AndroidManifest.xml \
  -A "$OUT/assets" "$OUT/res/res.zip" --min-sdk-version 21 --target-sdk-version 34

# Java -> dex
javac -source 8 -target 8 -bootclasspath "$JAR" -classpath "$JAR" -d "$OUT/classes" -nowarn -Xlint:-options \
  $(find src -name '*.java')
"$BT/d8" --release --min-api 21 --lib "$JAR" --output "$OUT" $(find "$OUT/classes" -name '*.class')
(cd "$OUT" && zip -q unsigned.apk classes.dex)

# Ausrichten & signieren
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
if [ ! -f carevolve.keystore ]; then
  keytool -genkeypair -keystore carevolve.keystore -alias carevolve -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass carevolve -keypass carevolve -dname "CN=Car Evolve Plus, O=speedpeed, C=DE"
fi
"$BT/apksigner" sign --ks carevolve.keystore --ks-pass pass:carevolve --key-pass pass:carevolve \
  --out ../CarEvolvePlus.apk "$OUT/aligned.apk"
"$BT/apksigner" verify ../CarEvolvePlus.apk
rm -f ../CarEvolvePlus.apk.idsig
echo "Fertig: $(cd .. && pwd)/CarEvolvePlus.apk"
