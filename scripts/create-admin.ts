#!/usr/bin/env tsx

/**
 * Script to create a local admin user for DocFlow
 * Usage: npx tsx scripts/create-admin.ts
 */

import { LocalAdminService } from '../src/lib/auth/local-admin';
import { DocFlowAuth } from '../src/lib/auth/docflow-auth';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to get user input
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to get password input (hidden)
function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    
    const onData = (char: string) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log(''); // New line
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    };
    
    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log('🔧 DocFlow Local Admin Creation Tool');
  console.log('=====================================\n');

  try {
    // Initialize DocFlow roles and permissions first
    console.log('🔄 Initializing DocFlow roles and permissions...');
    await DocFlowAuth.initializeDocFlowRoles();
    console.log('✅ DocFlow roles and permissions initialized\n');

    // Get admin details from user
    console.log('📝 Please provide the local admin details:\n');
    
    const username = await askQuestion('Username: ');
    if (!username) {
      console.error('❌ Username is required');
      process.exit(1);
    }

    const email = await askQuestion('Email: ');
    if (!email) {
      console.error('❌ Email is required');
      process.exit(1);
    }

    const firstName = await askQuestion('First Name: ');
    if (!firstName) {
      console.error('❌ First Name is required');
      process.exit(1);
    }

    const lastName = await askQuestion('Last Name: ');
    if (!lastName) {
      console.error('❌ Last Name is required');
      process.exit(1);
    }

    const password = await askPassword('Password: ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    const confirmPassword = await askPassword('Confirm Password: ');
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    // Create the local admin user
    console.log('\n🔄 Creating local admin user...');
    
    const newAdmin = await LocalAdminService.createLocalAdmin({
      username,
      email,
      firstName,
      lastName,
      password
    });

    if (newAdmin) {
      console.log('\n✅ Local admin user created successfully!');
      console.log('==========================================');
      console.log(`👤 Username: ${newAdmin.username}`);
      console.log(`📧 Email: ${newAdmin.email}`);
      console.log(`🏷️  Name: ${newAdmin.firstName} ${newAdmin.lastName}`);
      console.log(`🔑 Roles: ${newAdmin.roles.join(', ')}`);
      console.log(`⚡ Permissions: ${newAdmin.permissions.length} permissions assigned`);
      console.log('\n🎉 You can now login with these credentials!');
      process.exit(0);
    } else {
      console.error('❌ Failed to create local admin user');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error creating local admin:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});