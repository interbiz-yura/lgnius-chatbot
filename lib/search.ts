import faqData from '../data/faq.json';

// ═══════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════
interface FaqItem {
  id: number;
  category1: string;
  category2: string;
  category3: string;
  question: string;
  answer: string;
  url: string;
  urlButton: string;
}

interface SearchResult {
  item: FaqItem;
  score: number;
  matchedKeywords: string[];
}

// ═══════════════════════════════════════
// 동의어 사전 (검색 정확도 향상)
// ═══════════════════════════════════════
const SYNONYMS: Record<string, string[]> = {
  '해약': ['해약금', '해지', '위약금', '해약비', '구독해약', '구독해지'],
  '미납': ['연체', '미납시', '미납정책', '구독료미납'],
  '변경': ['계약변경', '기간변경', '구독변경', '변경방법'],
  '명의변경': ['명의이전', '명의', '이름변경'],
  '결합': ['결합할인', '결합혜택', '다중구독'],
  '선납': ['미리납부', '일시납', '선납할인', '선납금'],
  '케어': ['케어서비스', '방문케어', '케어십', '무상AS', 'AS', '방문서비스'],
  '배송': ['배송일', '배송일정', '설치', '설치일'],
  '소모품': ['필터', '소모품교체', '필터교체'],
  '롯데': ['롯데카드', '롯데제휴카드'],
  '국민': ['국민카드', 'KB카드', 'KB', '국민제휴카드'],
  '신한': ['신한카드', '신한제휴카드'],
  '우리': ['우리카드', '우리제휴카드'],
  '혜택': ['카드혜택', '할인혜택', '할인', '혜택금액'],
  '실적제외': ['실적제외항목', '실적', '카드실적'],
  '청구할인': ['캐시백', '청구할인방식', '할인방식'],
  '연회비': ['카드연회비', '연회비금액'],
  '프로모션': ['프로모', '이벤트', '행사'],
};

// ═══════════════════════════════════════
// 불용어 (검색에서 제외할 단어)
// ═══════════════════════════════════════
const STOPWORDS = new Set([
  '은', '는', '이', '가', '을', '를', '의', '에', '에서', '도', '로', '으로',
  '와', '과', '하고', '이랑', '랑', '며', '고', '지만', '인데', '거든',
  '것', '거', '건', '게', '때', '때문', '경우', '위해', '대해', '통해',
  '좀', '잠깐', '혹시', '그', '그게', '뭐', '어떻게', '얼마', '언제', '어디',
  '알려줘', '알려주세요', '궁금', '질문', '문의', '확인', '해줘', '해주세요',
  '하면', '되나요', '인가요', '인지', '나요', '인데요', '요', '네요',
  '수', '있', '없', '안', '못', '다', '더', '덜', '매우', '정말', '진짜',
  '합니다', '합니까', '하나요', '인가', '일까', '할까',
  '우리', '저', '나', '제', '엄마', '아빠', '고객', '사람', '분',
  '그냥', '일단', '아', '어', '음', '그래서', '근데', '그런데',
]);

// ═══════════════════════════════════════
// 텍스트 정규화
// ═══════════════════════════════════════
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w가-힣a-z0-9]/g, ' ')  // 특수문자 → 공백
    .replace(/\s+/g, ' ')                // 중복 공백 제거
    .trim();
}

// ═══════════════════════════════════════
// 키워드 추출 (불용어 제거 + 동의어 확장)
// ═══════════════════════════════════════
function extractKeywords(text: string): string[] {
  const normalized = normalize(text);
  const words = normalized.split(' ').filter(w => w.length > 0);
  
  // 불용어 제거
  const meaningful = words.filter(w => !STOPWORDS.has(w) && w.length >= 1);
  
  // 동의어 → 대표어로 변환
  const mapped = meaningful.map(word => {
    // 이미 대표어인지 확인
    if (SYNONYMS[word]) return word;
    
    // 동의어에 포함되어 있으면 대표어로 변환
    for (const [representative, synonyms] of Object.entries(SYNONYMS)) {
      if (synonyms.some(syn => syn === word || word.includes(syn) || syn.includes(word))) {
        return representative;
      }
    }
    return word;
  });
  
  // 원래 단어도 유지 (대표어 + 원래 단어 모두 검색에 사용)
  const combined = [...meaningful, ...mapped];
  const allKeywords = Array.from(new Set(combined));
  
  return allKeywords;
}

// ═══════════════════════════════════════
// 메인 검색 함수
// ═══════════════════════════════════════
export function searchFaq(query: string): SearchResult[] {
  const keywords = extractKeywords(query);
  
  if (keywords.length === 0) {
    return [];
  }
  
  const results: SearchResult[] = [];
  const data = faqData as FaqItem[];
  
  for (const item of data) {
    const questionNorm = normalize(item.question);
    const categoryNorm = normalize(`${item.category2} ${item.category3}`);
    const answerNorm = normalize(item.answer);
    
    let score = 0;
    const matchedKeywords: string[] = [];
    
    // ── 1. 정확 매칭 (질문과 완전 일치) ──
    const queryNorm = normalize(query);
    if (questionNorm === queryNorm) {
      score += 100;
      matchedKeywords.push('exact');
    }
    
    // ── 2. 질문 포함 매칭 ──
    if (questionNorm.includes(queryNorm) || queryNorm.includes(questionNorm)) {
      score += 50;
      matchedKeywords.push('contains');
    }
    
    // ── 3. 키워드별 매칭 점수 ──
    for (const keyword of keywords) {
      // 질문에서 키워드 발견 (가장 높은 점수)
      if (questionNorm.includes(keyword)) {
        score += 10;
        matchedKeywords.push(keyword);
      }
      // 카테고리에서 키워드 발견
      else if (categoryNorm.includes(keyword)) {
        score += 5;
        matchedKeywords.push(keyword);
      }
      // 답변에서 키워드 발견 (보조 점수)
      else if (answerNorm.includes(keyword)) {
        score += 2;
        matchedKeywords.push(keyword);
      }
    }
    
    // ── 4. 동의어 매칭 보너스 ──
    for (const keyword of keywords) {
      const synonymList = SYNONYMS[keyword];
      if (synonymList) {
        for (const syn of synonymList) {
          if (questionNorm.includes(normalize(syn))) {
            score += 7;
            matchedKeywords.push(syn);
          }
        }
      }
    }
    
    if (score > 0) {
      results.push({
        item,
        score,
        matchedKeywords: Array.from(new Set(matchedKeywords)),
      });
    }
  }
  
  // 점수 높은 순으로 정렬
  results.sort((a, b) => b.score - a.score);
  
  // ── 중복 답변 제거 (같은 답변이 여러 번 나오는 것 방지) ──
  const seen = new Set<string>();
  const unique: SearchResult[] = [];
  for (const result of results) {
    const answerKey = result.item.answer.substring(0, 50);
    if (!seen.has(answerKey)) {
      seen.add(answerKey);
      unique.push(result);
    }
  }
  
  return unique;
}

// ═══════════════════════════════════════
// 카테고리 목록 반환 (메뉴용)
// ═══════════════════════════════════════
export function getCategories(): string[] {
  const data = faqData as FaqItem[];
  const cats = Array.from(new Set(data.map(item => item.category2)));
  return cats.filter(c => c).sort();
}

// ═══════════════════════════════════════
// 카테고리별 Q&A 목록 반환
// ═══════════════════════════════════════
export function getFaqByCategory(category: string): FaqItem[] {
  const data = faqData as FaqItem[];
  return data.filter(item => 
    item.category2 === category || item.category3 === category
  );
}
