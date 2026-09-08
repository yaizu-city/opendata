const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  findDuplicateSourceDataIds,
  formatReport,
} = require('../src/check-duplicate-source-data-ids');

const makeConfigFile = (dir, category, sourceDataId) => {
  const categoryDir = path.join(dir, category);
  fs.mkdirSync(categoryDir, { recursive: true });
  const configPath = path.join(categoryDir, 'config.yml');
  const body = sourceDataId == null
    ? 'name: test\n'
    : `name: test\nsourceDataId: ${sourceDataId}\n`;
  fs.writeFileSync(configPath, body);
  return configPath;
};

describe('findDuplicateSourceDataIds', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sourceDataId-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('重複が無ければ空配列を返す', () => {
    const files = [
      makeConfigFile(tmpDir, 'A', 'id_a'),
      makeConfigFile(tmpDir, 'B', 'id_b'),
      makeConfigFile(tmpDir, 'C', null),
    ];

    expect(findDuplicateSourceDataIds(files)).toEqual([]);
  });

  test('同じ sourceDataId を持つデータセットを検知する', () => {
    const files = [
      makeConfigFile(tmpDir, 'A', 'dup_id'),
      makeConfigFile(tmpDir, 'B', 'id_b'),
      makeConfigFile(tmpDir, 'C', 'dup_id'),
    ];

    const duplicates = findDuplicateSourceDataIds(files);

    expect(duplicates).toEqual([
      { sourceDataId: 'dup_id', categories: ['A', 'C'] },
    ]);
  });

  test('sourceDataId が未設定・空文字のデータセットは対象外', () => {
    const files = [
      makeConfigFile(tmpDir, 'A', null),
      makeConfigFile(tmpDir, 'B', ''),
      makeConfigFile(tmpDir, 'C', null),
    ];

    expect(findDuplicateSourceDataIds(files)).toEqual([]);
  });

  test('数値やアンダースコアを含むIDが変換されずに一致判定される（FAILSAFE_SCHEMA）', () => {
    const files = [
      makeConfigFile(tmpDir, 'A', '20250312_6'),
      makeConfigFile(tmpDir, 'B', '20250312_6'),
    ];

    const duplicates = findDuplicateSourceDataIds(files);

    expect(duplicates).toEqual([
      { sourceDataId: '20250312_6', categories: ['A', 'B'] },
    ]);
  });

  test('3件以上が重複していても1件のグループとして検知する', () => {
    const files = [
      makeConfigFile(tmpDir, 'A', 'dup_id'),
      makeConfigFile(tmpDir, 'B', 'dup_id'),
      makeConfigFile(tmpDir, 'C', 'dup_id'),
    ];

    const duplicates = findDuplicateSourceDataIds(files);

    expect(duplicates).toEqual([
      { sourceDataId: 'dup_id', categories: ['A', 'B', 'C'] },
    ]);
  });
});

describe('formatReport', () => {
  test('重複しているsourceDataIdとデータセット名を含む本文を生成する', () => {
    const report = formatReport([
      { sourceDataId: 'dup_id', categories: ['A', 'C'] },
    ]);

    expect(report).toContain('sourceDataId が重複しています');
    expect(report).toContain('`dup_id`');
    expect(report).toContain('`A`');
    expect(report).toContain('`C`');
  });
});
