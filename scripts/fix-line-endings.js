#!/usr/bin/env node

/**
 * Script to normalize line endings to LF in the entire project
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Extensions to process
const textExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.scss', '.md',
    '.rs', '.toml', '.py', '.sh', '.bat', '.ps1', '.yml', '.yaml', '.txt'
];

// Directories to skip
const skipDirs = [
    'node_modules', 'target', 'dist', '.git', 'build_temp', 'python_venv'
];

// Count stats
let processed = 0;
let changed = 0;
let errors = 0;

function normalizeLineEndings(filePath) {
    try {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');

        // Replace CRLF with LF
        const normalizedContent = content.replace(/\r\n/g, '\n');

        // Write back only if changes are needed
        if (content !== normalizedContent) {
            fs.writeFileSync(filePath, normalizedContent, 'utf8');
            console.log(`✓ Normalized: ${filePath}`);
            changed++;
        }

        processed++;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}: ${error.message}`);
        errors++;
    }
}

function processDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
                // Skip specified directories
                if (skipDirs.includes(item)) {
                    continue;
                }

                processDirectory(itemPath);
            } else if (stats.isFile()) {
                const ext = path.extname(itemPath).toLowerCase();
                if (textExtensions.includes(ext)) {
                    normalizeLineEndings(itemPath);
                }
            }
        }
    } catch (error) {
        console.error(`✗ Error reading directory ${dirPath}: ${error.message}`);
        errors++;
    }
}

console.log('Starting line ending normalization to LF...');
processDirectory(rootDir);
console.log('Completed!');
console.log(`Files processed: ${processed}`);
console.log(`Files changed: ${changed}`);
console.log(`Errors: ${errors}`);

if (errors > 0) {
    process.exit(1);
} 