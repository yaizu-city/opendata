#!/bin/bash

set -e

while read -r dir; do
  [[ -z "$dir" ]] && continue
  DIR_NAME=$(basename "$dir")
  TILE_DIR="./build/tiles/$DIR_NAME"
  TILE_URL="https://yaizu-smartcity-jp-frontend-v1.s3.ap-northeast-1.amazonaws.com/tiles/$DIR_NAME/{z}/{x}/{y}.pbf"
  ATTR_FILE="$dir/attributes.csv"

  mkdir -p "$TILE_DIR"

  # fields の作成
  if [[ -f "$ATTR_FILE" ]]; then
    FIELDS=$(tail -n +2 "$ATTR_FILE" | cut -d',' -f1 | awk '{ printf "\"%s\": \"description\",", $1 }' | sed 's/,$//')
  else
    FIELDS="\"id\": \"description\""
  fi

  cat <<EOF > "$TILE_DIR/tiles.json"
{
  "tilejson": "3.0.0",
  "name": "$DIR_NAME",
  "description": "$DIR_NAME",
  "attribution": "<a href='https://github.com/yaizu-city/opendata'>焼津オープンデータカタログ</a>",
  "scheme": "xyz",
  "tiles": [
    "$TILE_URL"
  ],
  "minzoom": 9,
  "maxzoom": 14,
  "vector_layers": [
    {
      "id": "$DIR_NAME",
      "fields": {
        $FIELDS
      }
    }
  ]
}
EOF

done < changed_dirs.txt
