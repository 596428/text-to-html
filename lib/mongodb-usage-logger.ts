import clientPromise from './mongodb';

/**
 * Gemini API 사용량 로그 인터페이스
 */
export interface GeminiUsageLog {
  requestIp: string;           // 요청 IP 주소
  timestamp: Date;             // 요청 시간
  isError: boolean;            // 에러 발생 여부
  errorMessage?: string;       // 에러 메시지 (에러 발생 시)
  tokenUsage?: {               // 토큰 사용량 (성공 시)
    promptTokens: number;      // 입력 토큰
    candidatesTokens: number;  // 출력 토큰
    totalTokens: number;       // 총 토큰
  };
  apiKeyUsed?: string;         // 사용한 API 키 (1 or 2)
}

/**
 * Gemini API 사용량을 MongoDB에 기록
 * @param log 사용량 로그 데이터
 */
export async function logGeminiUsage(log: GeminiUsageLog): Promise<void> {
  // 개발 서버 IP 필터링 (localhost 접속은 로그 저장 안함)
  const DEV_IPS = ['::1', '127.0.0.1', 'localhost'];
  if (DEV_IPS.includes(log.requestIp)) {
    console.log(`[Usage Log] Skipped (dev IP): ${log.requestIp}`);
    return; // DB 저장 안함
  }

  console.log('[DEBUG] logGeminiUsage called:', { ip: log.requestIp, isError: log.isError, apiKey: log.apiKeyUsed });
  try {
    const client = await clientPromise;
    const db = client.db('text-to-html');

    // UTC 시간을 한국 시간(KST, UTC+9)으로 변환
    const utcDate = log.timestamp || new Date();
    const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));

    await db.collection('usage_logs').insertOne({
      ...log,
      timestamp: kstDate
    });

    console.log(`[Usage Log] IP: ${log.requestIp}, Error: ${log.isError}, Tokens: ${log.tokenUsage?.totalTokens || 'N/A'}, API Key: ${log.apiKeyUsed || 'N/A'}`);
  } catch (error) {
    // 로깅 실패는 조용히 처리 (메인 기능에 영향 없도록)
    console.error('[Usage Log Error]', error);
  }
}

/**
 * 최근 사용량 로그 조회
 * @param limit 조회할 로그 개수 (기본: 100)
 * @returns 사용량 로그 배열
 */
export async function getRecentUsageLogs(limit: number = 100): Promise<GeminiUsageLog[]> {
  try {
    const client = await clientPromise;
    const db = client.db('text-to-html');

    const logs = await db.collection('usage_logs')
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs as any[];
  } catch (error) {
    console.error('[Usage Log Fetch Error]', error);
    return [];
  }
}

/**
 * 특정 기간의 토큰 사용량 통계
 * @param startDate 시작 날짜
 * @param endDate 종료 날짜
 * @returns 통계 데이터
 */
export async function getUsageStats(startDate: Date, endDate: Date) {
  try {
    const client = await clientPromise;
    const db = client.db('text-to-html');

    const stats = await db.collection('usage_logs').aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          errorCount: { $sum: { $cond: ['$isError', 1, 0] } },
          totalTokens: { $sum: '$tokenUsage.totalTokens' },
          avgTokensPerRequest: { $avg: '$tokenUsage.totalTokens' }
        }
      }
    ]).toArray();

    return stats[0] || {
      totalRequests: 0,
      errorCount: 0,
      totalTokens: 0,
      avgTokensPerRequest: 0
    };
  } catch (error) {
    console.error('[Usage Stats Error]', error);
    return {
      totalRequests: 0,
      errorCount: 0,
      totalTokens: 0,
      avgTokensPerRequest: 0
    };
  }
}
