#!/usr/bin/env bash
set -ex

find . -name "*.shp" | while read -r shpfile; do

    echo "Convert Shape to GeoJSON: $shpfile"

    # ベースファイル名とカテゴリディレクトリを生成
    base=$(basename "$shpfile" .shp)
    category=$(dirname "$shpfile" | xargs basename)
    output_dir="build/$category"

    # 出力ディレクトリが存在しない場合は作成
    if [ ! -d "$output_dir" ]; then
        mkdir -p "$output_dir"
    fi

    # .prj ファイルが Shift_JIS だと ogr2ogr でエラーが出るので UTF-8 に変換
    if [ -f "${base}.prj" ]; then
        encoding=$(nkf --guess "${base}.prj")
        if [ "$encoding" = "Shift_JIS" ]; then
            nkf --overwrite -w "${base}.prj"
        fi
    fi

    # シェープファイルを一時ファイルに変換し、EPSG:4326に変換してUTF-8に設定
    temp_file="${output_dir}/${base}_temp.shp"
    ogr2ogr -f "ESRI Shapefile" -t_srs EPSG:4326 -lco ENCODING=UTF-8 "$temp_file" "$shpfile"

    # 一時ファイルからGeoJSONに変換
    ogr2ogr -f GeoJSON -lco ENCODING=UTF-8 "$output_dir/data.geojson" "$temp_file"
    rm -f "$temp_file" # 一時ファイルの削除
    echo "Convert Shape to data.geojson"
done
