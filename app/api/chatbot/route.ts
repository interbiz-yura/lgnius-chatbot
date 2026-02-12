import { NextRequest, NextResponse } from 'next/server';
import { searchFaq, getCategories } from '../../../lib/search';

// ═══════════════════════════════════════
// 카카오 오픈빌더 스킬 API
// ═══════════════════════════════════════

// 카카오 오픈빌더 응답 형식 생성 함수들
// ─────────────────────────────────────

// 텍스트 + 버튼 응답
function makeTextResponse(text: string, buttons: any[] = [], quickReplies: any[] = []) {
  const response: any = {
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: text,
          },
        },
      ],
    },
  };

  // 바로가기 버튼 (퀵리플라이)
  if (quickReplies.length > 0) {
    response.template.quickReplies = quickReplies;
  }

  return response;
}

// 카드형 응답 (텍스트 + 설명 + 버튼)
function makeCardResponse(title: string, description: string, buttons: any[] = [], quickReplies: any[] = []) {
  const response: any = {
    version: '2.0',
    template: {
      outputs: [
        {
          basicCard: {
            title: title,
            description: description,
            buttons: buttons,
          },
        },
      ],
    },
  };

  if (quickReplies.length > 0) {
    response.template.quickReplies = quickReplies;
  }

  return response;
}

// 기본 퀵리플라이 버튼
function defaultQuickReplies() {
  return [
    {
      messageText: '처음으로',
      action: 'message',
      label: '🏠 처음으로',
    },
    {
      messageText: '계약',
      action: 'message',
      label: '📋 계약',
    },
    {
      messageText: '제휴카드',
      action: 'message',
      label: '💳 제휴카드',
    },
    {
      messageText: '케어서비스',
      action: 'message',
      label: '🔧 케어서비스',
    },
  ];
}

// ─────────────────────────────────────
// 메인 메뉴 응답
// ─────────────────────────────────────
function mainMenuResponse() {
  return makeTextResponse(
    '안녕하세요! 😊 LG전자 구독 상담 도우미입니다.\n\n궁금한 내용을 키워드로 입력하거나\n아래 메뉴를 선택해주세요!\n\n💡 예시:\n• "미납" → 미납 정책 안내\n• "롯데카드 혜택" → 카드 혜택\n• "해약금" → 해약금 안내\n• "OLED55B4KW" → 구독료 조회',
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

// ─────────────────────────────────────
// 카테고리 메뉴 응답
// ─────────────────────────────────────
function categoryMenuResponse(category: string) {
  const categoryMap: Record<string, { title: string; items: { label: string; text: string }[] }> = {
    '계약': {
      title: '📋 계약 관련 어떤 내용이 궁금하세요?',
      items: [
        { label: '미납 정책', text: '미납' },
        { label: '해약금', text: '해약금' },
        { label: '변경', text: '변경' },
        { label: '명의변경', text: '명의변경' },
        { label: '결합할인', text: '결합할인' },
        { label: '해지', text: '해지' },
        { label: '선납', text: '선납' },
      ],
    },
    '제휴카드': {
      title: '💳 어떤 카드사의 정보를 확인하시겠어요?',
      items: [
        { label: '롯데카드', text: '롯데카드' },
        { label: '국민카드', text: '국민카드' },
        { label: '신한카드', text: '신한카드' },
        { label: '우리카드', text: '우리카드' },
        { label: '청구할인', text: '청구할인' },
        { label: '실적제외', text: '실적제외' },
      ],
    },
    '판촉': {
      title: '💳 어떤 카드사의 정보를 확인하시겠어요?',
      items: [
        { label: '롯데카드', text: '롯데카드' },
        { label: '국민카드', text: '국민카드' },
        { label: '신한카드', text: '신한카드' },
        { label: '우리카드', text: '우리카드' },
        { label: '청구할인', text: '청구할인' },
        { label: '실적제외', text: '실적제외' },
      ],
    },
    '케어서비스': {
      title: '🔧 케어서비스 관련 어떤 내용이 궁금하세요?',
      items: [
        { label: '케어서비스 안내', text: '케어서비스' },
        { label: '소모품', text: '소모품' },
        { label: '배송/설치', text: '배송' },
      ],
    },
    '가격표': {
      title: '💰 가격 조회\n\n모델명을 직접 입력해주세요!\n예시: OLED55B4KW, A720WA',
      items: [],
    },
    '기타': {
      title: '❓ 기타 문의 — 아래에서 선택하세요',
      items: [
        { label: '배송/설치', text: '배송' },
        { label: '고객센터', text: '고객센터' },
      ],
    },
  };

  const cat = categoryMap[category];
  if (!cat) {
    return mainMenuResponse();
  }

  const quickReplies = cat.items.map(item => ({
    messageText: item.text,
    action: 'message' as const,
    label: item.label,
  }));

  // 항상 "처음으로" 버튼 추가
  quickReplies.push({
    messageText: '처음으로',
    action: 'message' as const,
    label: '🏠 처음으로',
  });

  return makeTextResponse(cat.title, [], quickReplies);
}

// ─────────────────────────────────────
// 검색 결과 응답 생성
// ─────────────────────────────────────
function searchResultResponse(query: string) {
  const results = searchFaq(query);

  // 매칭 실패
  if (results.length === 0) {
    return makeTextResponse(
      `죄송합니다 😅 "${query}"에 대한 답변을 찾지 못했어요.\n\n💡 다른 키워드로 질문해보세요!\n• 예: "미납", "롯데카드 혜택", "해약금"\n\n또는 아래 메뉴에서 찾아보세요!`,
      [],
      [
        { messageText: '계약', action: 'message', label: '📋 계약' },
        { messageText: '제휴카드', action: 'message', label: '💳 제휴카드' },
        { messageText: '케어서비스', action: 'message', label: '🔧 케어서비스' },
        { messageText: '가격표', action: 'message', label: '💰 가격 조회' },
        { messageText: '처음으로', action: 'message', label: '🏠 처음으로' },
      ]
    );
  }

  const best = results[0];
  const answer = best.item.answer;

  // URL 버튼이 있는 경우 → 카드형 응답
  if (best.item.url && best.item.url.trim() !== '') {
    const buttons: any[] = [
      {
        action: 'webLink',
        label: best.item.urlButton || '📄 상세보기',
        webLinkUrl: best.item.url,
      },
    ];

    // 퀵리플라이: 관련 후보 + 기본 메뉴
    const quickReplies: any[] = [];

    // 2순위 후보가 있으면 제안
    if (results.length > 1 && results[1].score > 5) {
      const secondQ = results[1].item.question;
      quickReplies.push({
        messageText: secondQ,
        action: 'message',
        label: `🔍 ${secondQ.length > 12 ? secondQ.substring(0, 12) + '..' : secondQ}`,
      });
    }

    quickReplies.push(
      { messageText: '처음으로', action: 'message', label: '🏠 처음으로' }
    );

    return makeCardResponse(
      best.item.question,
      answer,
      buttons,
      quickReplies
    );
  }

  // URL 없는 경우 → 텍스트 응답
  const quickReplies: any[] = [];

  // 2~3순위 후보 제안
  for (let i = 1; i < Math.min(results.length, 3); i++) {
    if (results[i].score > 5) {
      const q = results[i].item.question;
      quickReplies.push({
        messageText: q,
        action: 'message',
        label: `🔍 ${q.length > 12 ? q.substring(0, 12) + '..' : q}`,
      });
    }
  }

  quickReplies.push(
    { messageText: '처음으로', action: 'message', label: '🏠 처음으로' }
  );

  return makeTextResponse(answer, [], quickReplies);
}

// ═══════════════════════════════════════
// POST 핸들러 (오픈빌더 스킬 호출)
// ═══════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 오픈빌더가 보내는 요청에서 사용자 발화 추출
    const utterance = body?.userRequest?.utterance?.trim() || '';

    if (!utterance) {
      return NextResponse.json(mainMenuResponse());
    }

    // ── 메인 메뉴 키워드 ──
    const menuKeywords = ['처음으로', '홈', '메인', '메뉴', '시작', '도움말'];
    if (menuKeywords.includes(utterance)) {
      return NextResponse.json(mainMenuResponse());
    }

    // ── 카테고리 메뉴 키워드 ──
    const categoryKeywords: Record<string, string> = {
      '계약': '계약',
      '계약 안내': '계약',
      '판촉': '제휴카드',
      '제휴카드': '제휴카드',
      '카드': '제휴카드',
      '케어서비스': '케어서비스',
      '케어': '케어서비스',
      '가격표': '가격표',
      '가격 조회': '가격표',
      '가격조회': '가격표',
      '기타': '기타',
      '기타 문의': '기타',
    };

    if (categoryKeywords[utterance]) {
      return NextResponse.json(categoryMenuResponse(categoryKeywords[utterance]));
    }

    // ── FAQ 검색 ──
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

// GET 핸들러 (서버 상태 확인용)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'LG 구독 챗봇 API가 정상 작동 중입니다.',
    timestamp: new Date().toISOString(),
  });
}
