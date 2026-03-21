process.env.NODE_ENV = 'test';

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ensureDir,
  writeJsonFile,
  readJsonFile,
  writeInputMessage,
  writeOutputMessage,
  writeResult,
  readInputMessage,
  readOutputMessage,
  readProcessingMessage,
  removeFromProcessing,
  listFiles,
  clearDirectory,
  clearSharedDirectories,
  setupSharedDirectories,
  moveMessage,
  moveToProcessing,
  moveOutputToProcessing,
  fileExists,
  SHARED_PATHS,
} from '../../src/utils/file-io';

describe('file-io utilities', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-fileio-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('ensureDir', () => {
    it('should create a directory that does not exist', () => {
      const newDir = path.join(tmpDir, 'subdir');
      expect(fs.existsSync(newDir)).toBe(false);
      ensureDir(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      ensureDir(tmpDir);
      expect(fs.existsSync(tmpDir)).toBe(true);
    });

    it('should create nested directories', () => {
      const nested = path.join(tmpDir, 'a', 'b', 'c');
      ensureDir(nested);
      expect(fs.existsSync(nested)).toBe(true);
    });
  });

  describe('writeJsonFile / readJsonFile', () => {
    it('should write and read JSON objects', () => {
      const filePath = path.join(tmpDir, 'test.json');
      const data = { key: 'value', num: 42, nested: { a: 1 } };
      writeJsonFile(filePath, data);
      const result = readJsonFile(filePath);
      expect(result).toEqual(data);
    });

    it('should write pretty-printed JSON', () => {
      const filePath = path.join(tmpDir, 'test.json');
      writeJsonFile(filePath, { a: 1 });
      const raw = fs.readFileSync(filePath, 'utf-8');
      expect(raw).toContain('\n');
    });

    it('should throw when reading non-existent file', () => {
      expect(() => readJsonFile(path.join(tmpDir, 'nonexistent.json'))).toThrow();
    });
  });

  describe('writeInputMessage / readInputMessage', () => {
    it('should write and read from input directory', () => {
      // Use the real SHARED_PATHS.input
      ensureDir(SHARED_PATHS.input);
      const msg = { id: 'test', data: 'hello' };
      writeInputMessage('TEST001', msg);
      const result = readInputMessage('TEST001');
      expect(result).toEqual(msg);
      // Cleanup
      fs.unlinkSync(path.join(SHARED_PATHS.input, 'TEST001.json'));
    });
  });

  describe('writeOutputMessage / readOutputMessage', () => {
    it('should write and read from output directory', () => {
      ensureDir(SHARED_PATHS.output);
      const msg = { id: 'test', data: 'world' };
      writeOutputMessage('TEST002', msg);
      const result = readOutputMessage('TEST002');
      expect(result).toEqual(msg);
      // Cleanup
      fs.unlinkSync(path.join(SHARED_PATHS.output, 'TEST002.json'));
    });
  });

  describe('writeResult', () => {
    it('should write to results directory', () => {
      ensureDir(SHARED_PATHS.results);
      const result = { status: 'settled' };
      writeResult('TEST003', result);
      const filePath = path.join(SHARED_PATHS.results, 'TEST003.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(data).toEqual(result);
      // Cleanup
      fs.unlinkSync(filePath);
    });
  });

  describe('readProcessingMessage', () => {
    it('should read from processing directory', () => {
      ensureDir(SHARED_PATHS.processing);
      const msg = { id: 'proc' };
      writeJsonFile(path.join(SHARED_PATHS.processing, 'TEST004.json'), msg);
      const result = readProcessingMessage('TEST004');
      expect(result).toEqual(msg);
      // Cleanup
      fs.unlinkSync(path.join(SHARED_PATHS.processing, 'TEST004.json'));
    });
  });

  describe('removeFromProcessing', () => {
    it('should remove file from processing directory', () => {
      ensureDir(SHARED_PATHS.processing);
      const filePath = path.join(SHARED_PATHS.processing, 'TEST005.json');
      writeJsonFile(filePath, { id: 'del' });
      expect(fs.existsSync(filePath)).toBe(true);
      removeFromProcessing('TEST005');
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw if file does not exist', () => {
      expect(() => removeFromProcessing('NONEXISTENT')).not.toThrow();
    });
  });

  describe('listFiles', () => {
    it('should list files in a directory', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'b.json'), '{}');
      const files = listFiles(tmpDir);
      expect(files).toHaveLength(2);
      expect(files).toContain('a.json');
      expect(files).toContain('b.json');
    });

    it('should return empty array for non-existent directory', () => {
      const files = listFiles(path.join(tmpDir, 'nonexistent'));
      expect(files).toEqual([]);
    });

    it('should return empty array for empty directory', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir);
      expect(listFiles(emptyDir)).toEqual([]);
    });
  });

  describe('clearDirectory', () => {
    it('should remove all files from directory', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.json'), '{}');
      fs.writeFileSync(path.join(tmpDir, 'b.json'), '{}');
      clearDirectory(tmpDir);
      expect(listFiles(tmpDir)).toEqual([]);
    });

    it('should not throw for non-existent directory', () => {
      expect(() => clearDirectory(path.join(tmpDir, 'nonexistent'))).not.toThrow();
    });

    it('should not throw for empty directory', () => {
      const emptyDir = path.join(tmpDir, 'empty');
      fs.mkdirSync(emptyDir);
      expect(() => clearDirectory(emptyDir)).not.toThrow();
    });
  });

  describe('setupSharedDirectories', () => {
    it('should create all shared subdirectories', () => {
      setupSharedDirectories();
      expect(fs.existsSync(SHARED_PATHS.input)).toBe(true);
      expect(fs.existsSync(SHARED_PATHS.processing)).toBe(true);
      expect(fs.existsSync(SHARED_PATHS.output)).toBe(true);
      expect(fs.existsSync(SHARED_PATHS.results)).toBe(true);
    });
  });

  describe('clearSharedDirectories', () => {
    it('should clear files from all shared subdirectories', () => {
      setupSharedDirectories();
      // Write files to each subdirectory
      writeJsonFile(path.join(SHARED_PATHS.input, 'test.json'), {});
      writeJsonFile(path.join(SHARED_PATHS.output, 'test.json'), {});
      writeJsonFile(path.join(SHARED_PATHS.results, 'test.json'), {});

      clearSharedDirectories();

      expect(listFiles(SHARED_PATHS.input)).toEqual([]);
      expect(listFiles(SHARED_PATHS.output)).toEqual([]);
      expect(listFiles(SHARED_PATHS.results)).toEqual([]);
    });
  });

  describe('moveMessage', () => {
    it('should move a file from one directory to another', () => {
      const fromDir = path.join(tmpDir, 'from');
      const toDir = path.join(tmpDir, 'to');
      fs.mkdirSync(fromDir);
      fs.mkdirSync(toDir);

      const data = { id: 'TXN001' };
      writeJsonFile(path.join(fromDir, 'TXN001.json'), data);

      moveMessage('TXN001', fromDir, toDir);

      expect(fs.existsSync(path.join(fromDir, 'TXN001.json'))).toBe(false);
      expect(fs.existsSync(path.join(toDir, 'TXN001.json'))).toBe(true);
      expect(readJsonFile(path.join(toDir, 'TXN001.json'))).toEqual(data);
    });

    it('should create destination directory if it does not exist', () => {
      const fromDir = path.join(tmpDir, 'from');
      const toDir = path.join(tmpDir, 'new-dest');
      fs.mkdirSync(fromDir);

      writeJsonFile(path.join(fromDir, 'TXN001.json'), { id: 'TXN001' });
      moveMessage('TXN001', fromDir, toDir);
      expect(fs.existsSync(path.join(toDir, 'TXN001.json'))).toBe(true);
    });
  });

  describe('moveToProcessing', () => {
    it('should move file from input to processing', () => {
      setupSharedDirectories();
      writeJsonFile(path.join(SHARED_PATHS.input, 'TXNMOVE.json'), { id: 'move' });
      moveToProcessing('TXNMOVE');
      expect(fs.existsSync(path.join(SHARED_PATHS.processing, 'TXNMOVE.json'))).toBe(true);
      expect(fs.existsSync(path.join(SHARED_PATHS.input, 'TXNMOVE.json'))).toBe(false);
      // Cleanup
      fs.unlinkSync(path.join(SHARED_PATHS.processing, 'TXNMOVE.json'));
    });
  });

  describe('moveOutputToProcessing', () => {
    it('should move file from output to processing', () => {
      setupSharedDirectories();
      writeJsonFile(path.join(SHARED_PATHS.output, 'TXNMOVE2.json'), { id: 'move2' });
      moveOutputToProcessing('TXNMOVE2');
      expect(fs.existsSync(path.join(SHARED_PATHS.processing, 'TXNMOVE2.json'))).toBe(true);
      expect(fs.existsSync(path.join(SHARED_PATHS.output, 'TXNMOVE2.json'))).toBe(false);
      // Cleanup
      fs.unlinkSync(path.join(SHARED_PATHS.processing, 'TXNMOVE2.json'));
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = path.join(tmpDir, 'exists.json');
      fs.writeFileSync(filePath, '{}');
      expect(fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExists(path.join(tmpDir, 'nope.json'))).toBe(false);
    });
  });
});
