#!/bin/bash
set -e

# nullglob を有効にし、グロブパターンにマッチするファイルがなければ空リストとする
shopt -s nullglob

# CSV ファイルの保存先ディレクトリ（必要に応じてパスを調整）
MAIN_DIR="main_branch_content/data"
CURRENT_DIR="current_branch_content/data"
OUTPUT="comment.txt"

# ヘッダー出力（GitHub のコードブロックを利用して diff 表示できるようにする）
echo "今回更新されたデータの CSV 差分は以下の通りです" > "$OUTPUT"
echo '```diff' >> "$OUTPUT"

# 一時ファイルに差分を集約
TEMP_DIFF=$(mktemp)

# カレントブランチ側の CSV を走査（新規追加・更新ファイルを判定）
for csv in "$CURRENT_DIR"/*.csv; do
    filename=$(basename "$csv")

    main_csv="$MAIN_DIR/$filename"
    if [ -f "$main_csv" ]; then
        echo "◆ $filename の差分" >> "$TEMP_DIFF"
        # 同じファイルが存在する場合、unified diff 形式で出力
        diff -u "$main_csv" "$csv" >> "$TEMP_DIFF" || true
        echo "" >> "$TEMP_DIFF"
    else
        # 新規 CSV ファイルの場合、ファイル名と内容を表示
        echo "+ 新規 CSV ファイル: $filename" >> "$TEMP_DIFF"
        # ファイル全体の内容を行頭に「+」を付けて出力
        sed 's/^/+/g' "$csv" >> "$TEMP_DIFF"
        echo "" >> "$TEMP_DIFF"
    fi
done

# main ブランチ側には存在するが、カレントブランチ側にない CSV をチェック（削除ファイル）
for csv in "$MAIN_DIR"/*.csv; do
    filename=$(basename "$csv")
    current_csv="$CURRENT_DIR/$filename"
    
    if [ ! -f "$current_csv" ]; then
        echo "- 削除された CSV ファイル: $filename" >> "$TEMP_DIFF"
        # 削除されたファイルの全内容を行頭に「-」を付けて出力
        sed 's/^/-/g' "$csv" >> "$TEMP_DIFF"
        echo "" >> "$TEMP_DIFF"
    fi
done

# 一時ファイルの内容を comment.txt に追記
cat "$TEMP_DIFF" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
rm "$TEMP_DIFF"

# 出力内容を標準出力にも出す（GitHub Actions のログに表示されます）
cat "$OUTPUT"
