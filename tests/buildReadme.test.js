const path = require('path');
const { formatSource } = require(path.join(__dirname, '../src/build-readme'));

describe('formatSource', () => {
  it('returns an empty string when source is not set', () => {
    expect(formatSource({})).toBe('');
  });

  it('returns plain text when only source is set', () => {
    expect(formatSource({ source: '静岡県警察' })).toBe('静岡県警察');
  });

  it('returns a Markdown link when source and sourceUrl are set', () => {
    expect(formatSource({ source: '静岡県警察', sourceUrl: 'https://example.com/' }))
      .toBe('[静岡県警察](https://example.com/)');
  });

  it('escapes a pipe in source so the table row is not split', () => {
    expect(formatSource({ source: 'A | B' })).toBe('A \\| B');
  });

  it('escapes brackets in source so the link label is not broken', () => {
    expect(formatSource({ source: 'A]B[C', sourceUrl: 'https://example.com/' }))
      .toBe('[A\\]B\\[C](https://example.com/)');
  });

  it('escapes parentheses in sourceUrl so the link syntax is not broken', () => {
    expect(formatSource({ source: 'A', sourceUrl: 'https://example.com/foo(1)' }))
      .toBe('[A](https://example.com/foo%281%29)');
  });

  it('escapes a pipe in sourceUrl so the table row is not split', () => {
    expect(formatSource({ source: 'A', sourceUrl: 'https://example.com/?a=1|2' }))
      .toBe('[A](https://example.com/?a=1%7C2)');
  });

  it('collapses newlines in source into a single line', () => {
    expect(formatSource({ source: 'line1\nline2' })).toBe('line1 line2');
  });
});
