#!/usr/bin/env bash
#
# 地理空間データ連携基盤（smartcity-geospatial-platform-api）へ GeoJSON をアップロードする。
#
# 使い方:
#   bash ./src/sync-to-platform.sh "data/AED設置箇所一覧" "data/公園一覧"
#
# 連携対象は data/<ディレクトリ名>/config.yml に sourceDataId が書かれているデータセットのみ。
# sourceDataId をアップロード API の dataId、config.yml の name を description として渡す。
# sourceDataId が無いデータセットはスキップする（連携はオプトイン）。
#
# アップロードするファイルは build/<ディレクトリ名>/data.geojson（属性名変換済み）。
# 無い場合は data/<ディレクトリ名>/data.geojson にフォールバックする。
#
# 必須の環境変数（値はリポジトリに置かず Actions Secret から渡す）:
#   PLATFORM_UPLOAD_DOMAIN アップロード API のドメイン。自治体ドメインの admin サブドメイン側を指定する。
#                          サーバー側で "admin." を除去して自治体を識別するため、Host はこのままでよい。
#   PLATFORM_API_KEY       アップロード API の x-api-key
# 任意の環境変数:
#   PLATFORM_NOTIFY_EMAIL  処理結果の通知先メールアドレス
#   PLATFORM_POLL_ATTEMPTS タイル生成完了を待つ回数（既定 40、0 で待たずに終了）
#   PLATFORM_POLL_INTERVAL ポーリング間隔の秒数（既定 15）
#   PLATFORM_UPLOAD_SCHEME アップロード先のスキーム（既定 https）。テストでローカルの
#                          スタブサーバーに向けるためだけに使う。本番では指定しない。

# データセット単位で失敗を集約したいので -e は使わない
set -uo pipefail

if [ "$#" -eq 0 ]; then
    echo "Usage: $0 <directory1> [directory2 ...]"
    exit 1
fi

: "${PLATFORM_UPLOAD_DOMAIN:?PLATFORM_UPLOAD_DOMAIN is required}"
: "${PLATFORM_API_KEY:?PLATFORM_API_KEY is required}"

POLL_ATTEMPTS="${PLATFORM_POLL_ATTEMPTS:-40}"
POLL_INTERVAL="${PLATFORM_POLL_INTERVAL:-15}"
UPLOAD_SCHEME="${PLATFORM_UPLOAD_SCHEME:-https}"
UPLOAD_URL="${UPLOAD_SCHEME}://${PLATFORM_UPLOAD_DOMAIN}/v1/upload"

# config.yml から任意のキーの値を取り出す。
# build-config-json.js と同じ FAILSAFE_SCHEMA を使い、数値やアンダースコアを含む ID が
# 勝手に変換されるのを防ぐ。
# 読み取りに失敗した場合は空文字ではなく非 0 で返す。空文字にすると「sourceDataId 未設定」と
# 区別できず、連携対象が黙ってスキップされてしまうため。
config_value() {
    local value
    if ! value="$(node -e '
        const fs = require("fs");
        const yaml = require("js-yaml");
        const doc = yaml.load(fs.readFileSync(process.argv[1], "utf-8"), { schema: yaml.FAILSAFE_SCHEMA }) || {};
        const value = doc[process.argv[2]];
        process.stdout.write(value == null ? "" : String(value).trim());
    ' "$1" "$2" 2>&1)"; then
        echo "$value" >&2
        return 1
    fi
    printf '%s' "$value"
}

# status.json をポーリングしてタイル生成の完了を待つ。
# 連携先のドメインをログに残さないため、URL ではなく label（データ ID）だけを出力する。
wait_for_status() {
    local url="$1"
    local label="$2"
    local attempt body status

    if [ "$POLL_ATTEMPTS" -le 0 ]; then
        echo "  受付済み（完了待ちなし）: ${label}"
        return 0
    fi

    for ((attempt = 1; attempt <= POLL_ATTEMPTS; attempt++)); do
        # 生成直後は status.json がまだ配信されず 403/404 になるため、失敗は空扱いでリトライする
        body="$(curl -sS -H "Cache-Control: no-cache" "$url" 2>/dev/null)" || body=""
        status="$(jq -r '.status // empty' <<<"$body" 2>/dev/null)"

        case "$status" in
            success)
                echo "  ✅ タイル生成完了: ${label}"
                return 0
                ;;
            error)
                echo "  ❌ タイル生成失敗: ${label}"
                jq -r '.error | "     \(.code // "UNKNOWN"): \(.message // "")"' <<<"$body" 2>/dev/null
                return 1
                ;;
        esac

        sleep "$POLL_INTERVAL"
    done

    echo "  ❌ タイル生成の完了確認がタイムアウトしました: ${label}"
    return 1
}

synced=()
skipped=()
failed=()

for dir in "$@"; do
    [ -z "$dir" ] && continue

    category="$(basename "${dir%/}")"
    config_file="data/${category}/config.yml"

    if [ ! -f "$config_file" ]; then
        echo "⏭  スキップ: ${category}（config.yml がありません）"
        skipped+=("$category")
        continue
    fi

    if ! data_id="$(config_value "$config_file" sourceDataId)"; then
        echo "❌ ${category}: config.yml の読み取りに失敗しました"
        failed+=("$category")
        continue
    fi

    if [ -z "$data_id" ]; then
        echo "⏭  スキップ: ${category}（sourceDataId が未設定）"
        skipped+=("$category")
        continue
    fi

    if [[ ! "$data_id" =~ ^[A-Za-z0-9_-]{1,32}$ ]]; then
        echo "❌ ${category}: sourceDataId \"${data_id}\" が不正です（英数字・アンダースコア・ハイフン、32文字以内）"
        failed+=("$category")
        continue
    fi

    if ! description="$(config_value "$config_file" name)"; then
        echo "❌ ${category}: config.yml の読み取りに失敗しました"
        failed+=("$category")
        continue
    fi
    [ -z "$description" ] && description="$category"

    geojson_file="build/${category}/data.geojson"
    if [ ! -s "$geojson_file" ]; then
        geojson_file="data/${category}/data.geojson"
    fi
    if [ ! -s "$geojson_file" ]; then
        echo "❌ ${category}: GeoJSON が見つかりません（build/${category}/data.geojson）"
        failed+=("$category")
        continue
    fi

    echo "🔼 連携: ${category} → dataId=${data_id} (${geojson_file})"

    curl_args=(
        -sS
        -X POST "$UPLOAD_URL"
        -H "x-api-key: ${PLATFORM_API_KEY}"
        -F "dataId=${data_id}"
        -F "description=${description}"
        -F "data=@${geojson_file};filename=${data_id}.geojson;type=application/geo+json"
        -w $'\n%{http_code}'
    )
    if [ -n "${PLATFORM_NOTIFY_EMAIL:-}" ]; then
        curl_args+=(-F "email=${PLATFORM_NOTIFY_EMAIL}")
    fi

    if ! response="$(curl "${curl_args[@]}")"; then
        echo "❌ ${category}: アップロード API への接続に失敗しました"
        failed+=("$category")
        continue
    fi

    http_code="$(tail -n 1 <<<"$response")"
    body="$(sed '$d' <<<"$response")"

    if [ "$http_code" != "202" ]; then
        echo "❌ ${category}: アップロード失敗 (HTTP ${http_code}): ${body}"
        failed+=("$category")
        continue
    fi

    # 1 リクエストが複数データセットに分割される場合があるので results 側の statusUrl も見る
    mapfile -t status_urls < <(
        jq -r '[.statusUrl] + [(.results // [])[].statusUrl]
               | map(select(. != null and . != "")) | unique | .[]' <<<"$body" 2>/dev/null
    )

    if [ "${#status_urls[@]}" -eq 0 ]; then
        echo "❌ ${category}: レスポンスに statusUrl がありません: ${body}"
        failed+=("$category")
        continue
    fi

    dataset_ok=1
    for index in "${!status_urls[@]}"; do
        label="$data_id"
        if [ "${#status_urls[@]}" -gt 1 ]; then
            label="${data_id} ($((index + 1))/${#status_urls[@]})"
        fi
        wait_for_status "${status_urls[$index]}" "$label" || dataset_ok=0
    done

    if [ "$dataset_ok" -eq 1 ]; then
        synced+=("$category")
    else
        failed+=("$category")
    fi
done

echo
echo "===== 連携結果 ====="
echo "連携成功: ${#synced[@]} 件${synced[*]:+ (${synced[*]})}"
echo "スキップ: ${#skipped[@]} 件"
echo "失敗:     ${#failed[@]} 件${failed[*]:+ (${failed[*]})}"

if [ "${#failed[@]}" -gt 0 ]; then
    exit 1
fi
