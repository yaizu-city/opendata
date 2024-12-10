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

    # 指定ディレクトリ内の.shpファイルを処理
    find "$dir" -iname "*.shp" | while read -r shpfile; do

        echo "Convert Shape to GeoJSON: $shpfile"

        # ベースファイル名とカテゴリディレクトリを生成
        base=$(basename "$shpfile" .shp)
        category=$(dirname "$shpfile" | xargs basename)
        output_dir="build/$category"

        # 出力ディレクトリが存在しない場合は作成
        if [ ! -d "$output_dir" ]; then
            mkdir -p "$output_dir"
        fi

        # .prj ファイルの存在確認と Shift_JIS から UTF-8 への変換
        prj_file="${shpfile%.shp}.prj"
        if [ -f "$prj_file" ]; then
            encoding=$(nkf --guess "$prj_file")
            if [ "$encoding" = "Shift_JIS" ]; then
                nkf --overwrite -w "$prj_file"
            fi
        fi

        # シェープファイルを一時ファイルに変換し、EPSG:4326 に変換して UTF-8 に設定
        temp_file="${output_dir}/${base}_temp.shp"
        geojson_file="${output_dir}/data.geojson"

        if [ ! -f "$prj_file" ]; then
            # .prj ファイルがない場合、EPSG:6676 を使用して変換
            ogr2ogr -f "ESRI Shapefile" -s_srs EPSG:6676 -t_srs EPSG:4326 -lco ENCODING=UTF-8 "$temp_file" "$shpfile"
        else
            # .prj ファイルがある場合はそのまま変換
            ogr2ogr -f "ESRI Shapefile" -t_srs EPSG:4326 -lco ENCODING=UTF-8 "$temp_file" "$shpfile"
        fi

        # 一時ファイルからGeoJSONに変換
        ogr2ogr -f GeoJSON "$geojson_file" "$temp_file"
        rm -f "${temp_file}"* # 関連する一時ファイルの削除
        echo "Converted Shape to GeoJSON: $geojson_file"

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
