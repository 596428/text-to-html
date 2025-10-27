import { NextRequest, NextResponse } from 'next/server';
import { getComponentsCollection } from '@/lib/mongodb';
import { SavedComponent } from '@/types';

// GET: 특정 컴포넌트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getComponentsCollection();
    const component = await collection.findOne({ id: params.id });

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    // MongoDB _id 제거
    const { _id, ...cleanedComponent } = component;

    return NextResponse.json({ component: cleanedComponent });
  } catch (error) {
    console.error(`[/api/components/${params.id}] GET Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch component' },
      { status: 500 }
    );
  }
}

// PUT: 특정 컴포넌트 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates: Partial<SavedComponent> = await request.json();

    const collection = await getComponentsCollection();
    const result = await collection.updateOne(
      { id: params.id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[/api/components/${params.id}] PUT Error:`, error);
    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    );
  }
}

// DELETE: 특정 컴포넌트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getComponentsCollection();
    const result = await collection.deleteOne({ id: params.id });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[/api/components/${params.id}] DELETE Error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete component' },
      { status: 500 }
    );
  }
}
