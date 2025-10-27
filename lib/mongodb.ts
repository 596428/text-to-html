import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;

// 런타임에만 연결 (빌드 타임에는 스킵)
if (uri && typeof window === 'undefined') {
  if (process.env.NODE_ENV === 'development') {
    // 개발 환경에서는 글로벌 변수를 사용하여 HMR 중에도 연결 유지
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // 프로덕션 환경에서는 새 클라이언트 생성
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export default clientPromise as Promise<MongoClient>;

// 데이터베이스 및 컬렉션 헬퍼
export async function getDatabase(dbName: string = 'text-to-html'): Promise<Db> {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  if (!clientPromise) {
    throw new Error('MongoDB client not initialized');
  }
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getComponentsCollection() {
  const db = await getDatabase();
  return db.collection('components');
}
