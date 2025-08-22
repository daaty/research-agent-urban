// Correção para botão Credit/Debit
// Substituir linha 1078-1080 em RidesDashboardHybridScraper.ts

// ANTES:
// await this.page.waitForSelector('button:has-text("Credit/Debit")', { timeout: 10000 });
// await this.page.click('button:has-text("Credit/Debit")');

// DEPOIS:
// Aguardar mais tempo e usar seletor específico
await this.page.waitForTimeout(5000);

// Procurar botão com seletor correto
console.log('🔍 Procurando botão Credit/Debit...');
let buttonClicked = false;

// Tentar seletor específico baseado no ng-click
try {
  await this.page.waitForSelector('button[ng-click="openPopUp()"]', { timeout: 15000 });
  const isVisible = await this.page.isVisible('button[ng-click="openPopUp()"]');
  if (isVisible) {
    await this.page.click('button[ng-click="openPopUp()"]');
    console.log('💳 Botão Credit/Debit clicado (ng-click)');
    buttonClicked = true;
  }
} catch (e) {
  console.log('❌ Seletor ng-click falhou, tentando has-text...');
}

// Fallback para seletor has-text se o primeiro falhar
if (!buttonClicked) {
  await this.page.waitForSelector('button:has-text("Credit/Debit")', { timeout: 15000 });
  await this.page.click('button:has-text("Credit/Debit")');
  console.log('💳 Botão Credit/Debit clicado (has-text)');
}
