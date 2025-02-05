#!/bin/bash

# カレントディレクトリ以下の全ての attributes.csv をマージするスクリプト

# 出力ファイル名
outfile="merged.csv"

# 出力ファイルにヘッダを書き込む（先頭に directory 列を追加）
echo "directory,original_name,display_name,label_flag" > "$outfile"

# カレントディレクトリ以下の各 attributes.csv を対象にするが、
# その親ディレクトリ名に "test" が含まれている場合はスキップする。
#
# 1. find で attributes.csv のパスを取得し、親ディレクトリ名を付与
# 2. grep で親ディレクトリ名に "test" を含む行を除外（大文字・小文字を区別せず）
# 3. sort でディレクトリ名順にソート
# 4. cut でファイルパスのみ取り出し、最終的に各ファイルを処理

find . -type f -name attributes.csv | while IFS= read -r file; do
    # attributes.csv を含むディレクトリのベースネームを取得
    dir_name=$(basename "$(dirname "$file")")
    echo "${dir_name}:$file"
done | grep -iv 'test' | sort | cut -d: -f2 | while IFS= read -r file; do
    # 再度ディレクトリ名を取得
    dir=$(basename "$(dirname "$file")")
    # ヘッダ行はスキップし、original_name と display_name が両方空でなく、
    # かつ original_name がスキップ対象のキー名でない行のみを抽出して出力
    tail -n +2 "$file" | awk -F, -v d="$dir" '
    BEGIN {
      # スキップ対象のキー名を配列に設定
      skip["fill"];
      skip["fill-opacity"];
      skip["stroke"];
      skip["stroke-opacity"];
      skip["stroke-width"];
      skip["marker-symbol"];
    }
    {
      # 前後の空白を除去（必要に応じて）
      gsub(/^[ \t]+|[ \t]+$/, "", $1);
      gsub(/^[ \t]+|[ \t]+$/, "", $2);
    }
    ($1 != "" || $2 != "") && !( $1 in skip ) {
      print d "," $0
    }'
done >> "$outfile"

echo "マージ完了： $outfile に出力しました。"
