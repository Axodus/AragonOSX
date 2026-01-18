#!/usr/bin/env node
/* eslint-env node */
/* global require, process, console */
const fs = require('fs');
const {execFileSync} = require('child_process');

const input = process.argv[2];
if (!input) {
  console.error('Usage: gh-issue-ops.js <json-file> [--project-node-id <id>]');
  process.exit(2);
}
const json = JSON.parse(fs.readFileSync(input, 'utf8'));

let projectNodeId = null;
const pIdx = process.argv.indexOf('--project-node-id');
if (pIdx !== -1 && process.argv[pIdx + 1])
  projectNodeId = process.argv[pIdx + 1];

function getRepo() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const out = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      encoding: 'utf8',
    }).trim();
    const m = out.match(/github\.com[:/](.+)\/([^/.]+)(?:\.git)?$/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch (e) {
    /* ignore */
  }
  throw new Error('Unable to determine repo (set GITHUB_REPOSITORY)');
}

function findExistingIssueByTitle(title) {
  const repo = getRepo();
  const out = execFileSync(
    'gh',
    ['api', `repos/${repo}/issues?state=all&per_page=100`],
    {encoding: 'utf8'}
  );
  const issues = JSON.parse(out);
  return issues.find(i => i.title === title);
}

function createIssue(title, body, labels = []) {
  const repo = getRepo();
  const args = [
    'api',
    `repos/${repo}/issues`,
    '-f',
    `title=${title}`,
    '-f',
    `body=${body}`,
  ];
  if (labels.length) args.push('-f', `labels=${JSON.stringify(labels)}`);
  const out = execFileSync('gh', args, {encoding: 'utf8'});
  return JSON.parse(out);
}

function updateIssue(number, fields) {
  const repo = getRepo();
  const args = ['api', `repos/${repo}/issues/${number}`, '-X', 'PATCH'];
  Object.entries(fields).forEach(([k, v]) => args.push('-f', `${k}=${v}`));
  const out = execFileSync('gh', args, {encoding: 'utf8'});
  return JSON.parse(out);
}

function closeIssue(number) {
  return updateIssue(number, {state: 'closed'});
}

function attachToProjectIfPresent(issueObj) {
  if (!projectNodeId) return null;
  try {
    const contentId = issueObj.node_id;
    const query = `mutation ($projectId: ID!, $contentId: ID!) { addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } } }`;
    const args = [
      'api',
      'graphql',
      '-f',
      `query=${query}`,
      '-f',
      `projectId=${projectNodeId}`,
      '-f',
      `contentId=${contentId}`,
    ];
    const out = execFileSync('gh', args, {encoding: 'utf8'});
    return JSON.parse(out);
  } catch (e) {
    console.error('attachToProject failed:', e.message);
    return null;
  }
}

console.log('Syncing issues for', json.file);
for (const it of json.items) {
  const title = `${it.text} [source:${json.file}]`;
  const body = `Source: ${json.file}\n\nAutomated sync from PLAN.md.`;
  const existing = findExistingIssueByTitle(title);
  if (!existing && !it.checked) {
    console.log('Creating issue:', title);
    const created = createIssue(title, body, ['sync-md']);
    if (projectNodeId) {
      const res = attachToProjectIfPresent(created);
      console.log('Attached to project:', res ? 'ok' : 'failed');
    }
  } else if (existing && it.checked && existing.state !== 'closed') {
    console.log('Closing issue:', existing.number, title);
    closeIssue(existing.number);
  } else if (existing) {
    console.log('Issue already exists:', existing.number, title);
    if (projectNodeId) {
      const res = attachToProjectIfPresent(existing);
      if (res) console.log('Ensured attached to project');
    }
  }
}

console.log('Done');
