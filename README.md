# 焼津市オープンデータ

[サイト(https://github.com/yaizu-city)について（利用規約）](https://github.com/yaizu-city)

焼津市では、以下のデータをオープンデータとして提供しています。

表内の **「CSV」** や **「GeoJSON」** 、 **「JSON」** をクリックすると、最新の該当データが得られます。

「フォルダ」には、xlsxファイルが格納されています。

CSVファイルダウンロード時、文字化けする場合は、xlsxファイルをダウンロードしてください。

位置情報を含むデータを編集する場合には、**編集**リンクをクリックします。データが地図上に表示され、表組み形式でデータを編集し、編集済みデータをダウンロードすることができます。

データが誤っている、追加したい、等のご提案には、編集済みのデータをプルリクエストとして送ってください。焼津市役所で確認の上、取り込みさせていただきます。詳しくは [焼津市オープンデータへの貢献方法](CONTRIBUTING.md) を参照してください。

| データ名 | フォルダ | CSV | GeoJSON | 地図で編集 |
| --- | --- | --- | --- | --- |
| AED設置場所 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/aed_location) | [CSV](https://yaizu-city.github.io/opendata/aed_location/data.csv) |[GeoJSON](https://yaizu-city.github.io/opendata/aed_location/data.geojson) | [編集](https://geolonia.github.io/opendata-editor/?data=https://yaizu-city.github.io/opendata/aed_location/data.csv) |
| 環境施設 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/environmental_facilities) | [CSV](https://yaizu-city.github.io/opendata/environmental_facilities/data.csv) |[GeoJSON](https://yaizu-city.github.io/opendata/environmental_facilities/data.geojson) | [編集](https://geolonia.github.io/opendata-editor/?data=https://yaizu-city.github.io/opendata/environmental_facilities/data.csv) |
| 第一種住居地域 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/daiisyujyukyochiiki) | | [GeoJSON](https://yaizu-city.github.io/opendata/daiisyujyukyochiiki/data.geojson) | |
| 都市計画道路 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/toshikeikaku) | | [GeoJSON](https://yaizu-city.github.io/opendata/toshikeikaku/data.geojson) | |

以下のデータは位置情報を含まないデータです。

| データ名 | フォルダ | CSV | JSON |
| --- | --- | --- | --- |
| ごみ分別一覧 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/garbage_separation_list) | [CSV](https://yaizu-city.github.io/opendata/garbage_separation_list/data.csv) | [JSON](https://yaizu-city.github.io/opendata/garbage_separation_list/data.json) |


| データ名 | PDF |
| --- | --- |
| 市民満足度アンケート結果 | [PDF](https://github.com/yaizu-city/opendata/tree/main/data/citizen_satisfaction_questionnaire_result) |
## 備考
- Excel から CSV に変換する際、CSVに出力される値は、Excel のセル書式で指定された値が出力されます。
- 日付（セル書式：日付、ユーザー定義）については、`m/d/yy` 形式で CSV に出力されます。ご注意ください。
