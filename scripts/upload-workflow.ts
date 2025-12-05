import { Octokit } from '@octokit/rest';
import * as fs from 'fs';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  const settings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken! } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return settings?.settings?.access_token || settings.settings?.oauth?.credentials?.access_token;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // 1. Ottieni l'ultimo commit
  console.log('📍 Ottengo ultimo commit...');
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: 'heads/main' });
  const latestCommitSha = ref.object.sha;
  
  // 2. Ottieni il tree del commit
  const { data: commit } = await octokit.git.getCommit({ owner, repo, commit_sha: latestCommitSha });
  
  // 3. Crea blob per il workflow
  console.log('📦 Creo blob per workflow...');
  const workflowContent = fs.readFileSync('.github/workflows/build-desktop.yml', 'utf-8');
  const { data: blob } = await octokit.git.createBlob({
    owner, repo,
    content: Buffer.from(workflowContent).toString('base64'),
    encoding: 'base64'
  });
  
  // 4. Crea nuovo tree
  console.log('🌳 Creo tree...');
  const { data: tree } = await octokit.git.createTree({
    owner, repo,
    base_tree: commit.tree.sha,
    tree: [{
      path: '.github/workflows/build-desktop.yml',
      mode: '100644',
      type: 'blob',
      sha: blob.sha
    }]
  });
  
  // 5. Crea commit
  console.log('💾 Creo commit...');
  const { data: newCommit } = await octokit.git.createCommit({
    owner, repo,
    message: 'Add GitHub Actions workflow for Windows build',
    tree: tree.sha,
    parents: [latestCommitSha]
  });
  
  // 6. Aggiorna ref
  console.log('🔗 Aggiorno branch...');
  await octokit.git.updateRef({
    owner, repo,
    ref: 'heads/main',
    sha: newCommit.sha
  });
  
  console.log('\n✅ Workflow caricato con successo!');
  console.log('');
  console.log('🔧 GitHub Actions: https://github.com/' + owner + '/' + repo + '/actions');
  console.log('');
  console.log('⏳ La build partirà automaticamente in pochi secondi.');
}

main().catch(e => {
  console.error('❌ Errore:', e.message);
  if (e.message.includes('Not Found') || e.message.includes('404')) {
    console.log('\n⚠️  Il token potrebbe non avere i permessi "workflow".');
    console.log('Devi aggiungere il workflow manualmente su GitHub.');
  }
});
