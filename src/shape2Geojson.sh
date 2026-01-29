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

        # シェープファイルをGeoJSONに変換（EPSG:4326）
        geojson_file="${output_dir}/data.geojson"

        if [ ! -f "$prj_file" ]; then
            # .prj ファイルがない場合、EPSG:6676 を使用して変換
            ogr2ogr -f "GeoJSON" -s_srs EPSG:6676 -t_srs EPSG:4326 "$geojson_file" "$shpfile"
        else
            # .prj ファイルがある場合はそのまま変換
            ogr2ogr -f "GeoJSON" -t_srs EPSG:4326 "$geojson_file" "$shpfile"
        fi

        echo "Converted Shape to GeoJSON: $geojson_file"
    done
done
