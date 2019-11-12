const path = require('path');
const parser = require('../src/functions');

describe('functions', () => {
  it('fails on invalid file', async () => {
    expect.hasAssertions();

    const filename = path.join(__dirname, 'unknown.xml');

    await expect(parser.readFile(filename)).rejects.toThrow('no such file or directory');
  });

  it('parse XML to JS', async () => {
    expect.hasAssertions();

    const filename = path.join(__dirname, '/clover.xml');
    const coverage = await parser.readFile(filename);

    expect(coverage).toHaveProperty('coverage');
    expect(coverage.coverage).toHaveProperty('project');
    expect(coverage.coverage.project).toHaveProperty('0');
    expect(coverage.coverage.project[0]).toHaveProperty('metrics');
    expect(coverage.coverage.project[0].metrics).toHaveProperty('0');

    const metric = parser.readMetric(coverage);

    ['statements', 'lines', 'methods', 'branches'].forEach((type) => {
      expect(metric).toHaveProperty(type);
      expect(metric[type]).toHaveProperty('total');
      expect(metric[type]).toHaveProperty('covered');
      expect(metric[type]).toHaveProperty('rate');
    });

    expect(metric.lines.rate).toStrictEqual(70.59); // 24 / 34
    expect(metric.statements.rate).toStrictEqual(68.18); // 45 / 66
    expect(metric.methods.rate).toStrictEqual(83.33); // 10 / 12
    expect(metric.branches.rate).toStrictEqual(55); // 11 / 20

    expect(metric).toHaveProperty('level');
    expect(metric.level).toStrictEqual('yellow'); // 79.59 < 90
  });

  it('calculate level', async () => {
    expect.hasAssertions();

    [
      [49, 50, 90, 'red'],
      [89, 50, 90, 'yellow'],
      [90, 50, 90, 'green'],
    ].forEach(
      ([linesRate, thresholdAlert, thresholdWarning, level]) => {
        const metric = { lines: { rate: linesRate } };
        const options = { thresholdAlert, thresholdWarning };
        expect(parser.calculateLevel(metric, options)).toStrictEqual(level);
      },
    );
  });

  it('generate status', async () => {
    expect.hasAssertions();
    const targetUrl = 'https://example.com';
    const statusContext = 'coverage';
    const rate = 50;

    expect(parser.generateStatus({
      targetUrl,
      statusContext,
      metric: { lines: { rate }, level: 'red' },
    })).toStrictEqual({
      state: 'failure',
      description: `Error: Too low coverage - ${rate}%`,
      target_url: targetUrl,
      context: statusContext,
    });

    expect(parser.generateStatus({
      targetUrl,
      statusContext,
      metric: { lines: { rate }, level: 'yellow' },
    })).toStrictEqual({
      state: 'success',
      description: `Warning: low coverage - ${rate}%`,
      target_url: targetUrl,
      context: statusContext,
    });

    expect(parser.generateStatus({
      targetUrl,
      statusContext,
      metric: { lines: { rate }, level: 'green' },
    })).toStrictEqual({
      state: 'success',
      description: `Success: Coverage - ${rate}%`,
      target_url: targetUrl,
      context: statusContext,
    });
  });

  it('generate badge URL', async () => {
    expect.hasAssertions();

    const metric = {
      lines: { rate: 9.4 },
      level: 'green',
    };

    expect(parser.generateBadgeUrl(metric)).toStrictEqual('https://img.shields.io/static/v1?label=coverage&message=9%&color=green');
  });

  it('generate emoji', async () => {
    expect.hasAssertions();
    expect(parser.generateEmoji({ lines: { rate: 100 } })).toStrictEqual(' 🎉');
    expect(parser.generateEmoji({ lines: { rate: 99.99 } })).toStrictEqual('');
  });

  it('generate table', async () => {
    expect.hasAssertions();

    const metric = {
      statements: {
        total: 10,
        covered: 1,
        rate: 10,
      },
      lines: {
        total: 10,
        covered: 2,
        rate: 20,
      },
      methods: {
        total: 10,
        covered: 3,
        rate: 30,
      },
      branches: {
        total: 10,
        covered: 4,
        rate: 40,
      },
      level: 'yellow',
    };

    const expectedString = `
## Coverage Report

|  Totals | ![Coverage](https://img.shields.io/static/v1?label=coverage&message=20%&color=yellow) |
| :-- | --: |
| Statements: | 20% ( 2 / 10 ) |
| Methods: | 30% ( 3 / 10 ) |
`;

    expect(parser.generateTable(metric)).toStrictEqual(expectedString);
  });
});