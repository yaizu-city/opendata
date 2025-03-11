#!/bin/bash
set -e

#####################
# 変数定義
#####################
GITHUB_TOKEN="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"
REPO_OWNER="yaizu-city"
REPO_NAME="opendata"
BASE_BRANCH="main"
NEW_BRANCH="add-new-data"
PULL_REQUEST_TITLE="Add new data"
COMMIT_MESSAGE="Add new file"
# GitHubリポジトリ上でアップロードする先のディレクトリ（例：data ディレクトリ直下）
TARGET_DIR="data"

# jq コマンドが必要です。無ければインストールしてください。
command -v jq >/dev/null 2>&1 || { echo >&2 "jq が必要です。インストールして再実行してください。"; exit 1; }

#####################
# 1. 最新のコミットハッシュを取得
#####################
echo "最新のコミットハッシュを取得中（ブランチ: ${BASE_BRANCH}）..."
BASE_BRANCH_INFO=$(curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${BASE_BRANCH}")
BASE_COMMIT_SHA=$(echo "$BASE_BRANCH_INFO" | jq -r '.object.sha')
echo "最新コミット: ${BASE_COMMIT_SHA}"

#####################
# 2. 新しいブランチを作成
#####################
echo "新しいブランチ ${NEW_BRANCH} を作成中..."
CREATE_BRANCH_PAYLOAD=$(jq -n --arg ref "refs/heads/${NEW_BRANCH}" --arg sha "$BASE_COMMIT_SHA" '{ref: $ref, sha: $sha}')
curl -s -X POST -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs" \
    -d "$CREATE_BRANCH_PAYLOAD" > /dev/null
echo "ブランチ ${NEW_BRANCH} を作成しました。"

#####################
# 3. カレントディレクトリの全ファイルをアップロード
#####################
LAST_COMMIT_SHA=""
echo "カレントディレクトリのファイルをアップロードします..."
for file in *; do
  if [ -f "$file" ]; then
    echo "  -> ファイル: $file をアップロード中..."
    # cat でファイル内容を出力し、base64 エンコード（改行削除）
    FILE_CONTENT=$(cat "$file" | base64 | tr -d '\n')
    # リポジトリ上のファイルパスを指定（TARGET_DIR/ファイル名）
    FILE_PATH="${TARGET_DIR}/${file}"
    # JSONペイロード作成（ファイルごとにコミット）
    UPLOAD_PAYLOAD=$(jq -n --arg message "${COMMIT_MESSAGE} for ${file}" --arg content "$FILE_CONTENT" --arg branch "${NEW_BRANCH}" '{message: $message, content: $content, branch: $branch}')
    RESPONSE=$(curl -s -X PUT -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}" \
      -d "$UPLOAD_PAYLOAD")
    COMMIT_SHA=$(echo "$RESPONSE" | jq -r '.commit.sha')
    echo "     アップロード完了。コミットハッシュ: ${COMMIT_SHA}"
    LAST_COMMIT_SHA=$COMMIT_SHA
  fi
done

if [ -z "$LAST_COMMIT_SHA" ]; then
  echo "アップロードするファイルがありません。処理を終了します。"
  exit 1
fi

#####################
# 4. Pull Request を作成
#####################
echo "Pull Request を作成中..."
PR_PAYLOAD=$(jq -n --arg title "$PULL_REQUEST_TITLE" --arg head "$NEW_BRANCH" --arg base "$BASE_BRANCH" '{title: $title, head: $head, base: $base}')
PR_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls" \
    -d "$PR_PAYLOAD")
PR_NUMBER=$(echo "$PR_RESPONSE" | jq -r '.number')
echo "Pull Request 作成完了。PR番号: ${PR_NUMBER}"

#####################
# 5. ステータスを取得（チェックランが全て success かを確認）
#####################
echo "コミット ${LAST_COMMIT_SHA} のチェックラン状況を確認中..."
MAX_ATTEMPTS=30
ATTEMPT=0
CHECK_SUCCESS=0
while [ ${ATTEMPT} -lt ${MAX_ATTEMPTS} ]; do
  CHECK_RESPONSE=$(curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" \
      -H "Accept: application/vnd.github+json" \
      -H "X-GitHub-Api-Version: 2022-11-28" \
      "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${LAST_COMMIT_SHA}/check-runs")
  TOTAL_COUNT=$(echo "$CHECK_RESPONSE" | jq -r '.total_count')
  if [ "$TOTAL_COUNT" -eq "0" ]; then
    echo "チェックランが存在しないため、成功とみなします。"
    CHECK_SUCCESS=1
    break
  fi
  # 全ての check_runs の conclusion が "success" か確認
  FAIL_COUNT=$(echo "$CHECK_RESPONSE" | jq '[.check_runs[] | select(.conclusion != "success")] | length')
  if [ "$FAIL_COUNT" -eq "0" ]; then
    echo "全てのチェックランが成功しました。"
    CHECK_SUCCESS=1
    break
  else
    echo "チェックランの結果がまだ揃っていません。(${ATTEMPT}/${MAX_ATTEMPTS}) 待機中..."
  fi
  ATTEMPT=$((ATTEMPT + 1))
  sleep 10
done

if [ ${CHECK_SUCCESS} -ne 1 ]; then
  echo "チェックランが所定の時間内に成功しませんでした。処理を終了します。"
  exit 1
fi

#####################
# 6. Pull Request のマージ
#####################
echo "Pull Request #${PR_NUMBER} をマージ中..."
MERGE_PAYLOAD=$(jq -n --arg title "Merging pull request" '{commit_title: $title}')
curl -s -X PUT -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}/merge" \
    -d "$MERGE_PAYLOAD" > /dev/null
echo "Pull Request #${PR_NUMBER} をマージしました。"
