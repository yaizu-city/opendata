#!/bin/bash

# カレントディレクトリ内のすべての .geojson ファイルを処理
for geojson_file in *.geojson; do
  # 出力ファイル名を作成 (元のファイル名に .modified を追加)
  output_file="${geojson_file%.geojson}.modified.geojson"

  # jq を使用して処理
  jq '
    .features |= map(
      if (.properties | type) == "object" then
        .properties |= with_entries(
          # 型チェックを追加して安全に処理
          if (.value != null and (.value | type) == "string") then
            if (.value | test("\\.(jpg|JPG|png)$")) then
              .value = "https://yaizu-smartcity.jp/" + .value
            else
              .
            end
          else
            .
          end
        )
      else
        .
      end
    )
  ' "$geojson_file" > "$output_file"

  if [ $? -eq 0 ]; then
    echo "Processed: $geojson_file -> $output_file"
  else
    echo "Error processing: $geojson_file"
  fi
done
