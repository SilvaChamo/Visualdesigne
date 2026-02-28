// Função para corrigir completamente o ficheiro
const fs = require('fs');

// Ler o ficheiro actual
let content = fs.readFileSync('src/app/client/page.tsx', 'utf8');

// Remover as linhas incorretas
content = content.replace(
  /}\)\s*\n\s*<\/div>\s*\n\s*\)\s*\n\s*}\s*\n/g,
  ')\n}\n'
);

// Corrigir a linha do SuporteSection se necessário
content = content.replace(
  /const \[form, setForm\] = useState\({ assunto.*$/m,
  'const [form, setForm] = useState({ assunto: \'Geral\', descricao: \'\' });'
);

// Escrever o ficheiro corrigido
fs.writeFileSync('src/app/client/page.tsx', content);

console.log('Ficheiro completamente corrigido!');
