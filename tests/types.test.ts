/**
 * Type Definition Tests for Phase 0
 *
 * 이 파일은 TypeScript 컴파일러를 통한 타입 검증을 수행합니다.
 * 실제 테스트 프레임워크 없이도 타입 안정성을 확인할 수 있습니다.
 */

import type {
  Box,
  LayoutType,
  ChildElement,
  TableStructure,
  TableCell
} from '@/types';

// ========== LayoutType 검증 ==========

// ✅ 유효한 LayoutType 값들
const validLayoutTypes: LayoutType[] = ['simple', 'flex', 'table'];

// @ts-expect-error - 잘못된 LayoutType은 컴파일 에러 발생
const invalidLayoutType: LayoutType = 'invalid';

// ========== ChildElement 검증 ==========

// ✅ 최소 필수 필드만 있는 ChildElement
const minimalChild: ChildElement = {
  id: 'child-1',
  content: 'Element description'
};

// ✅ 모든 선택적 필드를 포함한 ChildElement
const fullChild: ChildElement = {
  id: 'child-2',
  content: 'Full element',
  flexGrow: 1,
  flexShrink: 0,
  flexBasis: '200px',
  order: 2
};

// @ts-expect-error - id 필드 누락
const invalidChild: ChildElement = {
  content: 'Missing id'
};

// ========== TableCell 검증 ==========

// ✅ 최소 필수 필드만 있는 TableCell
const minimalCell: TableCell = {
  content: 'Cell content'
};

// ✅ 모든 선택적 필드를 포함한 TableCell
const fullCell: TableCell = {
  content: 'Header cell',
  rowSpan: 2,
  colSpan: 3,
  isHeader: true
};

// ========== TableStructure 검증 ==========

// ✅ 유효한 TableStructure
const validTable: TableStructure = {
  rows: 3,
  cols: 4,
  cells: [
    [
      { content: 'Cell 1-1' },
      { content: 'Cell 1-2' },
      { content: 'Cell 1-3' },
      { content: 'Cell 1-4' }
    ],
    [
      { content: 'Cell 2-1' },
      { content: 'Cell 2-2', colSpan: 2 },
      { content: 'Cell 2-4' }
    ],
    [
      { content: 'Cell 3-1', rowSpan: 2 },
      { content: 'Cell 3-2' },
      { content: 'Cell 3-3' },
      { content: 'Cell 3-4' }
    ]
  ],
  hasHeader: true
};

// @ts-expect-error - cells 필드 누락
const invalidTable: TableStructure = {
  rows: 2,
  cols: 2
};

// ========== Box 검증 (기존 필드) ==========

// ✅ 기존 필드만 사용하는 Box (하위 호환성)
const legacyBox: Box = {
  id: 'box-1',
  sectionId: 'test-section-1',
  x: 0,
  y: 0,
  width: 12,
  height: 200,
  content: 'Legacy box'
};

// ========== Box 검증 (Simple 레이아웃) ==========

// ✅ Simple 레이아웃 Box
const simpleBox: Box = {
  id: 'box-2',
  sectionId: 'test-section-2',
  x: 0,
  y: 0,
  width: 12,
  height: 200,
  content: 'Simple layout',
  layoutType: 'simple'
};

// ========== Box 검증 (Flex 레이아웃) ==========

// ✅ 모든 Flex 필드를 포함한 Box
const flexBox: Box = {
  id: 'box-3',
  sectionId: 'test-section-3',
  x: 0,
  y: 200,
  width: 12,
  height: 300,
  content: 'Flex container',
  layoutType: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  children: [
    {
      id: 'child-1',
      content: 'First child',
      flexGrow: 1
    },
    {
      id: 'child-2',
      content: 'Second child',
      flexGrow: 2,
      order: 1
    }
  ]
};

// ========== Box 검증 (Table 레이아웃) ==========

// ✅ TableStructure를 포함한 Box
const tableBox: Box = {
  id: 'box-5',
  sectionId: 'test-section-5',
  x: 0,
  y: 500,
  width: 12,
  height: 400,
  content: 'Table layout',
  layoutType: 'table',
  tableStructure: {
    rows: 2,
    cols: 3,
    cells: [
      [
        { content: 'Header 1', isHeader: true },
        { content: 'Header 2', isHeader: true },
        { content: 'Header 3', isHeader: true }
      ],
      [
        { content: 'Data 1' },
        { content: 'Data 2' },
        { content: 'Data 3' }
      ]
    ],
    hasHeader: true
  }
};

// ========== Box 검증 (Popup 필드 포함) ==========

// ✅ Popup 필드가 있는 Box
const boxWithPopup: Box = {
  id: 'box-6',
  sectionId: 'test-section-6',
  x: 0,
  y: 0,
  width: 6,
  height: 200,
  content: 'Box with popup',
  layoutType: 'simple',
  hasPopup: true,
  popupContent: '<div>Popup HTML</div>',
  popupTriggerText: 'Open Popup'
};

// ========== 복합 시나리오 검증 ==========

// ✅ Flex + Popup 조합
const flexBoxWithPopup: Box = {
  id: 'box-7',
  sectionId: 'test-section-7',
  x: 6,
  y: 0,
  width: 6,
  height: 200,
  content: 'Flex with popup',
  layoutType: 'flex',
  flexDirection: 'column',
  children: [
    { id: 'child-1', content: 'Child 1' },
    { id: 'child-2', content: 'Child 2' }
  ],
  hasPopup: true,
  popupContent: '<div>Flex popup</div>'
};

// ✅ Table + Popup 조합
const tableBoxWithPopup: Box = {
  id: 'box-8',
  sectionId: 'test-section-8',
  x: 0,
  y: 700,
  width: 12,
  height: 400,
  content: 'Table with popup',
  layoutType: 'table',
  tableStructure: {
    rows: 2,
    cols: 2,
    cells: [
      [{ content: 'A1' }, { content: 'B1' }],
      [{ content: 'A2' }, { content: 'B2' }]
    ]
  },
  hasPopup: true,
  popupContent: '<div>Table popup</div>',
  popupTriggerText: 'Show Details'
};

// ========== 타입 가드 함수 검증 ==========

function isFlexBox(box: Box): box is Box & { layoutType: 'flex' } {
  return box.layoutType === 'flex';
}

function isTableBox(box: Box): box is Box & { layoutType: 'table' } {
  return box.layoutType === 'table';
}

// ✅ 타입 가드 사용 예시
const box: Box = flexBox;

if (isFlexBox(box)) {
  // 이 블록 안에서 box.children은 타입 안전하게 접근 가능
  const children = box.children;
  const direction = box.flexDirection;
}

if (isTableBox(box)) {
  // 이 블록 안에서 box.tableStructure는 타입 안전하게 접근 가능
  const table = box.tableStructure;
}

// ========== Export (타입 검증 통과 확인용) ==========

export const typeTests = {
  validLayoutTypes,
  minimalChild,
  fullChild,
  minimalCell,
  fullCell,
  validTable,
  legacyBox,
  simpleBox,
  flexBox,
  tableBox,
  boxWithPopup,
  flexBoxWithPopup,
  tableBoxWithPopup,
  isFlexBox,
  isTableBox
};

// 컴파일 성공 = 모든 타입 검증 통과
console.log('✅ Phase 0 타입 정의 검증 완료');
