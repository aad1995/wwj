'use strict';

const path = require('path');
const fs = require('fs');
const BaseAuthStrategy = require('./BaseAuthStrategy');

/**
 * Local directory-based authentication
 * @param {object} options - options
 * @param {string} options.clientId - Client id to distinguish instances if you are using multiple, otherwise keep null if you are using only one instance
 * @param {string} options.dataPath - Change the default path for saving session files, default is: "./.wwebjs_auth/" 
*/
class LocalAuth extends BaseAuthStrategy {
    constructor({ clientId, dataPath }={}) {
        super();

        const idRegex = /^[-_\w]+$/i;
        if(clientId && !idRegex.test(clientId)) {
            throw new Error('Invalid clientId. Only alphanumeric characters, underscores and hyphens are allowed.');
        }

        this.dataPath = path.resolve(dataPath || './.wwebjs_auth/');
        this.clientId = clientId;
    }

    async beforeBrowserInitialized() {
        const puppeteerOpts = this.client.options.puppeteer;
        const sessionDirName = this.clientId ? `session-${this.clientId}` : 'session';
        const dirPath = path.join(this.dataPath, sessionDirName);

        if(puppeteerOpts.userDataDir && puppeteerOpts.userDataDir !== dirPath) {
            throw new Error('LocalAuth is not compatible with a user-supplied userDataDir.');
        }

        fs.mkdirSync(dirPath, { recursive: true });
        
        this.client.options.puppeteer = {
            ...puppeteerOpts,
            userDataDir: dirPath
        };

        this.userDataDir = dirPath;
    }

    async logout() {
    try {
        if (!this.userDataDir) {
            throw new Error('No user data directory specified.');
        }

        const dirExists = await fs.promises.access(this.userDataDir)
            .then(() => true)
            .catch(() => false);

        if (dirExists) {
            const dirContents = await fs.promises.readdir(this.userDataDir);

            if (dirContents.length > 0) {
                console.log('Directory ${this.userDataDir} is not empty. Deleting contents...');

                // Delete all files and subdirectories inside userDataDir
                await Promise.all(dirContents.map(file => fs.promises.rm(path.join(this.userDataDir, file), { recursive: true, force: true })));
            }

            // Now remove the userDataDir itself
            await fs.promises.rm(this.userDataDir, { recursive: true, force: true });
            console.log('Directory ${this.userDataDir} has been removed');
        } else {
            console.warn('Directory ${this.userDataDir} does not exist.');
        }
    } catch (e) {
        console.error('Failed to remove directory ${this.userDataDir}:', e);
        throw new Error(e);
    }
}

}

module.exports = LocalAuth;
