# 焼津市オープンデータ作業説明書

## 新規データの追加方法

### 1. ディレクトリを作成
- https://github.com/yaizu-city/opendata/tree/main/data に移動して下さい。
- 「Create new file」 をクリックして下さい。
<img width="1257" alt="スクリーンショット 2023-05-18 17 05 16" src="https://github.com/takamatsu-city/opendata/assets/8760841/0b261634-11e9-46fc-8cc7-cd505d1e07b2">

- ディレクトリ名を入力して下さい。
<img width="1254" alt="スクリーンショット 2023-05-18 17 06 00" src="https://github.com/takamatsu-city/opendata/assets/8760841/25a9bfcd-2473-47df-822a-d5c0bb3236ff">

- `「Create new branch for this commit and start a pullrequest」` にチェックを入れ、`「Propose changes」` をクリックして下さい。
- **【注意：「Create new branch for this commit and start a pullrequest」 にチェックを入れないとデータ追加されません】**

<img width="1255" alt="スクリーンショット 2023-05-18 17 05 48" src="https://github.com/takamatsu-city/opendata/assets/8760841/5cf38811-2901-4953-b75a-3faa9d448eeb">

### 2. ファイルを追加

- 作成したディレクトリに移動し　「Upload files」 から CSV ファイルをアップロードして下さい。
- ファイルのエンコードは、UTF-8で保存して下さい。

<img width="1253" alt="スクリーンショット 2023-05-18 17 06 46" src="https://github.com/takamatsu-city/opendata/assets/8760841/2be72905-a701-4c71-b314-8526fd25e0ed">

### 3. 設定ファイルを更新

- 位置情報があるデータの場合は、[`location-data-categories.json`](https://github.com/takamatsu-city/opendata/blob/main/src/location-data-categories.json)　[(ファイルを開く)](https://github.com/takamatsu-city/opendata/blob/main/src/location-data-categories.json)
- 位置情報がないデータの場合は、[`standard-data-categories.json`](https://github.com/takamatsu-city/opendata/blob/main/src/standard-data-categories.json)　[(ファイルを開く)](https://github.com/takamatsu-city/opendata/blob/main/src/standard-data-categories.json)
- PDFのデータの場合は、[`pdf-data-categories.json`](https://github.com/takamatsu-city/opendata/blob/main/src/pdf-data-categories.json)　[(ファイルを開く)](https://github.com/takamatsu-city/opendata/blob/main/src/pdf-data-categories.json)

```
{
  "category": "public_toilet", // 1. で作成したディレクトリ名
  "name": "公衆トイレ", // データ名
  "description": "" // 説明
  "historical": false // 時系列のデータを含む場合は true
},
```

##### 時系列データの追加方法

旅館業新規開設一覧（2023年04月）など、時系列データの場合は、`historical`を`true`にして下さい。
- `filename` は READMEに使用されます。
- 時系列のデータの場合は、ファイル名は、`{データ番号}_{YYMM}.csv`にして、`filename`は、`{データ番号}`にして下さい。

```
{
  "category": "new_hostels",
  "name": "旅館業新規開設一覧",
  "filename": "0103",
  "description": "",
  "historical": true
}
```

#### 編集方法

- 鉛筆マークの 「Edit this file」 をクリックして下さい。

<img width="1440" alt="スクリーンショット 2023-05-18 18 08 28" src="https://github.com/takamatsu-city/opendata/assets/8760841/cd9496ee-f0ea-4b0c-9270-4e58596afa8f">

- 編集中のブランチ名かを確認し、「Commit Changes」をクリックして下さい。
- 新規に作成したブランチ名だと、`<githubユーザー名>-patch-1` になります。

<img width="1120" alt="スクリーンショット 2023-05-18 18 12 54" src="https://github.com/takamatsu-city/opendata/assets/8760841/f468a815-3dc4-4dec-af83-bc5064c51bf9">

## 地理空間データ連携基盤への連携

`main` にデータが追加・更新されると、そのデータセットは自動で地理空間データ連携基盤にも
アップロードされます。

### 前提：初回投入は CLI / 管理画面で行う

自動連携が行うのは、連携基盤側に **下書き（draft）のプレビューを作るところまで**です。次の 2 点から、
**初回投入とその公開（デプロイ）まで済ませたデータセットにだけ** `sourceDataId` を設定して下さい。

- 属性・スタイル設定は、連携基盤側の「最後に公開されたバージョン」から引き継がれます。一度も
  公開されていないデータ ID にアップロードすると、対象データを描画するレイヤーを持たない
  デフォルトスタイルで登録されます。
- 公開（承認・デプロイ）にはアップロード API キーとは別の認証が必要なため、GitHub Actions からは
  実行できません。

初回は CLI（`sgp`）または連携基盤の管理画面で次の順に進めます。

1. データをアップロードする
2. 属性とスタイルを設定する
3. 承認依頼を出し、デプロイして公開する
4. 公開できたら、そのデータ ID を `config.yml` の `sourceDataId` に設定する（以降は自動連携）

### 連携対象にする方法

`data/<ディレクトリ名>/config.yml` に `sourceDataId` を追記して下さい。**`sourceDataId` を書いた
データセットだけが連携対象**になり、書かれていないデータセットは従来どおり連携されません。

```yaml
category: AED設置箇所一覧
name: AED設置箇所一覧
dataType: location
sourceDataId: aed   # ← 追記すると連携対象になる
```

- `sourceDataId`: 連携基盤側のデータ ID。英数字・アンダースコア（`_`）・ハイフン（`-`）のみ、32文字以内。
  一度決めたら変更しないで下さい（変更すると基盤側で別データとして登録されます）。
- `name`: 連携基盤側の「説明（description）」として送信されます。

### 連携される内容とタイミング

- 送信されるファイルは属性名変換済みの `build/<ディレクトリ名>/data.geojson` です（CSV / Shapefile
  どちらのデータでも、変換後の GeoJSON が送られます）。
- 実行タイミングは `main` への push 時のみです。プルリクエストの段階では連携されません。
- アップロードされたデータは連携基盤の **下書き（draft）のプレビュー** として登録されます。公開するには
  連携基盤の管理画面（または `sgp`）で承認依頼とデプロイの操作が必要です。
- アップロードのたびに新しいバージョンのプレビューが作られます。ワークフローを再実行しても公開済みの
  データは変わりませんが、不要なプレビューが残るので必要に応じて削除して下さい。
- 連携に失敗した場合は GitHub Actions のワークフローが失敗します。Actions のログで対象データセットと
  エラー内容を確認して下さい。

### 管理者向け

連携先ドメインとアップロード API キーはリポジトリに残さず、Actions Secret から渡しています。

| Secret | 内容 |
| --- | --- |
| `PLATFORM_UPLOAD_DOMAIN` | アップロード API のドメイン（自治体ドメインの admin サブドメイン側） |
| `PLATFORM_API_KEY` | アップロード API の `x-api-key` |

- 連携対象のデータセットがあるのにどちらかが未設定の場合、連携ステップは **エラー** になります
  （設定ミスによる連携漏れを見逃さないため）。連携対象が 1 件も無い場合は何もせず正常終了します。
- 値は地理空間データ連携基盤の team 設定を参照して下さい。ワークフローのログにもドメインや
  キーは出力しません。
- 手元から実行する場合は次のとおりです。

  ```bash
  PLATFORM_UPLOAD_DOMAIN=<アップロードAPIのドメイン> \
  PLATFORM_API_KEY=<APIキー> \
    bash ./src/sync-to-platform.sh "data/AED設置箇所一覧"
  ```

