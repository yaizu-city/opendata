#!/usr/bin/env bash
set -ex

mkdir bin
curl https://raw.githubusercontent.com/geolonia/smartcity-smartmap-v2-cli/main/main.sh -O
curl https://raw.githubusercontent.com/geolonia/smartcity-smartmap-v2-cli/main/package.json -O

# bin ディレクトリにダウンロード
curl https://raw.githubusercontent.com/geolonia/smartcity-smartmap-v2-cli/main/configToMenuYAML.js -O
mv configToMenuYAML.js bin/

curl https://raw.githubusercontent.com/geolonia/smartcity-smartmap-v2-cli/main/xlsx2json.js -O
mv xlsx2json.js bin/