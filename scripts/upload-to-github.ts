/**
 * Upload diretto dei file su GitHub via API
 */

import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) throw new Error('Token non trovato');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
  ).then(res => res.json()).then(data => data.items?.[0]);

  return connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
}

// File da caricare per il progetto desktop
const filesToUpload = [
  '.github/workflows/build-desktop.yml',
  'desktop-app/package.json',
  'desktop-app/main.js',
  'desktop-app/preload.js',
  'desktop-app/index.html',
  'desktop-app/styles.css',
  'desktop-app/renderer.js',
  'desktop-app/SiaeBridge/SiaeBridge.csproj',
  'desktop-app/SiaeBridge/Program.cs',
  'desktop-app/SiaeBridge/LibSiae.cs',
  'desktop-app/SiaeBridge/README.md',
];

async function main() {
  console.log('📤 Caricamento file su GitHub...\n');
  
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  const owner = 'evenfouryou';
  const repo = 'event-four-you-siae-lettore';
  
  // Prima crea un README per inizializzare il repo
  console.log('📝 Inizializzazione repository...');
  
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, repo,
      path: 'README.md',
      message: 'Initial commit - Event Four You SIAE Lettore',
      content: Buffer.from('# Event Four You SIAE Lettore\n\nSmart Card Reader per MiniLector EVO V3\n').toString('base64')
    });
    console.log('✅ README.md creato');
  } catch (e: any) {
    if (!e.message?.includes('sha')) {
      console.log('⚠️  README già esiste, continuo...');
    }
  }
  
  // Attendi un attimo per la sincronizzazione
  await new Promise(r => setTimeout(r, 1000));
  
  // Ora carica tutti i file uno per uno
  for (const filePath of filesToUpload) {
    const fullPath = path.join('/home/runner/workspace', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File non trovato: ${filePath}`);
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    try {
      // Prova a ottenere il file esistente per il SHA
      let sha: string | undefined;
      try {
        const { data: existing } = await octokit.repos.getContent({ owner, repo, path: filePath });
        if ('sha' in existing) {
          sha = existing.sha;
        }
      } catch {
        // File non esiste, va bene
      }
      
      await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: filePath,
        message: `Add ${filePath}`,
        content: Buffer.from(content).toString('base64'),
        sha
      });
      
      console.log(`✅ ${filePath}`);
    } catch (e: any) {
      console.log(`❌ ${filePath}: ${e.message}`);
    }
  }
  
  // Carica anche libSIAE.dll
  const dllPath = '/home/runner/workspace/attached_assets';
  if (fs.existsSync(dllPath)) {
    const dllFiles = fs.readdirSync(dllPath)
      .filter(f => f.toLowerCase().includes('libsiae') && f.endsWith('.dll'));
    
    for (const dllFile of dllFiles) {
      const fullPath = path.join(dllPath, dllFile);
      const content = fs.readFileSync(fullPath);
      
      try {
        let sha: string | undefined;
        try {
          const { data: existing } = await octokit.repos.getContent({ 
            owner, repo, 
            path: `attached_assets/${dllFile}` 
          });
          if ('sha' in existing) sha = existing.sha;
        } catch {}
        
        await octokit.repos.createOrUpdateFileContents({
          owner, repo,
          path: `attached_assets/${dllFile}`,
          message: `Add ${dllFile}`,
          content: content.toString('base64'),
          sha
        });
        
        console.log(`✅ attached_assets/${dllFile}`);
      } catch (e: any) {
        console.log(`❌ ${dllFile}: ${e.message}`);
      }
    }
  }
  
  console.log('\n🎉 Upload completato!');
  console.log(`\n📦 Repository: https://github.com/${owner}/${repo}`);
  console.log(`🔧 GitHub Actions: https://github.com/${owner}/${repo}/actions`);
  console.log('\n⏳ La build partirà automaticamente. Dopo 5-10 minuti potrai scaricare l\'installer.');
}

main().catch(e => {
  console.error('❌ Errore:', e.message);
  process.exit(1);
});
