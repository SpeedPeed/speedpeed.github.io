# Car Evolve+

Ein Offline-Fahrspiel im Stil von *Car Evolve* – mit deutlich mehr Inhalt:

- **12 Welten** mit eigener Physik (Eis, Mond-/Mars-/Asteroiden-Schwerkraft, federnder Süßigkeitenboden, Boost-Pads in Neon City, Rampen, Krater …)
- **9 Fahrzeuge**, jedes mit 6 Upgrades und **7 Evolutionsstufen** (das Auto verändert sein Aussehen: Spoiler, Rennstreifen, Neon, Gold-Felgen, Aura …)
- **Werkstatt-Upgrades** (Magnet, Münzwert, Tankstellen, Sturzhelm, Startschuss, Stunt-Bonus)
- **Neugeburt** mit Evo-Kernen und **10 Talenten** für endlosen Fortschritt
- Stunts (Salti, Flugzeit), Meilensteine alle 250 m, Nitro, Edelsteine, x2-Sterne
- **Aufträge** (immer 3, werden mit der Zeit schwerer), **17 Erfolge** mit je 6 Stufen
- **Tägliche Belohnung** (7-Tage-Serie) und **Tages-Challenge** mit wechselnden Modifikatoren
- Lackierungen und Spuren, Statistik, Spielstand-Export/-Import

## Spielen

- **Android:** `CarEvolvePlus.apk` herunterladen und installieren (ggf. „Installation aus unbekannten Quellen“ erlauben).
- **Browser:** `index.html` öffnen (Querformat empfohlen). Steuerung am PC: Pfeiltasten/A-D, Leertaste = Nitro, P = Pause.

## APK selbst bauen

```bash
./android/build-apk.sh   # benötigt Android SDK (platforms;android-34, build-tools;35.0.0) und JDK 17+
```

Die APK wird mit `android/carevolve.keystore` signiert (Passwort `carevolve`), damit neue Versionen
über die alte installiert werden können, ohne den Spielstand zu verlieren.
