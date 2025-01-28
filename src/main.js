const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const { ButtplugClient, ButtplugNodeWebsocketClientConnector } = require('buttplug')
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const querystring = require('querystring');
const express = require('express');
const { Client, IntentsBitField } = require('discord.js');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const authSuccessPath = path.join(__dirname, 'authSuccess.html');
const expressApp = express();
const { saveCredentials, getCredentials, deleteCredentials, validateBotCredentials } = require('./utils')
require('dotenv').config();

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

let mainWindow;
let server = null;
let currentSettings = {
  toys: {},
  intensity: 1,
  duration: 1,
  cooldown: 0
};
let cooldownActive = false;
let botClient = null;
let client = null;

function startServer() {
  if (!server) {
    server = expressApp.listen(3000, () => {
      console.log(`Server is running at http://localhost:3000`);
    });
  }
}

function stopServer() {
  if (server) {
    server.close(() => {
      console.log('Server stopped');
      server = null;
    });
  }
}

async function stopBot() {
  if (botClient) {
    await botClient.destroy();
    console.log("Bot stopped.");
    botClient = null;
  } else {
    console.log("No bot client to stop.");
  }
}

async function vibrateToy(device) {
  try {
    const intensity = currentSettings.intensity ? currentSettings.intensity : 1;
    const duration = currentSettings.duration ? currentSettings.duration : 1;

    const clampedIntensity = Math.min(1, Math.max(0, intensity / 20));

    await device.vibrate(clampedIntensity);

    await new Promise(r => setTimeout(r, duration * 1000));
    await device.stop();

    console.log('Vibration command sent with intensity:', clampedIntensity);
  } catch (error) {
    console.error('Error vibrating toy:', error);
  }
}

function startCooldown(cooldownSeconds) {
  cooldownActive = true;
  setTimeout(() => {
    cooldownActive = false;
  }, cooldownSeconds * 1000);
}

// ----------------------------------------------------------------------------------

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  Menu.setApplicationMenu(null);

  const credentials = JSON.parse(await getCredentials('botCredentials'))
  const userId = await getCredentials('userId');

  if (credentials && userId) {
    mainWindow.loadFile('src/index.html');
  } else if (credentials && !userId) {
    mainWindow.loadFile('src/login.html');
    startServer();
  } else {
    mainWindow.loadFile('src/bot.html');
  }

  mainWindow.on('closed', async () => {
    mainWindow = null;
    stopServer();

    if (client) {
      await client.disconnect()
    }
  });
}

// ----------------------------------------------------------------------------------

const updateSettings = (key, value) => {
  const settings = JSON.parse(fs.readFileSync(settingsPath));
  settings[key] = value;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  currentSettings = settings;
};

const eventToKeyMap = {
  updateIntensity: 'intensity',
  updateCooldown: 'cooldown',
  updateIp: 'ip',
  updatePort: 'port'
};

Object.keys(eventToKeyMap).forEach((eventName) => {
  ipcMain.on(eventName, (event, value) => {
    const key = eventToKeyMap[eventName];
    updateSettings(key, value);
  });
});

ipcMain.on("reset", async () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');

    currentSettings = {}
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
      console.log("Settings file deleted");
    }

    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      console.log("Config file deleted");
    }

    await deleteCredentials('botCredentials')
    await deleteCredentials('userId')
    console.log('App reset.')

    mainWindow.loadFile('src/bot.html')
  } catch (error) { 
    console.error("Error resetting settings:", error);
    throw error;
  }
})

ipcMain.on("open-settings", () => {
  const appPath = path.join(app.getPath('userData'))
  if (appPath) shell.openPath(appPath)
})

ipcMain.on('disconnect', () => {
  stopBot()
})

ipcMain.on('open-link', () => {
  shell.openExternal(`https://x.com/CrazyDoctorDJ`);
})

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("connect", async (event, info) => {
    try {
      const { ip, port } = info;
      client = new ButtplugClient("HapticHaven");
      const connector = new ButtplugNodeWebsocketClientConnector(`ws://${ip}:${port}`);

      connector.on("error", (err) => {
        console.error("WebSocket error:", err);
        throw new Error("WebSocket connection failed.");
      });

      client.on("error", (err) => {
        console.error("Client error:", err);
        throw new Error("Client Error.");
      });

      console.log('Attempting Connection...')
      await client.connect(connector);

      console.log("Connected to Intiface Central!");
  
      const toys = [];
      client.addListener("deviceadded", (device) => {
        console.log(`Device Connected: ${device.name}`);

        if (device.vibrateAttributes.length === 0) {
          return;
        }

        toys.push({
          id: device.index,
          name: device.name,
          hasVibration: device.vibrateAttributes.length > 0,
          hasBattery: device.hasBattery,
        });
      });
  
      client.addListener("deviceremoved", (device) => {
        console.log(`Device Removed: ${device.name}`);
        if (toys.includes(device)) {
          toys = toys.filter((toy) => toy.id !== device.index);
        }
      });

      await client.startScanning();
      console.log("Started scanning for devices!");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await client.stopScanning();

      if (toys.length <= 0) {
        console.log("No devices found.");
        await client.disconnect();
        return 'noToysFound'
      } else {
        const settings = JSON.parse(fs.readFileSync(settingsPath));
        settings.toys = toys
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        currentSettings = settings;

        return toys;
      }
    } catch (err) {
      console.error("Failed to connect to Intiface Central:", err);
      return null;
    }
  });  

  ipcMain.handle('get-settings', async () => {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath));
    } else {
      return {};
    }
  });

  ipcMain.handle('store-bot-credentials', async (event, credentials) => {
    try {
      const validationResponse = validateBotCredentials(credentials);
      if (!validationResponse.valid) {
        return { valid: false, error: validationResponse.error }
      }
  
      const { botToken } = credentials;
  
      await axios.get('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });
  
      console.log('Bot credentials are valid');
      const botCredentials = JSON.stringify(credentials)
  
      await saveCredentials('botCredentials', botCredentials)
      startServer()
  
      return { valid: true }
    } catch (error) {
      console.error('Error verifying bot credentials:', error);
      return { valid: false }
    }
  });

  ipcMain.handle('open-auth-url', async () => {
    const { clientId } = JSON.parse(await getCredentials('botCredentials'));
  
    if (!clientId) {
      console.error('No bot credentials found');
      mainWindow.loadFile('src/bot.html');
      stopServer();
      throw new Error('No bot credentials found');
    }
  
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=1049600&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback&integration_type=0&scope=identify+guilds+bot`;
    shell.openExternal(authUrl);
  
    return new Promise((resolve, reject) => {
      let timeout;

      expressApp.get('/callback', async (req, res) => {
        clearTimeout(timeout);
  
        const { code } = req.query;
        if (!code) {
          res.status(400).send('Authorization code missing');
          return reject(new Error('Authorization code missing'));
        }
  
        const { clientId, clientSecret, botToken } = JSON.parse(await getCredentials('botCredentials'));
  
        if (!clientId || !clientSecret || !botToken) {
          mainWindow.loadFile('src/bot.html');
          stopServer();
          res.status(400).send('Missing credentials');
          return reject(new Error('Missing credentials'));
        }
  
        try {
          const response = await axios.post(
            'https://discord.com/api/oauth2/token',
            querystring.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              grant_type: 'authorization_code',
              redirect_uri: 'http://localhost:3000/callback',
              scope: 'identify guilds',
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
  
          const accessToken = response.data.access_token;
  
          const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
  
          const userId = String(userResponse.data.id);
          if (!userId) {
            res.status(400).send('Missing user ID');
            return reject(new Error('Missing user ID'));
          }
  
          await saveCredentials('userId', userId);

          stopServer();
  
          res.sendFile(authSuccessPath);

          let settings = {
            toys: [],
            intensity: 1,
            duration: 1,
            cooldown: 0,
            ip: '127.0.0.1',
            port: '12345',
          };

          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

          resolve(true);
        } catch (err) {
          console.error('Error during OAuth2 token exchange:', err.message);
          res.status(500).send('Internal Server Error');
          reject(err);
        }
      });

      timeout = setTimeout(() => {
        reject(new Error('Authorization timed out'));
      }, 60000);
    });
  });

  ipcMain.handle("start", async (event, selectedToyId) => {
    try {
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath));
        const selectedToy = settings.toys.find(toy => toy.id === selectedToyId);

        if (!selectedToy) {
          console.error("Selected toy not found.");
          return null;
        }
  
        currentSettings = settings
        const { botToken } = JSON.parse(await getCredentials('botCredentials'))
        const userId = await getCredentials('userId')

        if (!botToken || !userId) {
          console.error("Credentials not found.");
          return null;
        }
  
        botClient = await startBot(selectedToy, botToken, userId);

        return true;
      } else {
        console.error("Settings file not found.");
        return null;
      }
    } catch (error) {
      console.error("Error saving selected toy:", error);
      throw error;
    }
  });

  ipcMain.handle("stop", async (event) => {
    try {
      stopBot()
      return true;
    } catch (error) {
      console.error("Error saving selected toy:", error);
      throw error;
    }
  });

  app.on('quit', () => {
    stopServer();
  });
});

async function startBot(device, token, userId) {
    const client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.DirectMessages
      ],
      presence: {
        status: 'online',
      },
    });

    client.on('ready', () => {
      console.log(`User bot logged in as ${client.user.tag}`);
    });

    client.on('interactionCreate', async interaction => {
      console.log(interaction)
    })
  
    client.on('warn', console.warn);
  
    client.on('error', async (error) => {
      console.error('Client Error:', error.stack || error.message || error);
    });

    client.on('messageCreate', async message => {
      if (message.author.bot) return;

      if (message.mentions.has(userId)) {
        if (!cooldownActive) {
          await vibrateToy(device);
          if (currentSettings.cooldown > 0) {
            startCooldown(currentSettings.cooldown);
          }
        }
      }

      /* // Handle custom trigger phrases - not yet implemented
      for (const [phrase, intensity] of Object.entries(currentSettings.customTriggers)) {
        if (message.content.includes(phrase)) {
          if (!cooldownActive) {
            await vibrateToy(toy.id);
            startCooldown(currentSettings.cooldown);
          }
        }
      } */
    });

  client.login(token);
  return client;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});