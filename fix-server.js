// Função para corrigir o ficheiro corrompido
const fs = require('fs');

// Ler o ficheiro actual
let content = fs.readFileSync('src/app/client/page.tsx', 'utf8');

// Corrigir a linha corrompida do SuporteSection
content = content.replace(
  /const \[form, setForm\] = useState\({ assunto.*$/m,
  'const [form, setForm] = useState({ assunto: \'Geral\', descricao: \'\' });'
);

// Escrever o ficheiro corrigido
fs.writeFileSync('src/app/client/page.tsx', content);

console.log('Ficheiro corrigido com sucesso!');
