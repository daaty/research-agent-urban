require('dotenv').config();

console.log('🧪 TESTE VARIÁVEIS DE AMBIENTE');
console.log('===============================');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Verificar se existe .env
const fs = require('fs');
const path = require('path');

const envFiles = ['.env', '.env.local', '.env.production'];
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Arquivo encontrado: ${file}`);
  } else {
    console.log(`❌ Arquivo não encontrado: ${file}`);
  }
});
