#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Ports used by the Mallory stack
const PORTS = [3001, 8787, 8402, 8765];

console.log('🧹 Cleaning up ports for Mallory stack...');

async function killProcessOnPort(port) {
  try {
    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(pid => pid);

    if (pids.length === 0) {
      console.log(`✅ Port ${port} is free`);
      return;
    }

    console.log(`🔍 Found ${pids.length} process(es) on port ${port}`);

    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`);
        console.log(`💀 Killed process ${pid} on port ${port}`);
      } catch (error) {
        // Process might have already died
        console.log(`⚠️  Process ${pid} on port ${port} already terminated or inaccessible`);
      }
    }

    // Verify port is now free
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
      if (checkStdout.trim()) {
        console.log(`⚠️  Port ${port} may still have processes running`);
      } else {
        console.log(`✅ Port ${port} is now free`);
      }
    } catch (error) {
      // No processes found, port is free
      console.log(`✅ Port ${port} is now free`);
    }

  } catch (error) {
    if (error.code === 1) {
      // No processes found on this port
      console.log(`✅ Port ${port} is free`);
    } else {
      console.error(`❌ Error checking port ${port}:`, error.message);
    }
  }
}

async function cleanAllPorts() {
  console.log(`Cleaning ports: ${PORTS.join(', ')}\n`);

  for (const port of PORTS) {
    await killProcessOnPort(port);
  }

  console.log('\n🎉 Port cleanup complete!');
  console.log('\nNext steps:');
  console.log('1. Run `npm run dev:stack` to start all services');
  console.log('2. Wait for all services to be healthy');
  console.log('3. Run `npm run dev` to start Mallory on port 3001');
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Port cleanup interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Port cleanup terminated');
  process.exit(0);
});

// Run the cleanup
cleanAllPorts().catch(error => {
  console.error('❌ Port cleanup failed:', error);
  process.exit(1);
});