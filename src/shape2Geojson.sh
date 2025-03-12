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

        # $dir が / で終わっている場合は削除
        output_dir="${dir%/}"
        echo "Output directory: $output_dir"

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
    done
done
