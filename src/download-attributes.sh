set -ex

# Excel をダウンロードするURL
# https://docs.google.com/spreadsheets/d/FileID/export?format=csv&gid=SHEETID

# ファイル ID を指定
FileID="1UKBhKJiq08XsWPAZulRuQHXhwkLXRqU7"

# SHEETID を配列で指定
SHEETIDS=("661619434" "977448727" "1277912199" "553707381" "1186898120" "755833851" "1887173890" "218186387" "948302602" "1921415730" "970105168" "503741182" "148792956" "9428593" "1188795582" "871216616" "1081210486" "211626859")

# ベース出力ディレクトリ
BASE_OUTPUT_DIR="./output"
mkdir -p "${BASE_OUTPUT_DIR}"

# SHEETID のループ処理
for SHEETID in "${SHEETIDS[@]}"; do
    INPUT_FILE="${BASE_OUTPUT_DIR}/sheet_${SHEETID}.csv"

    # 既存のファイルを削除
    rm -f "${INPUT_FILE}"

    # ファイルをダウンロード
    curl -L -o "${INPUT_FILE}" "https://docs.google.com/spreadsheets/d/${FileID}/export?format=csv&gid=${SHEETID}"

    # ダウンロードの確認
    if [[ -f "${INPUT_FILE}" ]]; then
        echo "ファイルが正常にダウンロードされました: ${INPUT_FILE}"
    else
        echo "ファイルのダウンロードに失敗しました: SHEETID=${SHEETID}" >&2
        exit 1
    fi

    # データモデル名を取得
    MODEL_NAME=$(awk -F',' 'NR==3 {gsub(/ /, "", $3); print $3}' "${INPUT_FILE}")

    # モデル名が取得できない場合、エラー表示
    if [[ -z "${MODEL_NAME}" ]]; then
        echo "モデル名が取得できませんでした: SHEETID=${SHEETID}" >&2
        exit 1
    fi

    # 出力ディレクトリ
    MODEL_OUTPUT_DIR="${BASE_OUTPUT_DIR}/${MODEL_NAME}"
    mkdir -p "${MODEL_OUTPUT_DIR}"

    # ブロックごとに抽出とファイル生成
    awk -F',' -v base_dir="${MODEL_OUTPUT_DIR}" '
        BEGIN { OFS="," }
        /データ属性項目/ { in_section=1; block_name=prev; next }
        /^[^,]/ && in_section { in_section=0 }
        in_section && NR>1 && $3!="" {
            # 属性名（元データ）, 属性名（表示用）の行をスキップ
            if ($3 == "属性名（元データ）" && $4 == "属性名（表示用）") next
            if (!started[block_name]++) {
                subdir=sprintf("%s/%s", base_dir, block_name)
                mkdir_cmd=sprintf("mkdir -p \"%s\"", subdir)
                system(mkdir_cmd)
                file_name=sprintf("%s/attributes.csv", subdir)
                print "original_name,display_name" > file_name
            }
            display_name = ($4 == "" ? $3 : $4) # 属性名（表示用）が空の場合、属性名（元データ）を使用
            print $3, display_name >> file_name
        }
        { prev=$2 }
    ' "${INPUT_FILE}"

    # 処理後、元のファイルを削除
    rm -f "${INPUT_FILE}"
done
