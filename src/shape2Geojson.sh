#!/usr/bin/env bash
set -ex

find . -name "*.shp" | while read -r shpfile; do

    echo "Convert Shape to GeoJSON: $shpfile"
    
    base=$(dirname "$shpfile")/$(basename "$shpfile" .shp)

    # .prj ファイルが Shift_JIS だと ogr2ogr でエラーが出るので UTF-8 に変換
    if [ -f "${base}.prj" ]; then
        encoding=$(nkf --guess "${base}.prj")
        if [ "$encoding" = "Shift_JIS" ]; then
            nkf --overwrite -w "${base}.prj"
        fi
    fi
    
    # TODO cpg ファイルがあれば使うように修正
    ogr2ogr -f GeoJSON -oo ENCODING=CP932 -t_srs crs:84 "${base}.geojson" "$shpfile"
    echo "Convert Shape to  ${base}.geojson"
done