import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

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

export default clientPromise;

// 데이터베이스 및 컬렉션 헬퍼
export async function getDatabase(dbName: string = 'text-to-html'): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getComponentsCollection() {
  const db = await getDatabase();
  return db.collection('components');
}
