const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://ajh428:S0Zr18JrzOIPz8gn@cluster0.koydgqj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function checkComponents() {
  console.log('🔍 MongoDB 컴포넌트 확인 시작...\n');

  let client;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');

    const db = client.db('text-to-html');
    const collection = db.collection('components');

    const components = await collection.find({}).toArray();
    console.log(`📦 총 ${components.length}개 컴포넌트 발견\n`);

    components.forEach((comp, i) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`${i + 1}. ${comp.name}`);
      console.log(`   ID: ${comp.id}`);
      console.log(`   설명: ${comp.description || '(없음)'}`);
      console.log(`   태그: ${comp.tags && comp.tags.length > 0 ? comp.tags.join(', ') : '(없음)'}`);
      console.log(`   크기: ${comp.width}칸 × ${comp.height}px`);
      console.log(`   생성일: ${new Date(comp.createdAt).toLocaleString('ko-KR')}`);
      console.log(`   메타데이터:`);
      console.log(`     - boxCount: ${comp.metadata?.boxCount || 'N/A'}`);
      console.log(`     - totalSections: ${comp.metadata?.totalSections || 'N/A'}`);
      console.log(`     - version: ${comp.metadata?.version || 'N/A'}`);

      // HTML에서 실제 section 개수 확인
      const sectionCount = (comp.html.match(/data-section-id=/g) || []).length;
      console.log(`   실제 HTML의 section 개수: ${sectionCount}`);

      // section ID 목록
      const sectionIds = comp.html.match(/data-section-id="([^"]+)"/g) || [];
      if (sectionIds.length > 0) {
        console.log(`   Section ID 목록:`);
        sectionIds.forEach((sid, j) => {
          console.log(`     ${j + 1}. ${sid}`);
        });
      }

      console.log(`   HTML 크기: ${(comp.html.length / 1024).toFixed(2)} KB`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔒 연결 종료');
    }
  }
}

checkComponents();
