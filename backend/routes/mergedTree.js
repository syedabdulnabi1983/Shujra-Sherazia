const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

const MAIN_DB = 'shujra_sherazia';
const SOURCE_DBS = ['postgres', MAIN_DB];
const SOURCE_TABLES = ['prophets_chain', 'prophets_chain_import', 'ali_sherazia', 'ali_sherazia_import', 'tree_nodes', 'family_tree'];

const databaseUrlFor = (dbName) => {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/' + dbName;
  return url.toString();
};

const quoteIdent = (name) => '"' + String(name).replace(/"/g, '""') + '"';
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
const includesAny = (value, terms) => terms.some((term) => normalize(value).includes(term));

const tableExists = async (pool, table) => {
  const result = await pool.query('SELECT to_regclass($1) AS name', ['public.' + table]);
  return Boolean(result.rows[0]?.name);
};

const fetchTable = async (dbName, table) => {
  const pool = new Pool({ connectionString: databaseUrlFor(dbName), connectionTimeoutMillis: 3000 });
  try {
    if (!(await tableExists(pool, table))) return [];
    const result = await pool.query(`SELECT * FROM ${quoteIdent(table)} ORDER BY id`);
    return result.rows.map((row) => ({ ...row, _db: dbName, _table: table }));
  } finally {
    await pool.end();
  }
};

const loadSources = async () => {
  const byTable = {};
  for (const db of SOURCE_DBS) {
    for (const table of SOURCE_TABLES) {
      const rows = await fetchTable(db, table).catch(() => []);
      if (rows.length) byTable[`${db}.${table}`] = rows;
    }
  }
  return byTable;
};

const applyComputedGenerations = (rows) => {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const memo = new Map();
  const visit = (row, stack = new Set()) => {
    if (!row) return null;
    if (row.generation_number) return Number(row.generation_number);
    if (memo.has(row.id)) return memo.get(row.id);
    if (!row.parent_id || stack.has(row.id)) {
      memo.set(row.id, 1);
      return 1;
    }
    stack.add(row.id);
    const gen = (visit(byId.get(Number(row.parent_id)), stack) || 0) + 1;
    memo.set(row.id, gen);
    return gen;
  };
  rows.forEach((row) => {
    row._computed_generation = visit(row);
  });
};

const lineageFrom = (rows, id) => {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const path = [];
  const seen = new Set();
  let current = byId.get(Number(id));
  while (current && !seen.has(current.id)) {
    path.unshift(current);
    seen.add(current.id);
    current = current.parent_id ? byId.get(Number(current.parent_id)) : null;
  }
  return path;
};

const findBestMalook = (rows) => rows.find((row) => includesAny(row.name, ['malook', 'ملوک'])) || null;
const findBestMuhammad = (rows) => [...rows].reverse().find((row) => includesAny(row.name, ['muhammad', 'محمد'])) || null;
const findBestAdam = (rows) => rows.find((row) => includesAny(row.name, ['adam', 'آدم'])) || null;

const dedupePath = (path) => {
  const result = [];
  const seenStrict = new Set();
  for (const row of path) {
    const gen = row._computed_generation || row.generation_number || null;
    const strictKey = `${normalize(row.name)}|${normalize(row.father_name)}|${gen || ''}`;
    const previous = result[result.length - 1];
    if (previous && normalize(previous.name) === normalize(row.name)) continue;
    if (seenStrict.has(strictKey)) continue;
    seenStrict.add(strictKey);
    result.push(row);
  }
  return result;
};

const toPrintable = (path) => path.map((row, index) => ({
  id: row.id,
  name: row.name,
  father_name: row.father_name || '',
  mother_name: row.mother_name || '',
  wife_name: row.wife_name || row.spouse_name_db || '',
  urdu_name: row.urdu_name || '',
  birth_year: row.birth_year || (row.birth_date ? String(row.birth_date).slice(0, 4) : ''),
  death_year: row.death_year || (row.death_date ? String(row.death_date).slice(0, 4) : ''),
  info: row.info || '',
  photo: row.photo || null,
  generation_number: index + 1,
  source_generation: row.generation_number || row._computed_generation || null,
  source: `${row._db}.${row._table}`,
  source_id: row.id,
}));

const pickProphetSegment = (sources) => {
  const prophetGroups = [
    sources[`${MAIN_DB}.prophets_chain`] || [],
    sources[`${MAIN_DB}.prophets_chain_import`] || [],
    sources['postgres.prophets_chain'] || [],
  ].filter((rows) => rows.length);

  for (const rows of prophetGroups) {
    const target = findBestMuhammad(rows) || findBestAdam(rows);
    if (target) return lineageFrom(rows, target.id);
  }
  return [];
};

const buildPath = async (memberId, start) => {
  const sources = await loadSources();
  Object.values(sources).forEach(applyComputedGenerations);

  const familyRows = sources[`${MAIN_DB}.tree_nodes`] || [];
  const familyMember = familyRows.find((row) => Number(row.id) === Number(memberId));
  if (!familyMember) {
    const err = new Error('Selected member not found in family tree');
    err.status = 404;
    throw err;
  }

  const familySegment = lineageFrom(familyRows, familyMember.id);
  const aliRows = (sources[`${MAIN_DB}.ali_sherazia`] || []).length
    ? sources[`${MAIN_DB}.ali_sherazia`]
    : (sources['postgres.ali_sherazia'] || []);
  const aliMalook = findBestMalook(aliRows);
  const aliSegment = aliMalook ? lineageFrom(aliRows, aliMalook.id) : [];
  const prophetSegment = pickProphetSegment(sources);

  let label = 'Malook Shah to selected member';
  let path = familySegment;
  if (start === 'ali') {
    label = 'Hazrat Ali to selected member';
    path = [...aliSegment, ...familySegment];
  } else if (start === 'adam') {
    label = 'Hazrat Adam to selected member';
    path = [...prophetSegment, ...aliSegment, ...familySegment];
  }

  return {
    start,
    label,
    path: toPrintable(dedupePath(path)),
    source_counts: Object.fromEntries(Object.entries(sources).map(([key, rows]) => [key, rows.length])),
  };
};

router.get('/path', async (req, res) => {
  try {
    const start = ['adam', 'ali', 'malook'].includes(req.query.start) ? req.query.start : 'malook';
    const data = await buildPath(req.query.memberId, start);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ msg: err.message || 'Merged tree error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const sources = await loadSources();
    res.json(Object.fromEntries(Object.entries(sources).map(([key, rows]) => [key, rows.length])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Merged tree stats error' });
  }
});

module.exports = router;
