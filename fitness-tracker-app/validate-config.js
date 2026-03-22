const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Google OAuth Configuration...\n');

// Read .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

// Parse .env file
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Required variables
const required = [
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

let hasErrors = false;

console.log('📋 Checking required environment variables:\n');

required.forEach(varName => {
  const value = envVars[varName];
  const exists = value && value.length > 0;
  const isPlaceholder = value && (
    value.includes('YOUR_') ||
    value.includes('your-') ||
    value.includes('XXXXXX') ||
    value.includes('<')
  );

  if (!exists) {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  } else if (isPlaceholder) {
    console.log(`⚠️  ${varName}: PLACEHOLDER (needs to be updated)`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: OK`);
  }
});

console.log('\n📋 Validating values:\n');

// Validate project ID
const projectId = envVars['EXPO_PUBLIC_FIREBASE_PROJECT_ID'];
if (projectId && projectId !== 'fitness-tracker-app-485014') {
  console.log(`⚠️  Project ID should be: fitness-tracker-app-485014`);
  console.log(`   Current value: ${projectId}`);
  hasErrors = true;
} else if (projectId) {
  console.log(`✅ Project ID: ${projectId}`);
}

// Validate Client IDs format
const webClientId = envVars['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
const androidClientId = envVars['EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'];

if (webClientId && !webClientId.endsWith('.apps.googleusercontent.com')) {
  console.log(`❌ Web Client ID format invalid (should end with .apps.googleusercontent.com)`);
  hasErrors = true;
} else if (webClientId) {
  console.log(`✅ Web Client ID format: OK`);
}

if (androidClientId && !androidClientId.endsWith('.apps.googleusercontent.com')) {
  console.log(`❌ Android Client ID format invalid (should end with .apps.googleusercontent.com)`);
  hasErrors = true;
} else if (androidClientId) {
  console.log(`✅ Android Client ID format: OK`);
}

// Check google-services.json
console.log('\n📋 Checking google-services.json:\n');

const googleServicesPath = path.join(__dirname, 'google-services.json');
if (!fs.existsSync(googleServicesPath)) {
  console.log('❌ google-services.json not found!');
  hasErrors = true;
} else {
  try {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf-8'));
    const gsProjectId = googleServices.project_info?.project_id;
    const gsProjectNumber = googleServices.project_info?.project_number;
    const gsPackageName = googleServices.client?.[0]?.client_info?.android_client_info?.package_name;

    console.log(`✅ google-services.json found`);
    console.log(`   Project ID: ${gsProjectId}`);
    console.log(`   Project Number: ${gsProjectNumber}`);
    console.log(`   Package Name: ${gsPackageName}`);

    // Validate consistency
    if (gsProjectId !== 'fitness-tracker-app-485014') {
      console.log(`\n⚠️  google-services.json project ID doesn't match expected: fitness-tracker-app-485014`);
      hasErrors = true;
    }

    if (gsPackageName !== 'com.fittracker.app') {
      console.log(`\n⚠️  google-services.json package name doesn't match: com.fittracker.app`);
      hasErrors = true;
    }

    // Check if .env values match google-services.json
    const envProjectNumber = envVars['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'];
    if (envProjectNumber && envProjectNumber !== gsProjectNumber) {
      console.log(`\n⚠️  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID doesn't match google-services.json`);
      console.log(`   .env value: ${envProjectNumber}`);
      console.log(`   google-services.json value: ${gsProjectNumber}`);
      hasErrors = true;
    }

  } catch (error) {
    console.log(`❌ Error reading google-services.json: ${error.message}`);
    hasErrors = true;
  }
}

// Final summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Configuration has errors! Please fix the issues above.');
  console.log('\n📖 See SETUP_GOOGLE_OAUTH.md for detailed instructions.');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Your configuration looks good.');
  console.log('\n🚀 You can now run: npx expo start -c');
  process.exit(0);
}
