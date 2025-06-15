import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

export async function testEnvironmentVariables(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('=== Debug das Variáveis de Ambiente ===');
    console.log('RIDES_URL:', process.env.RIDES_URL);
    console.log('RIDES_LOGIN:', process.env.RIDES_LOGIN);
    console.log('RIDES_PASSWORD:', process.env.RIDES_PASSWORD ? '***DEFINIDA***' : 'UNDEFINED');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PWD:', process.env.PWD);
    
    if (!process.env.RIDES_URL) {
      return {
        success: false,
        message: 'RIDES_URL não está definida'
      };
    }
    
    if (!process.env.RIDES_LOGIN) {
      return {
        success: false,
        message: 'RIDES_LOGIN não está definida'
      };
    }
    
    if (!process.env.RIDES_PASSWORD) {
      return {
        success: false,
        message: 'RIDES_PASSWORD não está definida'
      };
    }
    
    return {
      success: true,
      message: `Todas as variáveis estão definidas: URL=${process.env.RIDES_URL}, LOGIN=${process.env.RIDES_LOGIN}`
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Erro ao verificar variáveis: ${error.message}`
    };
  }
}
