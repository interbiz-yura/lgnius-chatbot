import { NextRequest, NextResponse } from 'next/server';
import { searchFaq } from '../../../lib/search';
import { searchPrice, searchPriceWithFilters, formatPriceResponse, looksLikeModelName } from '../../../lib/priceSearch';

// ═══════════════════════════════════════
// 카카오 오픈빌더 스킬 API (FAQ + 가격표 통합)
// ═══════════════════════════════════════

function makeTextResponse(text: string, buttons: any[] = [], quickReplies: any[] = []) {
  const response: any = {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
  if (quickReplies.length > 0) response.template.quickReplies = quickReplies;
  return response;
}

// ── 메인 메뉴 ──
function mainMenuResponse() {
  return makeTextResponse(
    '안녕하세요! 😊 LG전자 구독 상담 도우미입니다.\n\n궁금한 내용을 키워드로 입력하거나\n아래 메뉴를 선택해주세요!\n\n💡 예시:\n• "미납" → 미납 정책 안내\n• "롯데카드 혜택" → 카드 혜택\n• "해약금" → 해약금 안내\n• "A720WA" → 구독료 조회',
    [],
    [
      { messageText: '계약', action: 'message', label: '📋 계약 안내' },
      { messageText: '제휴카드', action: 'message', label: '💳 제휴카드' },
      { messageText: '케어서비스', action: 'message', label: '🔧 케어서비스' },
      { messageText: '가격표', action: 'message', label: '💰 가격 조회' },
      { messageText: '기타', action: 'message', label: '❓ 기타 문의' },
    ]
  );
}

// ── 카테고리 메뉴 ──
function categoryMenuResponse(category: string) {
  const categoryMap: Record<string, { title: string; items: { label: string; text: string }[] }> = {
    '계약': {
      title: '📋 계약 관련 어떤 내용이 궁금하세요?',
      items: [
        { label: '미납 정책', text: '미납' }, { label: '해약금', text: '해약금' },
        { label: '변경', text: '변경' }, { label: '명의변경', text: '명의변경' },
        { label: '결합할인', text: '결합할인' }, { label: '해지', text: '해지' },
        { label: '선납', text: '선납' },
      ],
    },
    '제휴카드': {
      title: '💳 어떤 카드사의 정보를 확인하시겠어요?',
      items: [
        { label: '롯데카드', text: '롯데카드' }, { label: '국민카드', text: '국민카드' },
        { label: '신한카드', text: '신한카드' }, { label: '우리카드', text: '우리카드' },
        { label: '청구할인', text: '청구할인' }, { label: '실적제외', text: '실적제외' },
      ],
    },
    '케어서비스': {
      title: '🔧 케어서비스 관련 어떤 내용이 궁금하세요?',
      items: [
        { label: '케어서비스 안내', text: '케어서비스' },
        { label: '소모품', text: '소모품' }, { label: '배송/설치', text: '배송' },
      ],
    },
    '가격표': {
      title: '💰 가격 조회\n\n모델명을 직접 입력해주세요!\n\n💡 예시:\n• A720WA\n• OLED55B4KW\n• AI927BA',
      items: [],
    },
    '기타': {
      title: '❓ 기타 문의 — 아래에서 선택하세요',
      items: [
        { label: '배송/설치', text: '배송' }, { label: '고객센터', text: '고객센터' },
      ],
    },
  };

  const cat = categoryMap[category];
  if (!cat) return mainMenuResponse();

  const quickReplies = cat.items.map(item => ({
    messageText: item.text, action: 'message' as const, label: item.label,
  }));
  quickReplies.push({ messageText: '처음으로', action: 'message' as const, label: '🏠 처음으로' });
  return makeTextResponse(cat.title, [], quickReplies);
}

// ── 가격 검색: 단계별 케어십 선택 ──
// 입력 형태: "모델명" / "모델명::G값" / "모델명::G값::H값" / "모델명::G값::H값::I값"
function priceStepResponse(utterance: string) {
  const parts = utterance.split('::');
  const modelQuery = parts[0].trim();
  const gFilter = parts[1]?.trim() || null;  // 케어십형태
  const hFilter = parts[2]?.trim() || null;  // 케어십구분
  const iFilter = parts[3]?.trim() || null;  // 방문주기

  // 모델 검색
  const result = searchPrice(modelQuery);
  if (!result) return null;

  // 필터 적용
  let items = result.careTypes;
  if (gFilter) items = items.filter(i => i.careType === gFilter);
  if (hFilter) items = items.filter(i => i.careDetail === hFilter);
  if (iFilter) items = items.filter(i => i.visitCycle === iFilter);

  if (items.length === 0) return null;

  // 최종 1개 → 가격 표시
  if (items.length === 1) {
    return makeTextResponse(
      formatPriceResponse(items[0]),
      [],
      [
        { messageText: '처음으로', action: 'message', label: '🏠 처음으로' },
        { messageText: '가격표', action: 'message', label: '💰 다른 모델 조회' },
      ]
    );
  }

  // ── 다음 단계 결정 ──

  // 1차: G열(케어십형태) 선택
  if (!gFilter) {
    const gTypes = Array.from(new Set(items.map(i => i.careType).filter(v => v)));
    if (gTypes.length === 1) {
      // G가 1개면 자동 건너뛰기 → H 확인
      return priceStepResponse(`${modelQuery}::${gTypes[0]}`);
    }
    const quickReplies = gTypes.slice(0, 10).map(g => ({
      messageText: `${modelQuery}::${g}`,
      action: 'message' as const,
      label: g,
    }));
    quickReplies.push({ messageText: '처음으로', action: 'message' as const, label: '🏠 처음으로' });

    return makeTextResponse(
      `📦 ${result.product} | ${result.modelFull}\n\n케어십 유형을 선택해주세요!`,
      [],
      quickReplies
    );
  }

  // 2차: H열(케어십구분) 선택
  if (!hFilter) {
    const hTypes = Array.from(new Set(items.map(i => i.careDetail).filter(v => v)));
    if (hTypes.length <= 1) {
      // H가 0~1개면 자동 건너뛰기 → I 확인
      return priceStepResponse(`${modelQuery}::${gFilter}::${hTypes[0] || ''}`);
    }
    const quickReplies = hTypes.slice(0, 10).map(h => ({
      messageText: `${modelQuery}::${gFilter}::${h}`,
      action: 'message' as const,
      label: h,
    }));
    quickReplies.push({ messageText: '처음으로', action: 'message' as const, label: '🏠 처음으로' });

    return makeTextResponse(
      `📦 ${result.product} | ${result.modelFull}\n🔧 케어십: ${gFilter}\n\n세부 유형을 선택해주세요!`,
      [],
      quickReplies
    );
  }

  // 3차: I열(방문주기) 선택
  if (!iFilter) {
    const iTypes = Array.from(new Set(items.map(i => i.visitCycle).filter(v => v)));
    if (iTypes.length <= 1) {
      // I가 0~1개면 → 최종 결과 (첫번째 항목 표시)
      return makeTextResponse(
        formatPriceResponse(items[0]),
        [],
        [
          { messageText: '처음으로', action: 'message', label: '🏠 처음으로' },
          { messageText: '가격표', action: 'message', label: '💰 다른 모델 조회' },
        ]
      );
    }
    const quickReplies = iTypes.slice(0, 10).map(iv => ({
      messageText: `${modelQuery}::${gFilter}::${hFilter}::${iv}`,
      action: 'message' as const,
      label: iv,
    }));
    quickReplies.push({ messageText: '처음으로', action: 'message' as const, label: '🏠 처음으로' });

    return makeTextResponse(
      `📦 ${result.product} | ${result.modelFull}\n🔧 케어십: ${gFilter} > ${hFilter}\n\n방문주기를 선택해주세요!`,
      [],
      quickReplies
    );
  }

  // 모든 필터 적용 후 첫번째 결과 표시
  return makeTextResponse(
    formatPriceResponse(items[0]),
    [],
    [
      { messageText: '처음으로', action: 'message', label: '🏠 처음으로' },
      { messageText: '가격표', action: 'message', label: '💰 다른 모델 조회' },
    ]
  );
}

// ── FAQ 검색 ──
function searchResultResponse(query: string) {
  const results = searchFaq(query);

  if (results.length === 0) {
    return makeTextResponse(
      `죄송합니다 😅 "${query}"에 대한 답변을 찾지 못했어요.\n\n💡 다른 키워드로 질문해보세요!\n• 예: "미납", "롯데카드 혜택", "해약금"\n• 모델명: "A720WA", "OLED55B4KW"\n\n또는 아래 메뉴에서 찾아보세요!`,
      [],
      [
        { messageText: '계약', action: 'message', label: '📋 계약' },
        { messageText: '제휴카드', action: 'message', label: '💳 제휴카드' },
        { messageText: '가격표', action: 'message', label: '💰 가격 조회' },
        { messageText: '처음으로', action: 'message', label: '🏠 처음으로' },
      ]
    );
  }

  const best = results[0];
  let answer = best.item.answer;

  if (best.item.url && best.item.url.trim() !== '') {
    const btnLabel = best.item.urlButton || '상세보기';
    answer += `\n\n🔗 ${btnLabel}: ${best.item.url}`;
  }

  const quickReplies: any[] = [];
  for (let i = 1; i < Math.min(results.length, 3); i++) {
    if (results[i].score > 5) {
      const q = results[i].item.question;
      quickReplies.push({
        messageText: q, action: 'message',
        label: `🔍 ${q.length > 12 ? q.substring(0, 12) + '..' : q}`,
      });
    }
  }
  quickReplies.push({ messageText: '처음으로', action: 'message', label: '🏠 처음으로' });
  return makeTextResponse(answer, [], quickReplies);
}

// ═══════════════════════════════════════
// POST 핸들러 (메인 로직)
// ═══════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const utterance = body?.userRequest?.utterance?.trim() || '';

    if (!utterance) return NextResponse.json(mainMenuResponse());

    // 1. 메인 메뉴
    const menuKeywords = ['처음으로', '홈', '메인', '메뉴', '시작', '도움말'];
    if (menuKeywords.includes(utterance)) return NextResponse.json(mainMenuResponse());

    // 2. 카테고리 메뉴
    const categoryKeywords: Record<string, string> = {
      '계약': '계약', '계약 안내': '계약',
      '판촉': '제휴카드', '제휴카드': '제휴카드', '카드': '제휴카드',
      '케어서비스': '케어서비스', '케어': '케어서비스',
      '가격표': '가격표', '가격 조회': '가격표', '가격조회': '가격표',
      '기타': '기타', '기타 문의': '기타',
    };
    if (categoryKeywords[utterance]) return NextResponse.json(categoryMenuResponse(categoryKeywords[utterance]));

    // 3. 단계별 가격 조회 (:: 구분자 포함)
    if (utterance.includes('::')) {
      const stepResult = priceStepResponse(utterance);
      if (stepResult) return NextResponse.json(stepResult);
    }

    // 4. 모델명 단독 (예: "A720WA") → 가격 단계별 조회
    if (looksLikeModelName(utterance)) {
      const stepResult = priceStepResponse(utterance);
      if (stepResult) return NextResponse.json(stepResult);
    }

    // 5. FAQ 키워드 검색
    return NextResponse.json(searchResultResponse(utterance));

  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      makeTextResponse(
        '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        [],
        [{ messageText: '처음으로', action: 'message', label: '🏠 처음으로' }]
      )
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'LG 구독 챗봇 API — FAQ + 가격표 통합',
    timestamp: new Date().toISOString(),
  });
}
