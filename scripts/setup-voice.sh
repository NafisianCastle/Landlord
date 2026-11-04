#!/usr/bin/env bash
set -euo pipefail
# Installs the Piper text-to-speech tool and the two voices used for the brand
# video voiceovers into work/ (gitignored). Generation-time only; nothing here
# ships with the app. Run from the repository root, then run
# scripts/generate-brand-assets.mjs.
root="work"
python3 -m venv "$root/piper"
"$root/piper/bin/pip" install --quiet "piper-tts==1.8.0"
mkdir -p "$root/voices"
base="https://huggingface.co/rhasspy/piper-voices/resolve/main"
for voice in en/en_GB/cori/high/en_GB-cori-high bn/bn_BD/google/medium/bn_BD-google-medium; do
  name="$(basename "$voice")"
  for ext in onnx onnx.json; do
    [ -s "$root/voices/$name.$ext" ] ||
      curl -sSfL -o "$root/voices/$name.$ext" "$base/$voice.$ext"
  done
done
echo "Piper and voices installed in $root/"
