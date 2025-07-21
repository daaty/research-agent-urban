import { BrowserSessionManager } from './src/services/browserSessionManager';

/**
 * Script para testar e debugar a detecção de login
 */
async function testLoginDetection() {
  const sessionManager = BrowserSessionManager.getInstance();

  console.log('🔍 === TESTE DE DETECÇÃO DE LOGIN ===');
  console.log('');

  try {
    // 1. Inicializar browser
    console.log('1️⃣ Inicializando browser...');
    await sessionManager.initializeBrowser();

    // 2. Debug da página inicial
    console.log('2️⃣ Debug da página inicial:');
    await sessionManager.debugCurrentPage();

    // 3. Verificar status inicial
    console.log('3️⃣ Verificando status inicial...');
    const initialStatus = await sessionManager.getSessionStatus();
    console.log('Status inicial:', {
      browserActive: initialStatus.browserActive,
      sessionValid: initialStatus.sessionValid,
      currentlyLoggedIn: initialStatus.currentlyLoggedIn,
      requiresManualLogin: initialStatus.requiresManualLogin,
      message: initialStatus.message
    });

    // 4. Tentar login
    console.log('4️⃣ Tentando login...');
    const loginResult = await sessionManager.ensureLogin();
    console.log('Resultado do login:', loginResult);

    // 5. Debug após tentativa de login
    console.log('5️⃣ Debug após login:');
    await sessionManager.debugCurrentPage();

    // 6. Verificar status final
    console.log('6️⃣ Verificando status final...');
    const finalStatus = await sessionManager.getSessionStatus();
    console.log('Status final:', {
      browserActive: finalStatus.browserActive,
      sessionValid: finalStatus.sessionValid,
      currentlyLoggedIn: finalStatus.currentlyLoggedIn,
      requiresManualLogin: finalStatus.requiresManualLogin,
      message: finalStatus.message
    });

    // 7. Se não logou automaticamente, aguardar login manual
    if (!loginResult) {
      console.log('7️⃣ Login automático falhou, aguardando login manual...');
      console.log('📱 Por favor, faça login manualmente no navegador');
      console.log('⏳ Aguardando 120 segundos...');
      
      const manualLoginResult = await sessionManager.waitForManualLogin(120000);
      console.log('Resultado do login manual:', manualLoginResult);
      
      if (manualLoginResult) {
        console.log('8️⃣ Debug após login manual:');
        await sessionManager.debugCurrentPage();
        
        const postManualStatus = await sessionManager.getSessionStatus();
        console.log('Status após login manual:', {
          currentlyLoggedIn: postManualStatus.currentlyLoggedIn,
          message: postManualStatus.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }

  console.log('');
  console.log('🔚 Teste concluído');
  console.log('💡 Mantenha o navegador aberto para testes adicionais');
}

// Executar teste
testLoginDetection().catch(console.error);
