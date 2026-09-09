const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');

// data/**/config.yml を横断的にスキャンし、sourceDataId の重複を検知する。
// 基盤API側は sourceDataId の値のみで新規／更新を判定するため、2つの異なる
// データセットが同じ sourceDataId を設定すると、後からpushした方が前のデータセットを
// サイレントに上書きしてしまう。この重複を PR 作成時 / main への push 時に検出する。
//
// sourceDataId が未設定のデータセットは連携対象外（オプトイン）なのでチェックしない。
const scanSourceDataIds = (configFiles) => {
  const idToCategories = new Map();
  const parseErrors = [];
  let withSourceDataId = 0;

  for (const file of configFiles) {
    const category = path.basename(path.dirname(path.resolve(file)));
    let parsedYaml;
    try {
      const fileContent = fs.readFileSync(file, 'utf-8');
      // NOTE: build-config-json.js と同じ FAILSAFE_SCHEMA を使い、数値やアンダースコアを
      // 含む ID が勝手に変換されるのを防ぐ
      parsedYaml = yaml.load(fileContent, { schema: yaml.FAILSAFE_SCHEMA }) || {};
    } catch (error) {
      parseErrors.push({ category, file, message: error.message });
      continue;
    }

    const sourceDataId = parsedYaml.sourceDataId == null ? '' : String(parsedYaml.sourceDataId).trim();
    if (!sourceDataId) continue;

    withSourceDataId += 1;
    if (!idToCategories.has(sourceDataId)) idToCategories.set(sourceDataId, []);
    idToCategories.get(sourceDataId).push(category);
  }

  const duplicates = [];
  for (const [sourceDataId, categories] of idToCategories) {
    if (categories.length > 1) {
      duplicates.push({ sourceDataId, categories: categories.sort() });
    }
  }
  duplicates.sort((a, b) => a.sourceDataId.localeCompare(b.sourceDataId));

  return { duplicates, parseErrors, withSourceDataId };
};

const findDuplicateSourceDataIds = (configFiles) => scanSourceDataIds(configFiles).duplicates;

const formatReport = (duplicates) => {
  const lines = [
    '## エラー：sourceDataId が重複しています',
    '',
    '`config.yml` の `sourceDataId` は地理空間データ連携基盤側でデータの新規登録／更新を判定するキーです。',
    '複数のデータセットに同じ `sourceDataId` を設定すると、後から連携された方が前のデータセットを上書きしてしまいます。',
    '以下のデータセットで `sourceDataId` が重複しています。いずれかの `sourceDataId` を変更してください。',
    '',
  ];
  for (const { sourceDataId, categories } of duplicates) {
    lines.push(`- \`${sourceDataId}\`: ${categories.map((c) => `\`${c}\``).join(', ')}`);
  }
  lines.push('');
  return lines.join('\n');
};

const formatParseErrorReport = (parseErrors) => {
  const lines = [
    '## エラー：config.yml の読み取りに失敗しました',
    '',
    '以下の `config.yml` が不正な YAML のため、sourceDataId の重複チェックを実行できませんでした。修正してください。',
    '',
  ];
  for (const { category, message } of parseErrors) {
    lines.push(`- \`${category}\`: ${message}`);
  }
  lines.push('');
  return lines.join('\n');
};

if (require.main === module) {
  const dataRootDir = path.join(__dirname, '..', 'data');
  const configFiles = glob.sync(path.join(dataRootDir, '**/config.yml'));
  const { duplicates, parseErrors, withSourceDataId } = scanSourceDataIds(configFiles);

  const reportPath = process.env.DUPLICATE_REPORT_PATH || path.join(__dirname, '..', 'duplicate-source-data-id-report.md');

  if (parseErrors.length > 0) {
    const report = formatParseErrorReport(parseErrors);
    console.error(report);
    fs.writeFileSync(reportPath, report);
    process.exit(1);
  }

  if (duplicates.length === 0) {
    console.log(`sourceDataId の重複はありません（sourceDataId 設定済み: ${withSourceDataId} / config.yml 総数: ${configFiles.length}）`);
    process.exit(0);
  }

  const report = formatReport(duplicates);
  console.error(report);
  fs.writeFileSync(reportPath, report);

  process.exit(1);
} else {
  module.exports = { findDuplicateSourceDataIds, formatReport, scanSourceDataIds, formatParseErrorReport };
}
