# 🤖 LG전자 구독 상담 챗봇

카카오톡 오픈빌더 스킬 서버 — 키워드 매칭 방식 (AI 비용 0원)

## 📁 파일 구조

```
lg-subscription-chatbot/
├── app/
│   ├── api/
│   │   └── chatbot/
│   │       └── route.ts      ← 메인 API (오픈빌더 스킬)
│   ├── layout.tsx
│   └── page.tsx
├── data/
│   └── faq.json               ← 709개 Q&A 데이터
├── lib/
│   └── search.ts              ← 키워드 매칭 검색 엔진
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## 🚀 배포 방법

### 1. GitHub에 올리기
1. GitHub에서 새 Repository 생성 (이름: `lg-subscription-chatbot`)
2. 이 폴더의 모든 파일을 업로드

### 2. Vercel에 배포
1. vercel.com 접속 → Import Project → GitHub 레포 선택
2. 자동으로 Next.js 감지 → Deploy 클릭
3. 배포 완료 후 URL 확인 (예: `https://lg-subscription-chatbot.vercel.app`)

### 3. 카카오 오픈빌더 설정
1. chatbot.kakao.com 접속
2. 스킬 → 생성 → URL에 `https://내도메인.vercel.app/api/chatbot` 입력
3. 시나리오 → 폴백 블록 → 스킬 연결
4. 배포

## 📊 데이터 수정 방법

`data/faq.json` 파일만 수정하면 됩니다!
GitHub에서 직접 수정 → Vercel이 자동 재배포됩니다.

## 🔍 검색 방식

- 정확 매칭: 질문과 완전 일치 (최고 점수)
- 부분 매칭: 질문 텍스트 포함 여부
- 키워드 매칭: 불용어 제거 후 핵심 키워드 검색
- 동의어 매칭: "롯데카드" = "롯데제휴카드" 등
- 후보 제안: 매칭 실패 시 비슷한 후보를 버튼으로 제안
