import { BrowserSessionManager } from './src/services/browserSessionManager';

/**
 * Script para testar a correção da lógica de login/captcha
 * Simula o comportamento de reinicialização do container
 */
async function testLoginFix() {
  console.log('🧪 === TESTE DA CORREÇÃO DE LOGIN/CAPTCHA ===');
  console.log('🔄 Simulando comportamento de reinicialização do container...');
  console.log('');

  const sessionManager = BrowserSessionManager.getInstance();

  try {
    // 1. Inicializar browser (como faria no restart)
    console.log('1️⃣ Inicializando browser...');
    await sessionManager.initializeBrowser();
    
    // 2. Testar o método corrigido
    console.log('2️⃣ Testando ensureLoginWithCaptchaHandling (método corrigido)...');
    const loginResult = await sessionManager.ensureLoginWithCaptchaHandling(false);
    
    if (loginResult) {
      console.log('✅ Login realizado com sucesso!');
      
      // 3. Verificar status da sessão
      console.log('3️⃣ Verificando status da sessão...');
      const status = await sessionManager.getSessionStatus();
      console.log('Status da sessão:', {
        currentlyLoggedIn: status.currentlyLoggedIn,
        sessionValid: status.sessionValid,
        message: status.message
      });
      
      // 4. Testar navegação para confirmar que login funciona
      console.log('4️⃣ Testando navegação para confirmar login...');
      try {
        await sessionManager.navigateToPage('https://rides.ec2dashboard.com/#/app/dashboard/');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalStatus = await sessionManager.getSessionStatus();
        console.log(`✅ Navegação realizada - Ainda logado: ${finalStatus.currentlyLoggedIn ? 'SIM' : 'NÃO'}`);
      } catch (navError) {
        console.log('⚠️ Erro na navegação:', navError);
      }
      
    } else {
      console.log('❌ Falha no login');
      
      // Verificar motivo da falha
      const status = await sessionManager.getSessionStatus();
      console.log('Motivo da falha:', status.message);
      
      if (status.requiresManualLogin) {
        console.log('🤖 Captcha detectado - comportamento esperado');
        console.log('📱 Faça login manualmente no VNC e execute novamente para testar detecção');
      }
    }

  } catch (error: any) {
    console.error('❌ Erro durante teste:', error.message);
  }

  console.log('');
  console.log('🔚 Teste concluído');
  console.log('');
  console.log('💡 Resultados esperados:');
  console.log('✅ Detecção robusta de captcha');
  console.log('✅ Aguardo de login manual quando há captcha');
  console.log('✅ Detecção automática quando login manual é feito');
  console.log('✅ Sessão persistente após login');
  console.log('');
  console.log('🔄 Se há captcha, o sistema deve aguardar login manual');
  console.log('🎯 Use VNC em http://localhost:6080 para fazer login');
}

// Executar teste
testLoginFix().catch(console.error);