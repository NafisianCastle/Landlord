#!/usr/bin/env bash
set -euo pipefail
# Requires ffmpeg. Generate the images first with generate-brand-assets.mjs.
asset_dir="${1:-work/brand-kit}"
filters=()
for index in 0 1 2 3; do
  filters+=("[${index}:v]zoompan=z=1.01+0.0002*on:x=iw/2-iw/zoom/2:y=ih/2-ih/zoom/2:d=1:s=1080x1920:fps=25,fade=t=in:st=0:d=0.12,fade=t=out:st=3.88:d=0.12,setsar=1[v${index}]")
done
filter_graph="$(IFS=';'; echo "${filters[*]}");[v0][v1][v2][v3]concat=n=4:v=1:a=0,format=yuv420p[v]"
ffmpeg -hide_banner -loglevel error \
  -loop 1 -framerate 25 -t 4 -i "$asset_dir/reel-scenes/01.png" \
  -loop 1 -framerate 25 -t 4 -i "$asset_dir/reel-scenes/02.png" \
  -loop 1 -framerate 25 -t 4 -i "$asset_dir/reel-scenes/03.png" \
  -loop 1 -framerate 25 -t 4 -i "$asset_dir/reel-scenes/04.png" \
  -filter_complex "$filter_graph" -map '[v]' -c:v libx264 -preset fast \
  -crf 20 -threads 2 -movflags +faststart "$asset_dir/landlord-reel.mp4" -y
