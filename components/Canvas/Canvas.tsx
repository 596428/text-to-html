'use client';

import { useStore } from '@/lib/store';
import CanvasEditor from './CanvasEditor';
import CanvasPreview from './CanvasPreview';

export default function Canvas() {
  const canvasMode = useStore((state) => state.canvasMode);

  return (
    <div className="h-full w-full">
      {canvasMode === 'edit' ? <CanvasEditor /> : <CanvasPreview />}
    </div>
  );
}
