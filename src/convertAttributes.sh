#!/usr/bin/env bash
set -ex

# 引数が指定されていない場合はエラーを出力
if [ "$#" -eq 0 ]; then
    echo "Usage: $0 <directory1> [directory2 ...]"
    exit 1
fi

# 指定されたディレクトリをループ
for dir in "$@"; do
    echo "Processing directory: $dir"

    # 指定ディレクトリ内の.geojsonファイルを処理
    find "$dir" -iname "*.geojson" | while read -r input_geojsonfile; do
        echo "Convert Shape to GeoJSON: $input_geojsonfile"

        # カテゴリディレクトリを生成
        category=$(dirname "$input_geojsonfile" | xargs basename)
        output_dir="build/$category"
        mkdir -p "$output_dir"
        output_geojson_file="${output_dir}/data.geojson"

        if [ ! -f "$input_geojsonfile" ]; then
            echo "Input file not found: $input_geojsonfile"
            exit 1
        fi

        if [ ! -f "$output_geojson_file" ]; then
            touch "$output_geojson_file"
        fi

        # ------------------------------
        # 属性名変換
        # ------------------------------
        translate_file="data/$category/attributes.csv"
        mapping_file="data/$category/attributes.json"

        if [ ! -f "$translate_file" ]; then
            echo "Attribute translate file not found: $translate_file"
            continue
        fi

        # CSV から JSON マッピングファイルを生成
        node src/csv2json.js "$translate_file"

        if [ ! -f "$mapping_file" ]; then
            echo "Mapping file not generated: $mapping_file"
            continue
        fi

        # jqで属性名変換と_titleキー追加
        jq --slurpfile mapping "$mapping_file" '
        $mapping[0] as $m |
        # 1回目のループ: キー名変換
        .features |= map(
            .properties |= with_entries(
            .key as $key |
            if ($m[]? | select(.original_name == $key)) then
                .key = ($m[] | select(.original_name == $key) | .display_name)
            else
                .
            end
            )
        ) |
        # 2回目のループ: label_flag == "1" のときtitleキーを追加
        .features |= map(
            reduce ($m[] | select(.label_flag == "1")) as $entry (.;
            if .properties[$entry.display_name] != null then
                .properties["title"] = .properties[$entry.display_name]
            else
                .
            end
            )
        ) |
        # 3回目のループ: CSVの属性順に並び替える
        .features |= map(
            .properties as $original |
            .properties = (reduce ($m[]|select(.display_name?)) as $field ({}; .[$field.display_name] = $original[$field.display_name])
                        + {"title": $original.title})
        )
        ' "$input_geojsonfile" > "${output_geojson_file}.tmp"

        mv "${output_geojson_file}.tmp" "$output_geojson_file"
        echo "Saved converted GeoJSON to $output_geojson_file"
    done
done
