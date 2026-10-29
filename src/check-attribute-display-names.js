const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const csv = require('csvtojson');
const yaml = require('js-yaml');

// PR で変更された data/*/attributes.csv について、PR の元（base）にあって後（head）にない
// display_name を探す。
// convertAttributes.sh は original_name を display_name に改名した geojson を基盤へ送り、
// 基盤（vrt-transform）は前回の属性の設定と届いた属性名を突き合わせて、一致しないものを
// 警告なしに捨てる。そのため、行の削除や display_name の書き換えをマージすると、
// 基盤で設定していた表示の ON/OFF と表示名が消える。マージの前に PR で気づけるようにする。
// 警告だけで、チェックは失敗させない（名前を変えるのが正しい場合もあるため）。

const REPORT_FILE = 'attribute-display-name-report.md';
const MARKER = '<!-- check-attribute-display-names -->';

// UTF-8 として読めなければ Shift_JIS として読む（Excel で保存された CSV を想定）
const decode = (buffer) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('shift_jis').decode(buffer);
  }
};

const displayNames = async (buffer) => {
  const rows = await csv().fromString(decode(buffer));
  const names = rows
    .filter((row) => String(row.original_name || '').trim() !== '')
    .map((row) => String(row.display_name || '').trim())
    .filter((name) => name !== '');
  return [...new Set(names)];
};

const removedDisplayNames = async (baseBuffer, headBuffer) => {
  const head = new Set(await displayNames(headBuffer));
  return (await displayNames(baseBuffer)).filter((name) => !head.has(name));
};

const gitShow = (rev, file) => {
  try {
    return execFileSync('git', ['show', `${rev}:${file}`], { maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return null;
  }
};

// -z を付けないと、日本語のディレクトリ名が "data/\346\226..." のようにエスケープされ、
// git show で読めなくなる（data のディレクトリ名はほとんどが日本語）
const changedAttributeFiles = (base, head, cwd) =>
  execFileSync('git', ['diff', '-z', '--name-only', '--diff-filter=M', `${base}...${head}`, '--', 'data/*/attributes.csv'], {
    encoding: 'utf-8',
    cwd,
  })
    .split('\0')
    .filter(Boolean);

const dataName = (head, file) => {
  const config = gitShow(head, path.posix.join(path.posix.dirname(file), 'config.yml'));
  if (config) {
    try {
      const parsed = yaml.load(decode(config), { schema: yaml.FAILSAFE_SCHEMA }) || {};
      if (parsed.name) return String(parsed.name);
    } catch {
      // 名前が取れなければディレクトリ名を使う
    }
  }
  return path.posix.basename(path.posix.dirname(file));
};

const buildReport = (results) => {
  const lines = [
    MARKER,
    '## 属性の設定が消える変更があります',
    '',
    '次のデータで、地図に表示する項目の名前が変わる、またはなくなります。マージすると、地理空間データ連携基盤で設定していた、その項目の表示の ON/OFF と表示名が消えます。',
    '',
  ];
  for (const { name, removed } of results) {
    lines.push(`- ${name}：${removed.map((n) => `「${n}」`).join('、')}がなくなります`);
  }
  lines.push(
    '',
    '名前を変えるのが正しい場合は、そのままマージしてかまいません。マージの後に、地理空間データ連携基盤の属性の設定で、新しい名前の項目を設定し直してください。手順は「マニュアルの読み方ガイド」の「列の名前を変えたり、列を削除したりするときのご注意」をご覧ください。',
  );
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || 'HEAD';
  if (!base) {
    console.error('BASE_SHA が指定されていません');
    process.exit(1);
  }

  const results = [];
  for (const file of changedAttributeFiles(base, head)) {
    const baseBuffer = gitShow(base, file);
    const headBuffer = gitShow(head, file);
    if (!baseBuffer || !headBuffer) continue;
    const removed = await removedDisplayNames(baseBuffer, headBuffer);
    if (removed.length > 0) results.push({ name: dataName(head, file), file, removed });
  }

  if (results.length === 0) {
    console.log('属性の表示名がなくなる変更はありません');
    if (fs.existsSync(REPORT_FILE)) fs.unlinkSync(REPORT_FILE);
    return;
  }

  for (const { file, removed } of results) console.log(`${file}: ${removed.join(', ')}`);
  fs.writeFileSync(REPORT_FILE, buildReport(results), 'utf-8');
};

if (require.main === module) {
  main().catch((error) => {
    // 警告のためのチェックなので、失敗しても PR は止めない
    console.error(error);
  });
}

module.exports = { decode, displayNames, removedDisplayNames, changedAttributeFiles, buildReport, MARKER, REPORT_FILE };
