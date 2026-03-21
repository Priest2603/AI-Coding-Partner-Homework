import fs from 'fs';
import path from 'path';

/**
 * Base shared directory path
 */
const SHARED_DIR = path.join(process.cwd(), 'shared');

export const SHARED_PATHS = {
  base: SHARED_DIR,
  input: path.join(SHARED_DIR, 'input'),
  processing: path.join(SHARED_DIR, 'processing'),
  output: path.join(SHARED_DIR, 'output'),
  results: path.join(SHARED_DIR, 'results'),
};

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath Directory path to ensure
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Set up the complete shared directory structure
 * Creates: shared/{input,processing,output,results}
 */
export function setupSharedDirectories(): void {
  Object.values(SHARED_PATHS).forEach((dirPath) => {
    if (dirPath !== SHARED_PATHS.base) {
      ensureDir(dirPath);
    }
  });
}

/**
 * Write a JSON object to a file
 * @param filePath Path to write to
 * @param data Object to serialize
 */
export function writeJsonFile(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read a JSON file from disk
 * @param filePath Path to read from
 * @returns Parsed JSON object
 */
export function readJsonFile(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write a message to the input directory
 * @param transactionId Transaction ID (used as filename)
 * @param message Message object to write
 */
export function writeInputMessage(transactionId: string, message: any): void {
  const filePath = path.join(SHARED_PATHS.input, `${transactionId}.json`);
  writeJsonFile(filePath, message);
}

/**
 * Write a message to the output directory
 * @param transactionId Transaction ID (used as filename)
 * @param message Message object to write
 */
export function writeOutputMessage(transactionId: string, message: any): void {
  const filePath = path.join(SHARED_PATHS.output, `${transactionId}.json`);
  writeJsonFile(filePath, message);
}

/**
 * Write a result to the results directory
 * @param transactionId Transaction ID (used as filename)
 * @param result Result object to write
 */
export function writeResult(transactionId: string, result: any): void {
  const filePath = path.join(SHARED_PATHS.results, `${transactionId}.json`);
  writeJsonFile(filePath, result);
}

/**
 * Read a message from input directory
 * @param transactionId Transaction ID (used as filename)
 * @returns Message object
 */
export function readInputMessage(transactionId: string): any {
  const filePath = path.join(SHARED_PATHS.input, `${transactionId}.json`);
  return readJsonFile(filePath);
}

/**
 * Read a message from output directory
 * @param transactionId Transaction ID (used as filename)
 * @returns Message object
 */
export function readOutputMessage(transactionId: string): any {
  const filePath = path.join(SHARED_PATHS.output, `${transactionId}.json`);
  return readJsonFile(filePath);
}

/**
 * List all files in a directory
 * @param dirPath Directory to list
 * @returns Array of filenames
 */
export function listFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath);
}

/**
 * Clear all files in a directory
 * @param dirPath Directory to clear
 */
export function clearDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    fs.unlinkSync(filePath);
  });
}

/**
 * Clear the entire shared directory structure
 */
export function clearSharedDirectories(): void {
  Object.values(SHARED_PATHS).forEach((dirPath) => {
    if (dirPath !== SHARED_PATHS.base && fs.existsSync(dirPath)) {
      clearDirectory(dirPath);
    }
  });
}

/**
 * Move a message file from one directory to another
 * @param transactionId Transaction ID (filename without extension)
 * @param fromDir Source directory
 * @param toDir Destination directory
 */
export function moveMessage(transactionId: string, fromDir: string, toDir: string): void {
  const fromPath = path.join(fromDir, `${transactionId}.json`);
  const toPath = path.join(toDir, `${transactionId}.json`);
  ensureDir(toDir);
  fs.renameSync(fromPath, toPath);
}

/**
 * Move a message from input/ to processing/
 * Simulates an agent picking up a message to work on
 * @param transactionId Transaction ID
 */
export function moveToProcessing(transactionId: string): void {
  moveMessage(transactionId, SHARED_PATHS.input, SHARED_PATHS.processing);
}

/**
 * Move a message from output/ to processing/
 * Used when the next agent picks up the previous agent's output
 * @param transactionId Transaction ID
 */
export function moveOutputToProcessing(transactionId: string): void {
  moveMessage(transactionId, SHARED_PATHS.output, SHARED_PATHS.processing);
}

/**
 * Read a message from the processing directory
 * @param transactionId Transaction ID
 * @returns Parsed message object
 */
export function readProcessingMessage(transactionId: string): any {
  const filePath = path.join(SHARED_PATHS.processing, `${transactionId}.json`);
  return readJsonFile(filePath);
}

/**
 * Remove a message from the processing directory
 * Called after an agent finishes processing
 * @param transactionId Transaction ID
 */
export function removeFromProcessing(transactionId: string): void {
  const filePath = path.join(SHARED_PATHS.processing, `${transactionId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Check if a file exists
 * @param filePath Path to check
 * @returns true if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
