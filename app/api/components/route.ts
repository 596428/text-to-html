import { NextRequest, NextResponse } from 'next/server';
import { getComponentsCollection } from '@/lib/mongodb';
import { SavedComponent } from '@/types';

// GET: 모든 컴포넌트 조회
export async function GET() {
  try {
    const collection = await getComponentsCollection();
    const components = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // MongoDB _id를 제거하고 반환
    const cleanedComponents = components.map(({ _id, ...rest }) => rest);

    return NextResponse.json({ components: cleanedComponents });
  } catch (error) {
    console.error('[/api/components] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    );
  }
}

// POST: 새 컴포넌트 저장
export async function POST(request: NextRequest) {
  try {
    const component: SavedComponent = await request.json();

    // 필수 필드 검증
    if (!component.id || !component.name || !component.html) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, html' },
        { status: 400 }
      );
    }

    const collection = await getComponentsCollection();

    // 중복 ID 체크
    const existing = await collection.findOne({ id: component.id });
    if (existing) {
      return NextResponse.json(
        { error: 'Component with this ID already exists' },
        { status: 409 }
      );
    }

    // 컴포넌트 저장
    await collection.insertOne(component);

    return NextResponse.json({ success: true, component });
  } catch (error) {
    console.error('[/api/components] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save component' },
      { status: 500 }
    );
  }
}

// DELETE: 모든 컴포넌트 삭제 (개발용)
export async function DELETE() {
  try {
    const collection = await getComponentsCollection();
    const result = await collection.deleteMany({});

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('[/api/components] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete components' },
      { status: 500 }
    );
  }
}
