#!/usr/bin/env bash

set -ex


npm install
npm run build-config-json
npm run build-csv

# data/ 配下の各ディレクトリをループ処理
for dir in data/*/; do
  # ディレクトリかどうかを確認
  [ -d "$dir" ] || continue

  echo "Processing directory: $dir"

  # 各ディレクトリパスを引数にしてスクリプトを実行
  node ./src/build-location-data.js "$dir"
  ./src/shape2Geojson.sh "$dir"
done

npm run build-standard-data
npm run build-api