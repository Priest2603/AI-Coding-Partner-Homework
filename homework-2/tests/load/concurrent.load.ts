import autocannon from 'autocannon';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;
const HEALTH_CHECK_INTERVAL = 500; // ms
const HEALTH_CHECK_TIMEOUT = 30000; // 30s

// Parse CLI arguments
const args = process.argv.slice(2);
const durationArg = args.find(arg => arg.startsWith('--duration='));
const DURATION = durationArg ? parseInt(durationArg.split('=')[1]) : 10;

// Setup logging
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `load-test-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create log file stream
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

/**
 * Log to both console and file
 */
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(message);
  logStream.write(logMessage + '\n');
}

/**
 * Log error to both console and file
 */
function logError(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: ${message}`;
  console.error(message);
  logStream.write(logMessage + '\n');
}

interface LoadTestResult {
  name: string;
  connections: number;
  requests: number;
  duration: number;
  latency: {
    p50: number;
    p99: number;
    mean: number;
  };
  throughput: number;
  errors: number;
  passed: boolean;
}

/**
 * Kill server process and wait for it to exit
 */
async function killServer(server: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!server || server.killed) {
      resolve();
      return;
    }
    
    server.on('exit', () => {
      resolve();
    });
    
    server.kill('SIGTERM');
    
    // Force kill after 3 seconds if still running
    setTimeout(() => {
      if (server && !server.killed) {
        server.kill('SIGKILL');
      }
    }, 3000);
  });
}

/**
 * Wait for server to be ready by polling health check endpoint
 */
async function waitForServer(): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < HEALTH_CHECK_TIMEOUT) {
    try {
      await new Promise<void>((resolve, reject) => {
        http.get(`${BASE_URL}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Health check returned status ${res.statusCode}`));
          }
        }).on('error', reject);
      });
      
      log('✅ Server is ready');
      return;
    } catch (error) {
      // Server not ready yet, wait and retry
      await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
    }
  }
  
  throw new Error(`Server failed to start within ${HEALTH_CHECK_TIMEOUT}ms`);
}

/**
 * Start the Express server on a separate port for load testing
 */
function startServer(): ChildProcess {
  log(`🚀 Starting server on port ${PORT}...`);
  
  const server = spawn('ts-node', ['src/index.ts'], {
    env: { 
      ...process.env, 
      PORT: PORT.toString(),
      NODE_ENV: 'test' // Disable Winston file logging
    },
    stdio: ['ignore', 'ignore', 'ignore'] // Don't log server output to reduce log file size
  });
  
  return server;
}

/**
 * Run autocannon load test
 */
async function runLoadTest(
  name: string,
  connections: number,
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any
): Promise<LoadTestResult> {
  log(`\n${'='.repeat(60)}`);
  log(`📊 ${name}`);
  log(`   Connections: ${connections} | Duration: ${DURATION}s | Method: ${method}`);
  log(`${'='.repeat(60)}\n`);
  
  const config: autocannon.Options = {
    url: `${BASE_URL}${endpoint}`,
    connections,
    duration: DURATION,
    method,
  };
  
  if (method === 'POST' && body) {
    config.headers = {
      'Content-Type': 'application/json'
    };
    config.body = JSON.stringify(body);
  }
  
  const result = await autocannon(config);
  
  const testResult: LoadTestResult = {
    name,
    connections,
    requests: result.requests.total,
    duration: result.duration,
    latency: {
      p50: result.latency.p50,
      p99: result.latency.p99,
      mean: result.latency.mean
    },
    throughput: result.throughput.mean,
    errors: result.errors,
    passed: true
  };
  
  // Print results
  log(`\n📈 Results:`);
  log(`   Requests:     ${result.requests.total} (${result.requests.average}/sec)`);
  log(`   Throughput:   ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/sec`);
  log(`   Latency (ms):`);
  log(`     - Mean:     ${result.latency.mean.toFixed(2)}`);
  log(`     - p50:      ${result.latency.p50.toFixed(2)}`);
  log(`     - p99:      ${result.latency.p99.toFixed(2)}`);
  log(`   Errors:       ${result.errors}`);
  
  return testResult;
}

/**
 * Validate test results against thresholds
 */
function validateResults(results: LoadTestResult[]): boolean {
  log(`\n${'='.repeat(60)}`);
  log(`📋 VALIDATION RESULTS`);
  log(`${'='.repeat(60)}\n`);
  
  let allPassed = true;
  
  for (const result of results) {
    const errors: string[] = [];
    
    // Check for errors
    if (result.errors > 0) {
      errors.push(`${result.errors} request errors`);
    }
    
    // Check latency thresholds
    if (result.connections <= 20 && result.latency.p99 > 200) {
      errors.push(`p99 latency ${result.latency.p99.toFixed(2)}ms exceeds 200ms threshold`);
    } else if (result.connections === 100 && result.latency.p99 > 500) {
      errors.push(`p99 latency ${result.latency.p99.toFixed(2)}ms exceeds 500ms threshold`);
    }
    
    const passed = errors.length === 0;
    result.passed = passed;
    allPassed = allPassed && passed;
    
    const icon = passed ? '✅' : '❌';
    log(`${icon} ${result.name}`);
    
    if (!passed) {
      errors.forEach(error => {
        log(`   ⚠️  ${error}`);
      });
    } else {
      log(`   p99: ${result.latency.p99.toFixed(2)}ms | Errors: ${result.errors}`);
    }
  }
  
  log(`\n${'='.repeat(60)}`);
  if (allPassed) {
    log(`✅ All load tests PASSED`);
  } else {
    log(`❌ Some load tests FAILED`);
  }
  log(`${'='.repeat(60)}\n`);
  log(`\n📄 Full log saved to: ${LOG_FILE}\n`);
  
  return allPassed;
}

/**
 * Main load test execution
 */
async function main() {
  let server: ChildProcess | null = null;
  const results: LoadTestResult[] = [];
  
  try {
    // Start server
    server = startServer();
    
    // Wait for server to be ready
    await waitForServer();
    
    // Sample ticket data for POST requests
    const sampleTicket = {
      customer_id: 'CUST001',
      customer_email: 'loadtest@example.com',
      customer_name: 'Load Test User',
      subject: 'Load test ticket',
      description: 'This is a load test ticket with sufficient length for validation.',
      category: 'technical_issue',
      priority: 'medium',
      status: 'new',
      tags: ['load-test'],
      metadata: {
        source: 'api',
        browser: 'autocannon',
        device_type: 'desktop'
      }
    };
    
    // Test 1: GET /tickets with 20 concurrent connections (p99 < 200ms)
    results.push(await runLoadTest(
      'GET /tickets - 20 concurrent connections',
      20,
      'GET',
      '/tickets'
    ));
    
    // Test 2: POST /tickets with 20 concurrent connections (p99 < 200ms)
    results.push(await runLoadTest(
      'POST /tickets - 20 concurrent connections',
      20,
      'POST',
      '/tickets',
      sampleTicket
    ));
    
    // Validate all results
    const allPassed = validateResults(results);
    
    // Cleanup: kill server process
    if (server) {
      log('\n🛑 Shutting down server...');
      await killServer(server);
      log('✅ Server stopped');
    }
    
    // Close log stream and wait for it to finish
    await new Promise<void>((resolve) => {
      logStream.end(() => {
        resolve();
      });
    });
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    logError(`❌ Load test failed: ${error}`);
    
    // Cleanup server
    if (server) {
      log('\n🛑 Shutting down server due to error...');
      await killServer(server);
    }
    
    // Close log stream
    await new Promise<void>((resolve) => {
      logStream.end(() => resolve());
    });
    
    process.exit(1);
  }
}

// Run load tests
main();
