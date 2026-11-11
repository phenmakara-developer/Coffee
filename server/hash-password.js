import bcrypt from 'bcryptjs'

const password = process.argv[2]

if (!password) {
  console.error('Usage: npm run hash-password -- "your-new-password"')
  process.exit(1)
}

if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error('Use 8+ characters with at least one letter and one number.')
  process.exit(1)
}

console.log(bcrypt.hashSync(password, 12))
