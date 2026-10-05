// vite.config.js
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { layoutConfig } from './frontend/src/config/layout.js';

const pluginName = 'vite-plugin-html-partials-injector';

export default defineConfig(({ command, mode }) => {
  return {
    root: './frontend',

    plugins: [
      {
        name: pluginName,
        transformIndexHtml(html) {
          let assembledHtml = html;
          const baseDir = __dirname;
          const partialsContent = {};

          for (const configItem of layoutConfig) {
            try {
              const partialFilePath = path.resolve(baseDir, configItem.path);
              partialsContent[configItem.name] = fs.readFileSync(partialFilePath, 'utf-8');
            } catch (error) {
              console.error(`[${pluginName}] Error reading partial file ${configItem.path}:`, error);
              partialsContent[configItem.name] = `<!-- PARTIAL LOAD ERROR: Failed to load ${configItem.path} -->`;
            }
          }

          for (const configItem of layoutConfig) {
            const injectionTag = `<!-- @inject:[${configItem.name}] -->`;
            const partialContent = partialsContent[configItem.name] || '';
            assembledHtml = assembledHtml.split(injectionTag).join(partialContent);
          }

          return assembledHtml;
        },
      },
    ],
  };
});