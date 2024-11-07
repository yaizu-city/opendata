#!/bin/bash

# 作成するディレクトリを探索
for dir in */; do
  # ディレクトリ名の末尾のスラッシュを取り除く
  category=$(basename "$dir")

  # ディレクトリ内のファイルを探索
  for file in "$dir"*; do
    # 拡張子なしのファイル名を取得
    filename=$(basename "$file" | sed 's/\.[^.]*$//')

    # config.ymlの内容を設定
    config_content="category: $category
name: $filename
dataType: location"

    # config.ymlをファイルのあるディレクトリに作成
    echo "$config_content" > "${dir}config.yml"
    echo "Created ${dir}config.yml with content:"
    echo "$config_content"
  done
done
