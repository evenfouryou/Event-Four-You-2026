import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;
  if (!xReplitToken) throw new Error('X_REPLIT_TOKEN not found');
  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);
  return connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
}

const workflowContent = `name: Build Electron App

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: \${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build Electron app
        run: npm run build
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: print-agent-\${{ matrix.os }}
          path: |
            dist/*.exe
            dist/*.dmg
            dist/*.AppImage
          retention-days: 30
`;

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  const owner = 'evenfouryou';
  const repo = 'event4u-print-agent';
  
  try {
    // Get ref for main branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner, repo, ref: 'heads/main'
    });
    const latestCommitSha = ref.object.sha;
    
    // Get base tree
    const { data: commit } = await octokit.rest.git.getCommit({
      owner, repo, commit_sha: latestCommitSha
    });
    const baseTreeSha = commit.tree.sha;
    
    // Create blob for workflow file
    const { data: blob } = await octokit.rest.git.createBlob({
      owner, repo,
      content: Buffer.from(workflowContent).toString('base64'),
      encoding: 'base64'
    });
    
    // Create tree with new file
    const { data: tree } = await octokit.rest.git.createTree({
      owner, repo,
      base_tree: baseTreeSha,
      tree: [{
        path: '.github/workflows/build.yml',
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      }]
    });
    
    // Create commit
    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner, repo,
      message: 'Add GitHub Actions workflow for building Electron app',
      tree: tree.sha,
      parents: [latestCommitSha]
    });
    
    // Update ref
    await octokit.rest.git.updateRef({
      owner, repo,
      ref: 'heads/main',
      sha: newCommit.sha
    });
    
    console.log('Workflow added!');
    console.log('Build will start at: https://github.com/evenfouryou/event4u-print-agent/actions');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
