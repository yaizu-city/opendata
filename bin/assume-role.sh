#!/usr/bin/env bash
set -euo pipefail

ROLE_ARN="arn:aws:iam::762706324393:role/geolonia-admin-operator-for-codebuild"
SESSION_NAME="CodeBuildSession"

ASSUMED_ROLE=$(aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name "$SESSION_NAME")

# 取得した一時認証情報を GitHub Actions の環境変数として設定
echo "AWS_ACCESS_KEY_ID=$(echo "$ASSUMED_ROLE" | jq -r '.Credentials.AccessKeyId')" >> "$GITHUB_ENV"
echo "AWS_SECRET_ACCESS_KEY=$(echo "$ASSUMED_ROLE" | jq -r '.Credentials.SecretAccessKey')" >> "$GITHUB_ENV"
echo "AWS_SESSION_TOKEN=$(echo "$ASSUMED_ROLE" | jq -r '.Credentials.SessionToken')" >> "$GITHUB_ENV"
