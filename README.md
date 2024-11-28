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
| テスト小学校区 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/テスト小学校区_ステータスチェック追加) | | [GeoJSON](https://yaizu-city.github.io/opendata/テスト小学校区_ステータスチェック追加/data.geojson) | |
| テスト投票区2 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/テスト投票区2) | | [GeoJSON](https://yaizu-city.github.io/opendata/テスト投票区2/data.geojson) | |

以下のデータは位置情報を含まないデータです。

| データ名 | フォルダ | CSV | JSON |
| --- | --- | --- | --- |
| テスト標準 | [フォルダ](https://github.com/yaizu-city/opendata/tree/main/data/test_standard) | [CSV](https://yaizu-city.github.io/opendata/test_standard/data.csv) | [JSON](https://yaizu-city.github.io/opendata/test_standard/data.json) |


| データ名 | PDF |
| --- | --- |
| 市民満足度アンケート結果 | [PDF](https://github.com/yaizu-city/opendata/tree/main/data/citizen_satisfaction_questionnaire_result) |
## 備考
- Excel から CSV に変換する際、CSVに出力される値は、Excel のセル書式で指定された値が出力されます。
- 日付（セル書式：日付、ユーザー定義）については、`m/d/yy` 形式で CSV に出力されます。ご注意ください。
