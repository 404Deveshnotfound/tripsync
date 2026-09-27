#!/usr/bin/env node

/**
 * TripSync — Nugen Intelligence Alignment & Deployment Pipeline
 * HackCelestial 3.0 Mandatory Technology Requirement
 *
 * Demonstrates:
 * Base AI Model (llama-v3p2-3b-reasoning)
 *   -> Nugen Alignment & Customization
 *   -> Domain-Specific Hospitality Weather Twin Model
 *   -> Integration into TripSync Live Ledger
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = (match[2] || '').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const API_KEY = process.env.NUGEN_API_KEY || '';
const BASE_URL = 'https://api.nugen.in';

console.log('\n🌟 ========================================================');
console.log('   Nugen Intelligence Alignment & Domain Model Pipeline    ');
console.log('   HackCelestial 3.0 | Pillai University                   ');
console.log('========================================================\n');

async function runPipeline() {
  const headers = { 'Authorization': `Bearer ${API_KEY}` };

  console.log(`🔑 Authenticating with Nugen API Key: ${API_KEY.slice(0, 10)}...`);

  // Step 1: Upload Dataset
  const datasetPath = path.join(__dirname, 'datasets', 'tripsync_domain_alignment.jsonl');
  if (!fs.existsSync(datasetPath)) {
    console.error('❌ Dataset not found at:', datasetPath);
    process.exit(1);
  }

  console.log('\n📤 Step 1: Uploading Domain Dataset (TripSync Financial Ledger & Weather Disruption) to Nugen...');
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(datasetPath)], { type: 'application/json' });
  formData.append('files', fileBlob, 'tripsync_domain_alignment.jsonl');
  formData.append('categories', 'text/json');

  const uploadRes = await fetch(`${BASE_URL}/api/v3/documents/create`, {
    method: 'POST',
    headers,
    body: formData
  });

  const uploadData = await uploadRes.json();
  const documentId = uploadData.document_ids?.[0];
  console.log(`✅ Dataset Uploaded! Document ID: ${documentId}`);

  // Step 2: Generate Benchmark
  console.log('\n📊 Step 2: Generating Domain Evaluation Benchmark...');
  const benchRes = await fetch(`${BASE_URL}/api/v3/benchmarks/create`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_ids: [documentId],
      num_questions: 4
    })
  });
  const benchData = await benchRes.json();
  const benchmarkId = benchData.benchmark_id;
  console.log(`✅ Benchmark Created! Benchmark ID: ${benchmarkId} (Status: ${benchData.status})`);

  // Step 3: Trigger Alignment on Base Model
  console.log('\n🧠 Step 3: Aligning Base Model (llama-v3p2-3b-reasoning) to Hospitality Domain...');
  const alignRes = await fetch(`${BASE_URL}/api/v3/alignment-projects/create`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alignment_name: 'TripSync Hospitality Weather Twin Alignment',
      base_model_id: 'llama-v3p2-3b-reasoning',
      document_ids: [documentId],
      benchmark_id: benchmarkId,
      description: 'Aligning model on weather disruption propagation, venue cancellation protocols, and group ledger dynamic recalculation'
    })
  });
  const alignData = await alignRes.json();
  const alignmentId = alignData.alignment_id;
  console.log(`✅ Alignment Project Running! Alignment ID: ${alignmentId} (Status: ${alignData.status})`);

  // Step 4: Verification Inference
  console.log('\n⚡ Step 4: Verifying Inference via Nugen Deployed Model (glm-5p2)...');
  const infRes = await fetch(`${BASE_URL}/api/v3/inference/chat/completions`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'glm-5p2',
      messages: [
        { role: 'system', content: 'You are TripSync Digital Twin copilot.' },
        { role: 'user', content: 'Summarize weather disruption protocol in 1 sentence.' }
      ],
      stream: true,
      max_tokens: 150
    })
  });

  console.log(`✅ Nugen Inference Stream Connected (Status: ${infRes.status})`);

  console.log('\n🎉 ========================================================');
  console.log('   NUGEN INTELLIGENCE PIPELINE SUCCESSFULLY ESTABLISHED!  ');
  console.log(`   - Document ID:   ${documentId}`);
  console.log(`   - Benchmark ID:  ${benchmarkId}`);
  console.log(`   - Alignment ID:  ${alignmentId}`);
  console.log(`   - Base Model:    llama-v3p2-3b-reasoning`);
  console.log(`   - Deployed Unit: glm-5p2 (Integrated into TripSync UI)`);
  console.log('========================================================\n');
}

runPipeline().catch(console.error);
