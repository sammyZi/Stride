const fs = require('fs');
const path = require('path');

console.log('🔍 Validating App Configuration...\n');

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
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
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

// Check google-services.json
console.log('\n📋 Checking google-services.json:\n');

const googleServicesPath = path.join(__dirname, 'google-services.json');
if (!fs.existsSync(googleServicesPath)) {
  console.log('⚠️  google-services.json not found (needed for Firebase features)');
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

    // Validate package name matches app.json
    if (gsPackageName !== 'com.fittracker.app') {
      console.log(`\n⚠️  google-services.json package name doesn't match: com.fittracker.app`);
      hasErrors = true;
    }

  } catch (error) {
    console.log(`❌ Error reading google-services.json: ${error.message}`);
    hasErrors = true;
  }
}

// Check app.json
console.log('\n📋 Checking app.json:\n');

const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    const expo = appJson.expo;

    console.log(`✅ App name: ${expo.name}`);
    console.log(`   Version: ${expo.version}`);
    console.log(`   Package: ${expo.android?.package}`);
    console.log(`   Bundle ID: ${expo.ios?.bundleIdentifier}`);

    // Check Google Maps API key in config
    const mapsApiKey = expo.android?.config?.googleMaps?.apiKey;
    if (!mapsApiKey) {
      console.log(`\n⚠️  Google Maps API key not found in app.json android.config.googleMaps`);
    } else {
      console.log(`✅ Google Maps API key configured in app.json`);
    }

    // Check assets exist
    const assetsToCheck = ['icon', 'splash.image'];
    assetsToCheck.forEach(assetPath => {
      const value = assetPath.includes('.') 
        ? assetPath.split('.').reduce((obj, key) => obj?.[key], expo)
        : expo[assetPath];
      if (value && fs.existsSync(path.join(__dirname, value))) {
        console.log(`✅ Asset exists: ${value}`);
      } else if (value) {
        console.log(`❌ Asset missing: ${value}`);
        hasErrors = true;
      }
    });

  } catch (error) {
    console.log(`❌ Error reading app.json: ${error.message}`);
    hasErrors = true;
  }
}

// Final summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Configuration has errors! Please fix the issues above.');
  process.exit(1);
} else {
  console.log('✅ All checks passed! Your configuration looks good.');
  console.log('\n🚀 You can now run: npx expo start -c');
  process.exit(0);
}
