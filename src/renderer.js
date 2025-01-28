document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.getAttribute('data-page');

  if (page === 'bot') {
    document.getElementById('credentials-form').addEventListener('submit', async (event) => {
      event.preventDefault();
    
      const clientId = document.getElementById('client-id').value;
      const clientSecret = document.getElementById('client-secret').value;
      const botToken = document.getElementById('bot-token').value;
      const button = document.getElementById('connect-bot')
      button.disabled = true;

      const response = await window.Electron.ipcRenderer.invoke('store-bot-credentials', { clientId, clientSecret, botToken });
      if (response.valid) {
        console.log('Credentials verified successfully');
        document.body.classList.add('fade-out');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1000);
      } else if (response.error) {
        console.error('Invalid credentials');
        alert(`${response.error}`)
        button.disabled = false;
      } else {
        console.error('Unknown error');
        alert('Something broke. Please try again.')
        button.disabled = false;
      }
    });
  } else if (page === 'login') {
    document.getElementById('login-button').addEventListener('click', async () => {
      const button = document.getElementById('login-button');
      const loginText = document.getElementById('login-text');
      const dotLoader = document.getElementById('dot-loader');

      loginText.style.display = 'none';
      dotLoader.style.display = 'inline-block';
      button.disabled = true;

      const result = await window.Electron.ipcRenderer.invoke('open-auth-url');
      console.log('[RENDERER] Result from open-auth-url:', result);
      if (result) {
        document.body.classList.add('fade-out');

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        console.error('Login error:', error.message);

        loginText.style.display = 'inline';
        dotLoader.style.display = 'none';
        button.disabled = false;

        alert('An error occurred. Please try again.');
      }
    })
  } else if (page === 'index') {
    let ip, port
    try {
      const settings = await window.Electron.ipcRenderer.invoke('get-settings');
        document.getElementById('intensity').value = settings.intensity || '1';
        document.getElementById('duration').value = settings.intensity || '1';
        document.getElementById('cooldown').value = settings.cooldown || '0';
        ip = document.getElementById('mobile-ip').value = settings.ip || '127.0.0.1';
        port = document.getElementById('mobile-port').value = settings.port || '12345';
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    const connectionMode = document.getElementById('connection-mode');
    const mobileSettings = document.getElementById('mobile-connection-settings');
    const connectButton = document.getElementById('connection');
    const connectionStatus = document.getElementById('connection-text');
    const dotLoader = document.getElementById('dot-loader');
    const ipMenu = document.getElementById('mobile-ip');
    const portMenu = document.getElementById('mobile-port');

    if (ip && ip === '127.0.0.1') {
      mobileSettings.style.display = 'none';
      connectionMode.value = 'pc';
    } else {
      mobileSettings.style.display = 'block';
      connectionMode.value = 'mobile';
    }

    connectionMode.addEventListener('change', () => {
      if (connectionMode.value === 'mobile') {
        mobileSettings.style.display = 'block';
      } else {
        mobileSettings.style.display = 'none';
      }
    });

    ipMenu.addEventListener('input', async () => {
      const newIp = ipMenu.value;
      ip = newIp
      window.Electron.ipcRenderer.send('updateIp', ip)
    })

    portMenu.addEventListener('input', async () => {
      const newPort = portMenu.value;
      port = newPort
      window.Electron.ipcRenderer.send('updatePort', ip)
    })

    connectButton.addEventListener('click', async () => {
      const mode = connectionMode.value;

      connectionStatus.style.display = 'none';
      dotLoader.style.display = 'inline-block';
      connectButton.disabled = true;

      try {
        if (mode === 'pc') {
          ip = '127.0.0.1'
          port = '12345'
        }

        function withTimeout(promise, timeoutMs) {
          return Promise.race([
            promise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
            ),
          ]);
        }

        const result = await withTimeout(
          window.Electron.ipcRenderer.invoke('connect', { ip, port }),
          5000
        );

        if (result && result !== 'noToysFound') {
          connectionStatus.textContent = 'Connected';
          connectButton.style.backgroundColor = '#4CAF50';
          connectionStatus.style.display = 'inline';
          dotLoader.style.display = 'none';
          connectButton.disabled = false;

          const toyList = document.getElementById("toy-list");
          toyList.innerHTML = "";
        
          result.forEach((toy) => {
            const option = document.createElement("option");
            option.value = toy.id;
            option.textContent = toy.name || "Unnamed Toy";
            toyList.appendChild(option);
          });
  
          document.getElementById("toy-selection").style.display = "block";
        } else if (result && result === 'noToysFound') {
          alert('Succesfully connected to Intiface, but no toys were found. Please connect a toy first then click Connect again.')

          connectionStatus.style.display = 'inline';
          dotLoader.style.display = 'none';
          connectButton.disabled = false;
        } else {
          alert('Failed to connect to Intiface.')

          connectionStatus.style.display = 'inline';
          dotLoader.style.display = 'none';
          connectButton.disabled = false;
        }
      } catch (error) {
        console.error('Connection error:', error);
        alert('Connection failed.');
        connectionStatus.style.display = 'inline';
        dotLoader.style.display = 'none';
        connectButton.disabled = false;
      }
    });

    document.getElementById("start").addEventListener("click", async () => {
      const menu = document.getElementById("toy-list")
      const button = document.getElementById("start")
      const selectedToyId = menu.value;
    
      if (!selectedToyId && button.textContent === 'Start') {
        alert("Please select a toy.");
        return;
      }

      if (button.textContent === 'Start') {
        menu.disabled = true
        try {
          const result = await window.Electron.ipcRenderer.invoke("start", selectedToyId);
          if (result) {
            button.textContent = 'Running :3';
            button.style.backgroundColor = '#4CAF50';
          } else {
            alert("Failed to start the toy. Please try again.");
            menu.disabled = false
          }
        } catch (error) {
          console.error("Error selecting toy:", error);
        }
      } else {
        try {
          const result = await window.Electron.ipcRenderer.invoke("stop");
          if (result) {
            button.textContent = 'Start';
            button.style.backgroundColor = '#4a90e2';
            menu.disabled = false
          } else {
            alert("Failed to stop the toy. Please try again.");
            menu.disabled = false
          }
        } catch (error) {
          console.error("Error stopping toy:", error);
        }
      }
    });

    document.getElementById('intensity').addEventListener('input', (event) => {
      const intensity = event.target.value;

      if (intensity >= 1 && intensity <= 20) {
        window.Electron.ipcRenderer.send('updateIntensity', intensity);
      } else {
        alert('Intensity should be between 1 and 20!'); 
      }
    })

    document.getElementById('duration').addEventListener('input', (event) => {
      const duration = event.target.value;
      if (duration >= 0 && duration <= 600) {
        window.Electron.ipcRenderer.send('updateDuration', duration);
      } else {
        alert('Duration should be more than 0!');
      }
    })

    document.getElementById('cooldown').addEventListener('input', (event) => {
      const cooldown = event.target.value;

      if (cooldown >= 0 && cooldown <= 600) {
        window.Electron.ipcRenderer.send('updateCooldown', cooldown);
      } else {
        alert('Cooldown should be between 0 and 600 seconds!'); 
      }
    })

    document.getElementById("reset").addEventListener("click", async () => {
      try {
        window.Electron.ipcRenderer.send("reset");
      } catch (error) {
        console.error("Error selecting toy:", error);
      }
    });

    document.getElementById("directory").addEventListener("click", () => {
      window.Electron.ipcRenderer.send('open-settings');
    })

    document.getElementById('masked-link').addEventListener('click', () => {
      window.Electron.ipcRenderer.send('open-link');
    });
  } else {
    console.error("Error initializing UI:", error);
  }
});