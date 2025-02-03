#!/usr/bin/env bash

set -ex

# Excel をダウンロードするURL
# https://docs.google.com/spreadsheets/d/FileID/export?format=xlsx&gid=SHEETID

# Download the file
FileID="1VqKGwhcFGNTUulW0ywBeOOYyF9RFSv8eQA2dlzERcEM"
SHEETID="1504258751"
OUTPUT_FILE="output.xlsx"

rm -f "${OUTPUT_FILE}"

curl -L -o "${OUTPUT_FILE}" "https://docs.google.com/spreadsheets/d/${FileID}/export?format=xlsx&gid=${SHEETID}"

# ダウンロードが成功したかどうかの確認
if [[ -f "${OUTPUT_FILE}" ]]; then
    echo "ファイルが正常にダウンロードされました: ${OUTPUT_FILE}"
else
    echo "ファイルのダウンロードに失敗しました。" >&2
    exit 1
fi

./main.sh . "${OUTPUT_FILE}" EPSG:6676

# node ./bin/xlsx2json.js "${OUTPUT_FILE}"
# node bin/configToMenuYAML.js data.json app.yml