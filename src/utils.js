const keytar = require('keytar');
const crypto = require('crypto');
const os = require('os');

let Store;
let store;

const initStore = async () => {
  Store = (await import('electron-store')).default;
  store = new Store();
};

const SERVICE_NAME = 'HapticHaven';

async function getEncryptionKey() {
  if (!store) await initStore();

  const deviceId = os.hostname();
  const salt = store.get('encryptionSalt') || crypto.randomBytes(16).toString('hex');
  if (!store.has('encryptionSalt')) {
    store.set('encryptionSalt', salt);
  }
  return crypto.createHash('sha256').update(deviceId + salt).digest('hex');
}

async function encrypt(data) {
  const encryptionKey = await getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-ctr', encryptionKey.slice(0, 32), Buffer.alloc(16, 0));
  return cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
}

async function decrypt(data) {
  const encryptionKey = await getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-ctr', encryptionKey.slice(0, 32), Buffer.alloc(16, 0));
  return decipher.update(data, 'base64', 'utf8') + decipher.final('utf8');
}

async function saveCredentials(key, value) {
  const encryptedValue = await encrypt(value);
  await keytar.setPassword(SERVICE_NAME, key, encryptedValue);
}

async function getCredentials(key) {
  const encryptedValue = await keytar.getPassword(SERVICE_NAME, key);
  return encryptedValue ? await decrypt(encryptedValue) : null;
}

async function deleteCredentials(key) {
  await keytar.deletePassword(SERVICE_NAME, key);
}

function validateBotCredentials(credentials) {
  const { clientId, clientSecret } = credentials;

  const clientIdValid = /^\d{18,}$/.test(clientId);
  const clientSecretValid = /^[a-zA-Z0-9_-]{32}$/.test(clientSecret);

  if (!clientIdValid) {
    return { valid: false, error: 'Invalid Client ID format. Expected at least 18 digits.' };
  }
  if (!clientSecretValid) {
    return { valid: false, error: 'Invalid Client Secret format. Expected exactly 32 alphanumeric characters, possibly including dashes and underscores.' };
  }

  return { valid: true };
}

module.exports = {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  validateBotCredentials
};