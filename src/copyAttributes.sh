#!/bin/bash

# 移動元ディレクトリ
source_dir="output"
# 移動先のベースディレクトリ
target_base_dir="data"

# output内のすべてのattributes.csvを探索
find "$source_dir" -type f -name "attributes.csv" | while read -r file; do
    # attributes.csvの直前のディレクトリ名を取得
    dir_name=$(basename "$(dirname "$file")")
    
    # マッピングを確認
    if [[ -v mapping["$dir_name"] ]]; then
        # JSONマッピングに基づく移動先ディレクトリ
        target_dir_name=${mapping["$dir_name"]}
    else
        # 親ディレクトリ名をそのまま使用
        target_dir_name="$dir_name"
    fi

    # 移動先ディレクトリパスを作成
    target_dir="$target_base_dir/$target_dir_name"

    # 移動先ディレクトリが存在する場合にのみ処理を実行
    if [ -d "$target_dir" ]; then
        # ファイルを移動
        echo "Moving $file to $target_dir"
        mv "$file" "$target_dir/"
        
        # 元のディレクトリが空か確認し、空なら削除
        parent_dir=$(dirname "$file")
        if [ -z "$(ls -A "$parent_dir")" ]; then
            echo "Removing empty directory: $parent_dir"
            rmdir "$parent_dir"
        fi
    else
        echo "Target directory $target_dir does not exist, skipping $file"
    fi
done
