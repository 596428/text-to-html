const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// .env.local 파일 직접 읽기
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^(GEMINI_API_KEY[_0-9]*)=(.+)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const API_KEYS = [
  { name: 'GEMINI_API_KEY_1', key: env.GEMINI_API_KEY_1 },
  { name: 'GEMINI_API_KEY_2', key: env.GEMINI_API_KEY_2 },
  { name: 'GEMINI_API_KEY_3', key: env.GEMINI_API_KEY_3 },
  { name: 'GEMINI_API_KEY_4', key: env.GEMINI_API_KEY_4 },
  { name: 'GEMINI_API_KEY_5', key: env.GEMINI_API_KEY_5 },
  { name: 'GEMINI_API_KEY_6', key: env.GEMINI_API_KEY_6 },
  { name: 'GEMINI_API_KEY_7', key: env.GEMINI_API_KEY_7 },
  { name: 'GEMINI_API_KEY_8', key: env.GEMINI_API_KEY_8 },
  { name: 'GEMINI_API_KEY_9', key: env.GEMINI_API_KEY_9 },
  { name: 'GEMINI_API_KEY_10', key: env.GEMINI_API_KEY_10 }
];

async function checkKey(name, key, index) {
  if (!key) {
    console.log(`⚠️  ${name}: Not configured`);
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    console.log(`⏳ ${name}: Testing...`);
    const result = await model.generateContent('Test: Reply with just "OK"');
    const response = await result.response;
    const text = response.text();

    console.log(`✅ ${name}: Working (Response: "${text.trim()}")`);
    return true;
  } catch (error) {
    const errMsg = error.message || 'Unknown error';
    if (errMsg.includes('503')) {
      console.log(`⚠️  ${name}: Overloaded (503 - Model is overloaded)`);
    } else if (errMsg.includes('429')) {
      console.log(`⚠️  ${name}: Rate Limited (429 - Too many requests)`);
    } else if (errMsg.includes('400')) {
      console.log(`❌ ${name}: Invalid Key or Bad Request (400)`);
    } else if (errMsg.includes('404')) {
      console.log(`❌ ${name}: Model not found (404)`);
    } else {
      console.log(`❌ ${name}: Error - ${errMsg.slice(0, 100)}`);
    }
    return false;
  }
}

async function checkAllKeys() {
  console.log('🔍 Checking Gemini API Keys...\n');

  const results = [];
  for (let i = 0; i < API_KEYS.length; i++) {
    const { name, key } = API_KEYS[i];
    const result = await checkKey(name, key, i);
    results.push(result);
    console.log(''); // 빈 줄
  }

  const workingCount = results.filter(r => r).length;
  const totalCount = API_KEYS.filter(k => k.key).length;

  console.log(`📊 Summary: ${workingCount}/${totalCount} keys working`);

  if (workingCount === 0) {
    console.log('⚠️  All API keys are unavailable. Please wait or try again later.');
  }
}

checkAllKeys().catch(console.error);
