/**
 * Script per caricare i file desktop-app nella ROOT del repo GitHub
 * per triggerare il build di GitHub Actions
 */

import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

let connectionSettings = null;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function uploadFile(octokit, owner, repo, filePath, content, message) {
  try {
    let sha = null;
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath
      });
      sha = data.sha;
      console.log(`  File exists, updating: ${filePath}`);
    } catch (e) {
      console.log(`  Creating new file: ${filePath}`);
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: message,
      content: Buffer.from(content).toString('base64'),
      sha: sha
    });
    
    console.log(`  ✓ Uploaded: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error uploading ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Push to GitHub ROOT - v1.0.6 Build Trigger');
  console.log('='.repeat(50));

  try {
    const octokit = await getGitHubClient();
    console.log('✓ GitHub client initialized');

    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`✓ Authenticated as: ${user.login}`);

    const owner = user.login;
    const repo = 'event-four-you-siae-lettore';
    
    console.log(`\nTarget repository: ${owner}/${repo}`);

    // Files to upload to ROOT (for GitHub Actions build)
    const filesToUpload = [
      { local: 'desktop-app/main.js', remote: 'main.js' },
      { local: 'desktop-app/index.html', remote: 'index.html' },
      { local: 'desktop-app/styles.css', remote: 'styles.css' },
      { local: 'desktop-app/renderer.js', remote: 'renderer.js' },
      { local: 'desktop-app/preload.js', remote: 'preload.js' },
      { local: 'desktop-app/package.json', remote: 'package.json' },
      { local: 'desktop-app/BUILD_INSTRUCTIONS.md', remote: 'BUILD_INSTRUCTIONS.md' },
      { local: 'desktop-app/SiaeBridge/Program.cs', remote: 'SiaeBridge/Program.cs' },
      { local: 'desktop-app/SiaeBridge/SiaeBridge.csproj', remote: 'SiaeBridge/SiaeBridge.csproj' }
    ];

    console.log(`\nUploading ${filesToUpload.length} files to ROOT...`);

    let successCount = 0;
    for (const file of filesToUpload) {
      const fullPath = path.join(process.cwd(), file.local);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const success = await uploadFile(
          octokit,
          owner,
          repo,
          file.remote,
          content,
          `v1.0.6: Auto-reconnect + PIN change feature`
        );
        if (success) successCount++;
      } else {
        console.log(`  ⚠ File not found: ${file.local}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Completed: ${successCount}/${filesToUpload.length} files uploaded to ROOT`);
    console.log('GitHub Actions should now trigger a new build!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
