#!/usr/bin/env bash
set -ex

find . -iname "*.shp" | while read -r shpfile; do

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

    # .prj ファイルがない場合、EPSG:6676 を使用して変換
    if [ ! -f "$prj_file" ]; then
        ogr2ogr -f "ESRI Shapefile" -s_srs EPSG:6676 -t_srs EPSG:4326 -lco ENCODING=UTF-8 "$temp_file" "$shpfile"
    else
        # .prj ファイルがある場合はそのまま変換
        ogr2ogr -f "ESRI Shapefile" -t_srs EPSG:4326 -lco ENCODING=UTF-8 "$temp_file" "$shpfile"
    fi

    # 一時ファイルからGeoJSONに変換
    ogr2ogr -f GeoJSON "$output_dir/data.geojson" "$temp_file"
    rm -f "$temp_file" # 一時ファイルの削除
    echo "Convert Shape to data.geojson"
done
