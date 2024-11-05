#!/usr/bin/env bash
set -ex

mkdir bin
curl https://github.com/geolonia/smartcity-smartmap-v2-cli/blob/main/main.sh -O
curl https://github.com/geolonia/smartcity-smartmap-v2-cli/blob/main/package.json -O

# bin ディレクトリにダウンロード
curl https://github.com/geolonia/smartcity-smartmap-v2-cli/blob/main/configToMenuYAML.js -O
mv configToMenuYAML.js bin/

curl https://github.com/geolonia/smartcity-smartmap-v2-cli/blob/main/xlsx2json.js -O
mv xlsx2json.js bin/