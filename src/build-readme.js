const fs = require('fs');
const glob = require('glob');
const path = require('path');

const locationDataCategoriesPath = path.resolve(__dirname, 'location-data-categories.json');
const standardDataCategoriesPath = path.resolve(__dirname, 'standard-data-categories.json');

// Markdownテーブルのセルとして安全な1行テキストにする（| と改行が列崩れの原因になるため）
const escapeMarkdownTableCell = (text) => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

// リンクラベル（[...]の中）として安全な文字列にする
const escapeMarkdownLinkLabel = (text) => escapeMarkdownTableCell(text).replace(/\[/g, '\\[').replace(/\]/g, '\\]');

// リンク先（(...)の中）として安全な文字列にする（丸括弧はリンク構文、| はテーブル区切りを壊すため）
// encodeURIComponent は仕様上 ( ) をエスケープしないため、個別に置換する
const escapeMarkdownLinkUrl = (url) => String(url).replace(/\r?\n/g, '').trim()
  .replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\|/g, '%7C');

// config.yml の source / sourceUrl から出典セルの表示用文字列を作る
const formatSource = (category) => {
  if (!category.source) return "";
  const label = escapeMarkdownLinkLabel(category.source);
  if (!category.sourceUrl) return label;
  return `[${label}](${escapeMarkdownLinkUrl(category.sourceUrl)})`;
};

class BuildReadme {
  run() {
    const opendataViewerUrl = "https://geolonia.github.io/opendata-editor/";
    let readme = "<h1 id=\"yaizu-open-data\">焼津オープンデータカタログ</h1>\n\n";
    readme += "焼津市では、以下の地図データをオープンデータとして提供しています。\n\nご利用にあたっては、[焼津市オープンデータカタログ利用規約](https://yaizu-smartcity.jp/yaizuopendatacatalog_kiyaku.pdf) をご確認ください。\n\n";
    readme += "[本データ](https://github.com/yaizu-city/opendata/tree/main/data)は、[公共データ利用規約（第1.0版）](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)の下に提供されています。\n\n";
    readme += "なお、このリポジトリに含まれるソースコードは、上記ライセンスの適用外です。\n\n";
    readme += "## ▼焼津オープンデータカタログの使い方\n\n";
    readme += "- 表内の **「CSV」** や **「GeoJSON」** 、 **「JSON」**、 **「TileJSON」**をクリックすると、最新の該当データが得られます。\n\n - 「フォルダ」には、xlsxファイルが格納されています。\n\n - CSVファイルダウンロード時、文字化けする場合は、xlsxファイルをダウンロードしてください。\n\n - 位置情報を含むデータを編集する場合には、**編集**リンクをクリックします。データが地図上に表示され、表組み形式でデータを編集し、編集済みデータをダウンロードすることができます。\n\n";

    if (fs.existsSync(locationDataCategoriesPath)) {

      const locationDataCategoriesRaw = fs.readFileSync(locationDataCategoriesPath);
      const locationDataCategories = JSON.parse(locationDataCategoriesRaw);

      // locationDataCategories が存在する場合のみ処理
      if (locationDataCategories.length > 0) {

        // 出典が1件も設定されていない場合、空欄だけの列を表示しないため列自体を出さない
        const hasSource = locationDataCategories.some((category) => category.source);

        if (hasSource) {
          readme += "| データ名 | フォルダ | CSV | GeoJSON | TileJSON | 地図で編集 | 出典 |\n";
          readme += "| --- | --- | --- | --- | --- | --- | --- |\n";
        } else {
          readme += "| データ名 | フォルダ | CSV | GeoJSON | TileJSON | 地図で編集 |\n";
          readme += "| --- | --- | --- | --- | --- | --- |\n";
        }

        for (let i = 0; i < locationDataCategories.length; i++) {
          const category = locationDataCategories[i];
          const csvFile = glob.sync(`data/${category.category}/*.csv`)[0];
          const csvFolderUrl = `https://github.com/yaizu-city/opendata/tree/main/data/${category.category}`;
          const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.csv`;
          const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.geojson`;
          const tileJsonFileUrl = `https://yaizu-smartcity.jp/tiles/${category.category}/tiles.json`;
          const mapUrl = `${opendataViewerUrl}?data=${csvFileUrl}`;
          const sourceCell = hasSource ? ` ${formatSource(category)} |` : "";

          if (!csvFile || path.basename(csvFile) === "attributes.csv") {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | | [GeoJSON](${jsonFileUrl}) | [TileJSON](${tileJsonFileUrl}) | |${hasSource ? sourceCell : " "}\n`;
          } else {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV](${csvFileUrl}) | [GeoJSON](${jsonFileUrl}) | [TileJSON](${tileJsonFileUrl}) | [編集](${mapUrl}) |${sourceCell}\n`;
          }
        }
      }
    }

    if (fs.existsSync(standardDataCategoriesPath)) {

      const standardDataCategoriesRaw = fs.readFileSync(standardDataCategoriesPath);
      const standardDataCategories = JSON.parse(standardDataCategoriesRaw);

      // standardDataCategories が存在する場合のみ処理
      if (standardDataCategories.length > 0) {

        // 出典が1件も設定されていない場合、空欄だけの列を表示しないため列自体を出さない
        const hasSource = standardDataCategories.some((category) => category.source);

        readme += "\n以下のデータは位置情報を含まないデータです。\n\n";
        if (hasSource) {
          readme += "| データ名 | フォルダ | CSV | JSON | 出典 |\n";
          readme += "| --- | --- | --- | --- | --- |\n";
        } else {
          readme += "| データ名 | フォルダ | CSV | JSON |\n";
          readme += "| --- | --- | --- | --- |\n";
        }

        for (let i = 0; i < standardDataCategories.length; i++) {
          const category = standardDataCategories[i];
          const csvFolderUrl = `https://github.com/yaizu-city/opendata/tree/main/data/${category.category}`;
          const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.csv`;
          const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.json`;
          const sourceCell = hasSource ? ` ${formatSource(category)} |` : "";

          if (category.category === "city_planning_basic_survey_information") {
            const csvFiles = glob.sync(`data/${category.category}/*.csv`);
            const xlsxFiles = glob.sync(`data/${category.category}/*.xlsx`);
            const mixedFiles = csvFiles.concat(xlsxFiles);
            const allFileNames = [...new Set(mixedFiles.map(file => path.basename(file, path.extname(file))))];

            allFileNames.map(filename => {
              const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/${filename}.json`;
              const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/${filename}.csv`;
              const subCategory = filename.split('_')[1];
              if (filename === allFileNames[0]) {
                readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV(${subCategory})](${csvFileUrl}) | [JSON(${subCategory})](${jsonFileUrl}) |${sourceCell}\n`;
              } else {
                readme += `||| [CSV(${subCategory})](${csvFileUrl}) | [JSON(${subCategory})](${jsonFileUrl}) |${sourceCell}\n`;
              }
            });
          } else if (category.historical) {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV(最新データ)](${csvFileUrl}) | [JSON(最新データ)](${jsonFileUrl}) |${sourceCell}\n`;
          } else {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV](${csvFileUrl}) | [JSON](${jsonFileUrl}) |${sourceCell}\n`;
          }
        }
      }
    }

    readme += "## 備考\n";
    readme += "- Excel から CSV に変換する際、CSVに出力される値は、Excel のセル書式で指定された値が出力されます。\n";
    readme += "- 日付（セル書式：日付、ユーザー定義）については、`m/d/yy` 形式で CSV に出力されます。ご注意ください。\n";

    fs.writeFileSync("README.md", readme);
  }
}

if (require.main === module) {
  const buildReadme = new BuildReadme();
  buildReadme.run();
} else {
  module.exports = { formatSource, escapeMarkdownTableCell, escapeMarkdownLinkLabel, escapeMarkdownLinkUrl };
}
