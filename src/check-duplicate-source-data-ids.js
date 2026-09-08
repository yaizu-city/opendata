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
const findDuplicateSourceDataIds = (configFiles, dataRootDir) => {
  const idToCategories = new Map();

  for (const file of configFiles) {
    const fileContent = fs.readFileSync(file, 'utf-8');
    // NOTE: build-config-json.js と同じ FAILSAFE_SCHEMA を使い、数値やアンダースコアを
    // 含む ID が勝手に変換されるのを防ぐ
    const parsedYaml = yaml.load(fileContent, { schema: yaml.FAILSAFE_SCHEMA }) || {};
    const sourceDataId = parsedYaml.sourceDataId == null ? '' : String(parsedYaml.sourceDataId).trim();

    if (!sourceDataId) continue;

    const category = path.basename(path.dirname(path.resolve(file)));
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

  return duplicates;
};

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

if (require.main === module) {
  const dataRootDir = path.join(__dirname, '..', 'data');
  const configFiles = glob.sync(path.join(dataRootDir, '**/config.yml'));
  const duplicates = findDuplicateSourceDataIds(configFiles, dataRootDir);

  const withSourceDataId = configFiles.filter((file) => {
    const parsedYaml = yaml.load(fs.readFileSync(file, 'utf-8'), { schema: yaml.FAILSAFE_SCHEMA }) || {};
    return parsedYaml.sourceDataId != null && String(parsedYaml.sourceDataId).trim() !== '';
  }).length;

  if (duplicates.length === 0) {
    console.log(`sourceDataId の重複はありません（sourceDataId 設定済み: ${withSourceDataId} / config.yml 総数: ${configFiles.length}）`);
    process.exit(0);
  }

  const report = formatReport(duplicates);
  console.error(report);

  const reportPath = process.env.DUPLICATE_REPORT_PATH || path.join(__dirname, '..', 'duplicate-source-data-id-report.md');
  fs.writeFileSync(reportPath, report);

  process.exit(1);
} else {
  module.exports = { findDuplicateSourceDataIds, formatReport };
}
