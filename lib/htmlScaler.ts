import { JSDOM } from 'jsdom';

/**
 * 특정 섹션만 스케일링하는 함수 (Transform Scale 방식)
 * (regenerate-section API에서 사용)
 */
export function scaleSectionInHTML(
  fullHTML: string,
  sectionId: string,
  scalePercentage: number
): string {
  const dom = new JSDOM(fullHTML);
  const doc = dom.window.document;

  // 대상 섹션 찾기
  const targetSection = doc.querySelector(`[data-section-id="${sectionId}"]`) as HTMLElement;
  if (!targetSection) {
    throw new Error(`Section with id "${sectionId}" not found`);
  }

  // Transform Scale 적용 (모든 요소를 시각적으로 스케일링)
  if (scalePercentage !== 100) {
    const scale = scalePercentage / 100;

    // 최상위 섹션에만 transform 적용
    targetSection.style.transform = `scale(${scale})`;
    targetSection.style.transformOrigin = 'top left';

    // 레이아웃 공간 조정 (선택적)
    // scale(0.5)로 축소하면 실제로는 50% 크기가 되지만 원래 공간을 차지함
    // 이를 보정하려면 width를 조정할 수 있지만, 레이아웃 깨짐 방지를 위해 제외

    console.log(`[htmlScaler] Applied transform: scale(${scale}) to section ${sectionId}`);
  }

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}
