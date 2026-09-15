import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
try {
  writeFileSync(
    '.env',
    `HOST=127.0.0.1\nPORT=3000\nDB_PATH=./data/conecta.sqlite\nDEMO_READ_ONLY=false\nADMIN_TOKEN=${randomBytes(32).toString('hex')}\nALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081\n`,
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    '.env local criado. Consulte ADMIN_TOKEN nesse arquivo para abrir o Analytics. Não compartilhe o token.',
  );
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env já existe e foi preservado.');
  else throw error;
}
