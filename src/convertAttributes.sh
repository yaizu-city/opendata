#!/usr/bin/env bash
set -e

# 引数が指定されていない場合はエラーを出力
if [ "$#" -eq 0 ]; then
    echo "Usage: $0 <directory1> [directory2 ...]"
    exit 1
fi

# 指定されたディレクトリをループ
for dir in "$@"; do
    echo "Processing directory: $dir"

    # 指定ディレクトリ内の.geojsonファイルを処理
    find "$dir" -iname "*.geojson" | while read -r geojsonfile; do

        echo "Convert Shape to GeoJSON: $geojsonfile"

        # カテゴリディレクトリを生成
        category=$(dirname "$geojsonfile" | xargs basename)
        output_dir="build/$category"
        geojson_file="${output_dir}/data.geojson"

        # ------------------------------
        # 属性名変換
        # ------------------------------
        translate_file="data/$category/attributes.csv"
        mapping_file="data/$category/attributes.json"

        if [ ! -f "$translate_file" ];then
            echo "Attribute translate file not found: $translate_file"
            continue
        fi

        # CSV から JSON マッピングファイルを生成
        node src/csv2json.js "$translate_file"

        if [ ! -f "$mapping_file" ]; then
            echo "Mapping file not generated: $mapping_file"
            continue
        fi

        # GeoJSON 属性名変換と_titleキー追加
        jq --slurpfile mapping "$mapping_file" '
            .features |= map(
                # 1回目のループ: キー名の変換
                .properties |= with_entries(
                    .key as $key |
                    if ($mapping[0][] | select(.original_name == $key)) then
                        .key = ($mapping[0][] | select(.original_name == $key) | .display_name)
                    else
                        .
                    end
                )
            ) |
            .features |= map(
                # 2回目のループ: label_flagが1の時に_titleキーを追加
                ($mapping[0][] | select(.label_flag == "1")) as $entry |
                if (.properties[$entry.display_name] != null) then
                    .properties["_title"] = .properties[$entry.display_name]
                else
                    .
                end
            )
        ' "$geojson_file" > "${geojson_file}.tmp"

        mv "${geojson_file}.tmp" "$geojson_file"
        echo "Saved converted GeoJSON to $geojson_file"
    done
done
