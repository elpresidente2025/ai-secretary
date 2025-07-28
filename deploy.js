// deploy.js - AI비서관 Firebase 전용 배포 스크립트
const { execSync } = require('child_process');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  console.log(`🔧 실행: ${command}`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
  } catch (error) {
    console.error(`❌ 명령어 실패: ${command}`);
    throw error;
  }
}

async function deploy() {
  const mode = process.argv[2] || 'hosting-only';
  
  console.log('🚀 AI비서관 Firebase 배포 시작...');
  console.log(`📋 배포 모드: ${mode}`);
  
  try {
    // 1. 프론트엔드 빌드
    console.log('\n📦 프론트엔드 빌드 중...');
    runCommand('npm run build', './frontend');
    
    // 2. 배포 방식 선택
    if (mode === 'hosting-only') {
      // 프론트엔드만 배포
      console.log('\n🌐 Firebase Hosting 배포 중...');
      runCommand('firebase deploy --only hosting');
      
      console.log('\n💡 백엔드 정보:');
      console.log('   ✅ Firebase Functions 사용 중');
      console.log('   ✅ 백엔드는 이미 클라우드에서 실행됨');
      console.log('   📡 Functions 업데이트: npm run deploy:functions');
      
    } else if (mode === 'full') {
      // 전체 배포 (Functions + Hosting)
      console.log('\n☁️ Firebase 전체 배포 중...');
      runCommand('firebase deploy');
      
    } else if (mode === 'functions-only') {
      // Functions만 배포
      console.log('\n⚡ Firebase Functions 배포 중...');
      runCommand('firebase deploy --only functions');
      
    } else if (mode === 'both') {
      // Functions와 Hosting 순차 배포
      console.log('\n⚡ Firebase Functions 배포 중...');
      runCommand('firebase deploy --only functions');
      
      console.log('\n🌐 Firebase Hosting 배포 중...');
      runCommand('firebase deploy --only hosting');
    }
    
    console.log('\n✅ 배포 완료!');
    console.log('\n🔗 확인 링크:');
    console.log('   🌐 웹사이트: https://ai-secretary-6e9c8.web.app');
    console.log('   ⚡ Functions: Firebase Console에서 확인');
    console.log('   📊 Firebase 콘솔: https://console.firebase.google.com/project/ai-secretary-6e9c8');
    
  } catch (error) {
    console.error('\n❌ 배포 실패:', error.message);
    process.exit(1);
  }
}

// 사용법 출력
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 AI비서관 Firebase 배포 스크립트

사용법:
  node deploy.js [모드]

모드:
  hosting-only   - 프론트엔드만 Firebase에 배포 (기본값)
  functions-only - Firebase Functions만 배포
  full          - 프론트엔드 + Functions 모두 배포
  both          - Functions 먼저, 그 다음 Hosting 순차 배포

예시:
  node deploy.js                 # 호스팅만 배포
  node deploy.js hosting-only    # 호스팅만 배포  
  node deploy.js functions-only  # Functions만 배포
  node deploy.js full           # 전체 배포
  node deploy.js both           # 순차 배포
  node deploy.js --help         # 도움말

Firebase 서비스:
  ✅ Firebase Auth (인증)
  ✅ Firebase Functions (백엔드 API)
  ✅ Firebase Firestore (데이터베이스)
  ✅ Firebase Hosting (웹사이트)
`);
  process.exit(0);
}

deploy();