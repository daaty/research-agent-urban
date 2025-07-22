import dotenv from 'dotenv';
dotenv.config();

// Teste simples para verificar se o AI Agent está funcionando
async function testAIAgent() {
  console.log('🤖 Testando AI Agent...');
  
  try {
    // Verificar se as dependências estão disponíveis
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    console.log('✅ @google/generative-ai importado com sucesso');
    
    // Verificar se a API key está configurada
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️ GEMINI_API_KEY não configurada');
      return;
    }
    
    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('✅ Gemini AI inicializado');
    
    // Teste simples
    const result = await model.generateContent("Responda apenas 'OK' se você está funcionando");
    const response = await result.response;
    const text = response.text();
    
    console.log('🤖 Resposta do Gemini:', text);
    console.log('✅ AI Agent funcionando corretamente!');
    
  } catch (error: any) {
    console.error('❌ Erro no teste do AI Agent:', error.message);
  }
}

// Executar teste
testAIAgent();
