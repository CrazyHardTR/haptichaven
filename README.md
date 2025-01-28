# HapticHaven

HapticHaven is an Electron-based application designed to elevate your Discord experience by integrating haptic feedback with your Discord interactions.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setting Up Your Discord Bot](#setting-up-your-discord-bot)
- [Installation](#installation)
  - [Via Windows Installer](#via-windows-installer)
  - [Via Repo Cloning](#via-repo-cloning)
- [Usage](#usage)
- [Development](#development)
  - [Scripts](#scripts)
  - [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Fair Warning](#fair-warning)

## Features

- **Bot Integration**: Connect your bot to Discord and control haptic devices based on Discord interactions.
- **Device Management**: Scan, connect, and manage haptic devices.
- **Customizable Settings**: Adjust vibration intensity, duration, and cooldown settings.
- **Secure Storage**: Securely store bot credentials using encryption.

## Prerequisites

Before you can set up and run the HapticHaven app, you'll need the following:

- A Discord account.
- Your Discord bot's credentials.
- A haptic device (supported devices can be found [here](https://iostindex.com/?filter0Availability=Available,DIY&filter1Connection=Digital&filter2ButtplugSupport=4)).
- The [Intiface Central](https://intiface.com/central/) app installed on either phone or PC.

## Setting Up Your Discord Bot

1. **Create a Discord Application:**
    - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    - Navigate to **Applications**.
    - Click on **New Application** and give it a name.
    - Click **Create**.

2. **Give the Bot the Correct Permissions:**
    - Navigate to the **Installation** page.
    - Check off **'User Install'** and select **'Guild Install'** instead.
    - Scroll down to **'Default Install Settings**.
    - Under the dropdown menu for scopes, include **bot**.
    - Under the dropdown menu for permissions, include **Connect** and **View Channels**.
    - Click **Save Changes**.

3. **Setup the OAuth2 Connection:**
    - Under **OAuth2** > **Redirects**, click **Add Redirect** and input:
      ```
      http://localhost:3000/callback
      ```
    - Click **Save Changes**.

4. **Retrieve the Client ID, Client Secret, and Token of Your Bot:**
    - On the **OAuth2** page, copy the **Client ID** and **Client Secret**.
    - Navigate to the **Bot** page and copy the **Token**.

5. **Set up the correct Privileged Gateway Intents:**
    - On the **Bot** page, scroll down to the **Privileged Gateway Intents** section.
    - Enable **Server Members Intent** and **Message Content Intent**.
    - Click **Save Changes**.

## Installation

### Via Windows Installer

1. [Download](https://github.com/CrazyHardTR/haptichaven/releases) & run the installer.
2. Follow the installation prompts to install the app.

### Via Repo Cloning

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/haptichaven.git
    cd haptichaven
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Start the application:
    ```sh
    npm start
    ```

## Usage

1. **Bot Setup**: 
    - Fill out the form with your Bot's **Client ID**, **Client Secret**, and **Token**.

2. **Discord Login**:
    - Allow the app in the firewall (needed for the OAuth2 authentication) and **login via Discord** to authorize your bot.

3. **Intiface Connect**:
    - Open the Intiface Connect App, start the server, and connect your devices.

4. **Connection Method**:
    - Once Intiface is running, adjust the connection method in the app's settings.
    - If using Intiface via PC, select **'Intiface on PC'**.
    - If using Intiface via phone, select **'Intiface on Mobile'** and insert the correct IP address of the Intiface server (shown on your phone).

5. **Connect to Intiface**:
    - Once Intiface is running and your connection method is correct, click on **'Connect'**.
    - The Intiface app will now be connected to your Intiface server.

6. **Select a Device**:
    - Select a device from the list and click on **'Start'**.
    - HapticHaven is now running and will control your devices when you receive a mention on Discord.

7. **Adjust Settings to Your Liking**:
    - You can adjust the settings to your liking, such as changing the intensity, duration, and cooldown.

## Development

### Scripts

- `npm start`: Start the Electron application.

### Project Structure

- [src](http://_vscodecontentref_/0): Contains the source code.
  - [authSuccess.html](http://_vscodecontentref_/1): Authorization success page.
  - [bot.html](http://_vscodecontentref_/2): Bot setup page.
  - [index.html](http://_vscodecontentref_/3): Dashboard page.
  - [login.html](http://_vscodecontentref_/4): Discord login page.
  - [main.js](http://_vscodecontentref_/5): Main Electron process.
  - [preload.js](http://_vscodecontentref_/6): Preload script for Electron.
  - [renderer.js](http://_vscodecontentref_/7): Renderer process script.
  - [utils.js](http://_vscodecontentref_/8): Utility functions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](https://mit-license.org/).

## Fair Warning

This app was created as a learning tool and is in *very early development stages*! 
Please be aware that it may not work as expected and may cause issues with your devices.

I, the creator of this app, do not take any responsibility for any sort of damages this app may cause to your devices or to yourself.
This application is provided as-is, and by using it, you automatically agree to these conditions. Use at your own risk.
For your own safety, it is suggested to try the app without wearing your devices first.