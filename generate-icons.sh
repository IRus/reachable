#!/bin/bash
# Пересобирает иконки PWA из icon.svg. Нужен ImageMagick: brew install imagemagick
set -e

src="${1:-icon.svg}"
out="public/icons"

mkdir -p "${out}"

magick -background none "${src}" -resize 192x192 "${out}/icon-192.png"
magick -background none "${src}" -resize 512x512 "${out}/icon-512.png"
magick -background none "${src}" -resize 180x180 "${out}/apple-touch-icon.png"

# Maskable-иконку Android обрезает по кругу. Безопасны только центральные 80%,
# поэтому рисунок ужимаем до 410 px и добавляем поля цветом фона.
magick -background "#0d1117" "${src}" -resize 410x410 -gravity center -extent 512x512 \
  "${out}/icon-maskable-512.png"

magick -background none "${src}" -define icon:auto-resize=16,32,48 "${out}/favicon.ico"

echo "Готово: ${out}"
