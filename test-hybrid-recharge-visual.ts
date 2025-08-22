#!/usr/bin/env npx ts-node

/**
 * Script de teste para recarga híbrida com acompanhamento visual
 * - Inicia o sistema híbrido
 * - Aguarda o navegador abrir
 * - Faz uma chamada de recarga via API
 * - Permite acompanhar o fluxo no navegador
 */

import axios from 'axios';

async function waitForApiReady(url: string, maxTries = 10, delayMs = 2000) {
  for (let i = 0; i < maxTries; i++) {
    try {
      await axios.get(url);
      return true;
    } catch {
      console.log(`⏳ Aguardando API em ${url}...`);
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
  return false;
}

async function main() {
  const apiUrl = 'http://localhost:3000/api/hybrid/status';

  const ready = await waitForApiReady(apiUrl);
  if (!ready) {
    console.error('❌ API não está rodando em http://localhost:3000. Inicie o backend antes de rodar este teste.');
    process.exit(1);
  }

  console.log('🚦 Iniciando sistema híbrido...');
  await axios.post('http://localhost:3000/api/hybrid/start');
  console.log('✅ Sistema híbrido iniciado. Aguarde o navegador abrir e a extração começar.');

  // Aguarda alguns segundos para garantir que o navegador abriu
  await new Promise(res => setTimeout(res, 10000));

  console.log('💳 Enviando recarga para o motorista 17147322...');
  const response = await axios.post('http://localhost:3000/api/hybrid/recharge', {
    driverId: '17147322',
    amount: 20,
    priority: 'urgent'
  });
  console.log('🔔 Resposta da API de recarga:', response.data);

  console.log('👀 Acompanhe o navegador e os logs para ver a recarga sendo processada!');
}

main().catch(err => {
  console.error('❌ Erro no teste:', err);
  process.exit(1);
});
