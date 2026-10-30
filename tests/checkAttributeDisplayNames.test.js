const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  displayNames,
  removedDisplayNames,
  changedAttributeFiles,
  buildReport,
  MARKER,
} = require(path.join(__dirname, '../src/check-attribute-display-names'));

const utf8 = (text) => Buffer.from(text, 'utf-8');

const BASE = 'original_name,display_name,label_flag\nNAME,名称,1\nADDR,所在地,\nTEL,電話番号,\n';

describe('check-attribute-display-names', () => {
  it('行を足しただけなら、なくなる表示名はない', async () => {
    const head = `${BASE}URL,ホームページ,\n`;
    expect(await removedDisplayNames(utf8(BASE), utf8(head))).toEqual([]);
  });

  it('行を消すと、その表示名がなくなる', async () => {
    const head = 'original_name,display_name,label_flag\nNAME,名称,1\nTEL,電話番号,\n';
    expect(await removedDisplayNames(utf8(BASE), utf8(head))).toEqual(['所在地']);
  });

  it('display_name を書き換えると、元の表示名がなくなる', async () => {
    const head = 'original_name,display_name,label_flag\nNAME,名称,1\nADDR,住所,\nTEL,電話番号,\n';
    expect(await removedDisplayNames(utf8(BASE), utf8(head))).toEqual(['所在地']);
  });

  it('original_name だけを書き換えても、表示名が同じなら警告しない', async () => {
    const head = 'original_name,display_name,label_flag\nNAME,名称,1\nADDRESS,所在地,\nTEL,電話番号,\n';
    expect(await removedDisplayNames(utf8(BASE), utf8(head))).toEqual([]);
  });

  it('BOM 付きの UTF-8 と Shift_JIS を読める', async () => {
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8(BASE)]);
    expect(await displayNames(bom)).toEqual(['名称', '所在地', '電話番号']);
    // 「名称」を Shift_JIS で書いた CSV
    const sjis = Buffer.concat([
      utf8('original_name,display_name,label_flag\nNAME,'),
      Buffer.from([0x96, 0xbc, 0x8f, 0xcc]),
      utf8(',1\n'),
    ]);
    expect(await displayNames(sjis)).toEqual(['名称']);
  });

  it('空の表示名と、original_name のない行は数えない', async () => {
    const csvText = 'original_name,display_name,label_flag\nNAME,,1\n,所在地,\nTEL,電話番号,\n';
    expect(await displayNames(utf8(csvText))).toEqual(['電話番号']);
  });

  it('コメントの本文に、データ名となくなる表示名が入る', () => {
    const report = buildReport([{ name: '文化財マップ', removed: ['所在地', '電話番号'] }]);
    expect(report.startsWith(MARKER)).toBe(true);
    expect(report).toContain('- 文化財マップ：「所在地」、「電話番号」がなくなります');
  });

  it('日本語のディレクトリ名の attributes.csv を、変更されたファイルとして拾える', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attr-check-'));
    const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf-8' }).trim();
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'test');
    const file = path.join(dir, 'data', '文化財マップ', 'attributes.csv');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, BASE);
    git('add', '.');
    git('commit', '-q', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    fs.writeFileSync(file, 'original_name,display_name,label_flag\nNAME,名称,1\n');
    git('commit', '-q', '-am', 'head');
    expect(changedAttributeFiles(base, 'HEAD', dir)).toEqual(['data/文化財マップ/attributes.csv']);
  });
});
