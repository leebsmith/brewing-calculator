// vite.config.js
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
// Import the layout configuration. Note: This path is relative to vite.config.js itself.
// CORRECTED PATH: pointing to frontend/src/config/layout.js
import { layoutConfig } from './frontend/src/config/layout.js';

const pluginName = 'vite-plugin-html-partials-injector';
console.log(`[${pluginName}] vite.config.js is being loaded.`);

export default defineConfig(({ command, mode }) => {
  console.log(`[${pluginName}] vite.config.js is being processed. Command: ${command}, Mode: ${mode}`);

  return {
    // --- Add this 'root' option --- 
    // This tells Vite that the project root for source files (like index.html, src/) is the 'frontend' directory,
    // while the config file itself is at the project root.
    root: './frontend',
    // --- End of addition ---

    plugins: [
      {
        name: pluginName,
        // This hook runs after Vite has resolved its config, useful for debugging setup.
        configResolved(resolvedConfig) {
          console.log(`[${pluginName}] configResolved hook called. Resolved config mode: ${resolvedConfig.mode}`);
        },

        transformIndexHtml(html) {
          console.log(`[${pluginName}] transformIndexHtml hook called.`);
          console.log(`[${pluginName}] HTML content received by plugin (first 1000 chars):\n${html.substring(0, 1000)}...`);

          let assembledHtml = html;
          // __dirname here refers to the directory of vite.config.js, which is the project root.
          const baseDir = __dirname;
          console.log(`[${pluginName}] Base directory for resolving paths: ${baseDir}`);
          // Path to layout.js is now correctly resolved relative to project root
          console.log(`[${pluginName}] Reading layout configuration from: ${path.resolve(baseDir, './frontend/src/config/layout.js')}`);
          console.log(`[${pluginName}] Layout config:`, JSON.stringify(layoutConfig, null, 2));

          const partialsContent = {};
          for (const configItem of layoutConfig) {
            try {
              const partialFilePath = path.resolve(baseDir, configItem.path);
              console.log(`[${pluginName}] Attempting to read partial: ${configItem.path} at ${partialFilePath}`);
              const content = fs.readFileSync(partialFilePath, 'utf-8');
              partialsContent[configItem.name] = content;
              console.log(`[${pluginName}] Successfully read partial: ${configItem.name} (content length: ${content.length})`);
            } catch (error) {
              console.error(`[${pluginName}] Error reading partial file ${configItem.path}:`, error);
              partialsContent[configItem.name] = `<!-- PARTIAL LOAD ERROR: Failed to load ${configItem.path} -->`;
            }
          }

          console.log(`[${pluginName}] Partial contents collected:`, Object.keys(partialsContent).map(key => `${key}: ${partialsContent[key].length} chars`));

          let tagsReplacedCount = 0;
          for (const configItem of layoutConfig) {
            const injectionTag = `<!-- @inject:[${configItem.name}] -->`;
            const partialContent = partialsContent[configItem.name] || '';

            const originalHtml = assembledHtml;
            // Using split/join for string replacement
            const newHtml = assembledHtml.split(injectionTag).join(partialContent);

            if (originalHtml.length !== newHtml.length) {
              tagsReplacedCount++;
              console.log(`[${pluginName}] Replaced tag: ${injectionTag}`);
            } else {
              console.warn(`[${pluginName}] Injection tag NOT FOUND or NOT REPLACED: ${injectionTag}. Please check index.html for exact tag format.`);
            }
            assembledHtml = newHtml;
          }

          if (tagsReplacedCount > 0) {
            console.log(`[${pluginName}] Successfully replaced ${tagsReplacedCount} injection tag(s).`);
          } else {
            console.warn(`[${pluginName}] No injection tags were replaced. Final HTML content returned to Vite.`);
          }

          console.log(`[${pluginName}] transformIndexHtml finished. Final HTML snippet (first 500 chars):\n${assembledHtml.substring(0, 500)}...`);
          return assembledHtml;
        },
      },
    ],
  };
});