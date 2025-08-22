const fs = require('fs');

function validateBrackets(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let braceStack = [];
    let parenStack = [];
    let tryStack = [];
    
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        // Encontrar try
        if (line.includes('try {')) {
            tryStack.push(lineNum);
        }
        
        // Encontrar catch
        if (line.includes('} catch')) {
            if (tryStack.length === 0) {
                console.log(`ERRO: Catch sem try correspondente na linha ${lineNum}: ${line.trim()}`);
            } else {
                const tryLine = tryStack.pop();
                console.log(`OK: Try linha ${tryLine} fechado por catch linha ${lineNum}`);
            }
        }
        
        // Contar chaves
        for (let char of line) {
            if (char === '{') {
                braceStack.push(lineNum);
            } else if (char === '}') {
                if (braceStack.length === 0) {
                    console.log(`ERRO: Chave fechando sem abertura na linha ${lineNum}`);
                } else {
                    braceStack.pop();
                }
            }
        }
    }
    
    if (tryStack.length > 0) {
        console.log(`ERRO: Try sem catch nas linhas: ${tryStack.join(', ')}`);
    }
    
    if (braceStack.length > 0) {
        console.log(`ERRO: Chaves não fechadas a partir das linhas: ${braceStack.slice(-5).join(', ')}`);
    }
    
    console.log(`Total de tries restantes: ${tryStack.length}`);
    console.log(`Total de chaves não fechadas: ${braceStack.length}`);
}

validateBrackets('./src/services/monitoringService.ts');
