# Verificação visual de alterações de UI

Antes de reportar qualquer alteração visual (CSS/layout/alinhamentos) como concluída,
confirma-a com um screenshot real — "compila sem erros" só garante que o TypeScript
aceita o código, não que o resultado visual está correcto.

## Como tirar o screenshot neste Mac

O download automático do Chromium do Playwright falha aqui (`ERROR: Playwright does
not support chromium on mac13` — parece um bug da versão que o `npx playwright`
instala por defeito). Em vez disso:

1. Instala uma versão fixa mais antiga (não faz download de browser, só a lib):
   `npm install -D playwright@1.48.0 --no-save`
2. Usa o Google Chrome já instalado no Mac em vez do Chromium do Playwright
   (evita o download que falha): `chromium.launch({ channel: 'chrome' })`.
3. O servidor de dev já costuma estar a correr — confirma com
   `lsof -iTCP -sTCP:LISTEN -P | grep node` antes de arrancar outro.
4. Para páginas que exigem login (painel admin), cria uma página temporária
   (`src/app/dev-preview-x/page.tsx`) com dados fictícios que reproduza só o
   componente em causa, em vez de tentar autenticar. Apaga-a no fim.
5. Se a página herdar o header fixo do site (cobre o topo no screenshot), esconde
   elementos fixed/sticky antes do screenshot:
   ```js
   await page.evaluate(() => {
     document.querySelectorAll('*').forEach((el) => {
       const p = getComputedStyle(el).position;
       if (p === 'fixed' || p === 'sticky') el.style.display = 'none';
     });
   });
   ```
   ou tira o screenshot de um elemento específico (`locator(...).screenshot()`)
   em vez da página inteira.
6. Limpa tudo no fim: página de preview, script `.mjs` temporário, e
   `npm uninstall playwright --no-save` (não fica como dependência do projecto).

Repete isto para cada secção/UI em que trabalhares — não só para esta funcionalidade.
