// Script per generare hash bcrypt per password admin
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'Admin2024!';
const hash = bcrypt.hashSync(password, 10);

console.log('\n=================================');
console.log('Password:', password);
console.log('Hash bcrypt:', hash);
console.log('=================================\n');
console.log('Copia questo hash per usarlo nella query SQL:\n');
console.log(hash);
console.log('\n');
