#!/usr/bin/env bash
set -e

# シェープファイル処理ループ
find . -iname "*.shp" | while read -r shpfile; do
    echo "Processing $shpfile"

    # ベースファイル名とカテゴリディレクトリを生成
    base=$(basename "$shpfile" .shp)
    category=$(dirname "$shpfile" | xargs basename)
    output_dir="build/$category"

    # 出力ディレクトリが存在しない場合は作成
    mkdir -p "$output_dir"

    # GeoJSONに変換
    geojson_file="$output_dir/${base}.geojson"
    ogr2ogr -f GeoJSON "$geojson_file" "$shpfile"

    # ------------------------------
    # 属性名変換
    # ------------------------------
    translate_file="data/$category/attributes.csv"
    mapping_file="data/$category/attributes.json"

    if [ ! -f "$translate_file" ]; then
        echo "Attribute translate file not found: $translate_file"
        continue
    fi

    node src/csv2json.js $translate_file

    # 属性名変換を一括で適用
    jq --slurpfile mapping "$mapping_file" '
        .features |= map(
            .properties |= with_entries(
                .key as $key |             # 現在のキーを変数に保存
                if ($mapping[0][] | select(.original_name == $key)) then
                    .key = ($mapping[0][] | select(.original_name == $key) | .display_name)
                else
                    empty  # 一致しないキーを削除
                end
            )
        )
    ' "$geojson_file" > "${geojson_file}.tmp"

    mv "${geojson_file}.tmp" "$geojson_file"
    echo "Saved converted GeoJSON to $geojson_file"
done
