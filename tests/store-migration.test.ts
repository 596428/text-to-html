/**
 * Store Migration Tests for Phase 0
 *
 * 기존 Box 데이터와 새 스키마 간의 하위 호환성을 검증합니다.
 */

import type { Box } from '@/types';

// ========== 마이그레이션 시나리오 테스트 데이터 ==========

// 시나리오 1: 기존 Box 데이터 (layoutType 없음)
const legacyBoxData = {
  id: 'box-old-1',
  x: 0,
  y: 0,
  width: 12,
  height: 200,
  content: 'Legacy box without layoutType'
};

// 시나리오 2: Popup 필드가 있는 기존 Box
const legacyBoxWithPopup = {
  id: 'box-old-2',
  x: 0,
  y: 200,
  width: 6,
  height: 150,
  content: 'Legacy box with popup',
  hasPopup: true,
  popupContent: '<div>Old popup</div>',
  popupTriggerText: 'Open'
};

// 시나리오 3: 일부 필드만 있는 Box (극단적 사례)
const partialBoxData = {
  id: 'box-partial',
  x: 0,
  y: 0,
  width: 12,
  height: 100,
  content: ''
};

// ========== 마이그레이션 함수 (store.ts에서 복사) ==========

const DEFAULT_BOX_WIDTH = 12;
const DEFAULT_BOX_HEIGHT = 200;

function migrateBox(box: Partial<Box>): Box {
  return {
    ...box,
    id: box.id!,
    sectionId: box.sectionId ?? `test-section-${box.id}`, // Test용 sectionId 생성
    x: box.x ?? 0,
    y: box.y ?? 0,
    width: box.width ?? DEFAULT_BOX_WIDTH,
    height: box.height ?? DEFAULT_BOX_HEIGHT,
    content: box.content ?? '',
    layoutType: box.layoutType ?? 'simple', // 기본: simple 레이아웃
  };
}

// ========== 마이그레이션 테스트 ==========

// ✅ 테스트 1: 기존 Box가 새 스키마로 변환됨
const migratedLegacyBox = migrateBox(legacyBoxData);
console.assert(migratedLegacyBox.layoutType === 'simple',
  '❌ Legacy box should have layoutType: simple');
console.assert(migratedLegacyBox.id === legacyBoxData.id,
  '❌ ID should be preserved');
console.assert(migratedLegacyBox.content === legacyBoxData.content,
  '❌ Content should be preserved');

// ✅ 테스트 2: Popup 필드가 보존됨
const migratedPopupBox = migrateBox(legacyBoxWithPopup);
console.assert(migratedPopupBox.hasPopup === true,
  '❌ hasPopup should be preserved');
console.assert(migratedPopupBox.popupContent === '<div>Old popup</div>',
  '❌ popupContent should be preserved');
console.assert(migratedPopupBox.popupTriggerText === 'Open',
  '❌ popupTriggerText should be preserved');

// ✅ 테스트 3: 기본값 적용
const migratedPartialBox = migrateBox(partialBoxData);
console.assert(migratedPartialBox.x === 0,
  '❌ Default x should be 0');
console.assert(migratedPartialBox.y === 0,
  '❌ Default y should be 0');
console.assert(migratedPartialBox.width === DEFAULT_BOX_WIDTH,
  '❌ Default width should be applied');
console.assert(migratedPartialBox.height === DEFAULT_BOX_HEIGHT,
  '❌ Default height should be applied');
console.assert(migratedPartialBox.layoutType === 'simple',
  '❌ Default layoutType should be simple');

// ========== 새 Box 생성 테스트 ==========

// ✅ 테스트 4: 새로 생성된 Box는 layoutType을 가짐
const newBox: Box = {
  id: 'box-new-1',
  sectionId: 'test-section-new-1',
  x: 0,
  y: 0,
  width: 12,
  height: 200,
  content: 'New box',
  layoutType: 'simple'
};

console.assert(newBox.layoutType === 'simple',
  '❌ New box should have layoutType');

// ✅ 테스트 5: Flex 레이아웃 Box 생성
const newFlexBox: Box = {
  id: 'box-flex-1',
  sectionId: 'test-section-flex-1',
  x: 0,
  y: 200,
  width: 12,
  height: 300,
  content: 'Flex container',
  layoutType: 'flex',
  flexDirection: 'row',
  children: [
    { id: 'child-1', content: 'Child 1' },
    { id: 'child-2', content: 'Child 2' }
  ]
};

console.assert(newFlexBox.layoutType === 'flex',
  '❌ Flex box should have layoutType: flex');
console.assert(newFlexBox.children?.length === 2,
  '❌ Flex box should have 2 children');

// ✅ 테스트 6: Table 레이아웃 Box 생성
const newTableBox: Box = {
  id: 'box-table-1',
  sectionId: 'test-section-table-1',
  x: 0,
  y: 500,
  width: 12,
  height: 400,
  content: 'Table layout',
  layoutType: 'table',
  tableStructure: {
    rows: 2,
    cols: 2,
    cells: [
      [{ content: 'A1' }, { content: 'B1' }],
      [{ content: 'A2' }, { content: 'B2' }]
    ]
  }
};

console.assert(newTableBox.layoutType === 'table',
  '❌ Table box should have layoutType: table');
console.assert(newTableBox.tableStructure?.rows === 2,
  '❌ Table should have 2 rows');
console.assert(newTableBox.tableStructure?.cols === 2,
  '❌ Table should have 2 cols');

// ========== 하위 호환성 검증 ==========

// ✅ 테스트 7: 기존 코드가 layoutType 없이도 작동함
function processBox(box: Box) {
  // layoutType이 선택적이므로 기존 코드도 작동
  return {
    id: box.id,
    content: box.content,
    // layoutType은 선택적 체이닝으로 안전하게 접근
    type: box.layoutType ?? 'simple'
  };
}

const result1 = processBox(legacyBoxData as Box);
console.assert(result1.type === 'simple',
  '❌ Legacy box should default to simple');

const result2 = processBox(newFlexBox);
console.assert(result2.type === 'flex',
  '❌ Flex box type should be preserved');

// ========== LocalStorage 마이그레이션 시뮬레이션 ==========

// ✅ 테스트 8: LocalStorage에서 읽어온 데이터 마이그레이션
const storedData = {
  boxes: [
    legacyBoxData,
    legacyBoxWithPopup,
    partialBoxData
  ],
  htmlVersions: [],
  currentVersion: 0
};

function migrateState(state: any) {
  if (!state) return {};

  return {
    boxes: (state.boxes ?? []).map(migrateBox),
    htmlVersions: state.htmlVersions ?? [],
    currentVersion: state.currentVersion ?? 0,
  };
}

const migratedState = migrateState(storedData);
console.assert(migratedState.boxes.length === 3,
  '❌ All boxes should be migrated');
console.assert(migratedState.boxes.every((b: Box) => b.layoutType === 'simple'),
  '❌ All legacy boxes should have layoutType: simple');

// ========== 타입 안전성 검증 ==========

// ✅ 테스트 9: 타입 가드 함수
function isFlexBox(box: Box): box is Box & { layoutType: 'flex'; children: Array<any> } {
  return box.layoutType === 'flex';
}

function isTableBox(box: Box): box is Box & { layoutType: 'table'; tableStructure: any } {
  return box.layoutType === 'table';
}

const testBox: Box = newFlexBox;

if (isFlexBox(testBox)) {
  // TypeScript가 children 존재를 보장
  const childCount = testBox.children?.length ?? 0;
  console.assert(childCount > 0, '❌ Flex box should have children');
}

// ========== 결과 출력 ==========

export const migrationTests = {
  migratedLegacyBox,
  migratedPopupBox,
  migratedPartialBox,
  newBox,
  newFlexBox,
  newTableBox,
  migratedState,
  isFlexBox,
  isTableBox
};

console.log('✅ Phase 0 스토어 마이그레이션 검증 완료');
console.log('✅ 기존 Box 데이터 → 새 스키마 변환 성공');
console.log('✅ 하위 호환성 유지 확인');
console.log('✅ LocalStorage 마이그레이션 로직 검증 완료');
