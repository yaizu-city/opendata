#!/bin/bash

# 現在のディレクトリ直下のディレクトリをループ処理
for dir in */; do
  # ディレクトリ名にスペースが含まれているか確認
  if [[ "$dir" =~ \  ]]; then
    echo "スペースを含むディレクトリ名: $dir"
  fi
done
