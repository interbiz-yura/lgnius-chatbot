export default function Home() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🤖 LG 구독 챗봇 API</h1>
      <p style={{ color: '#666', marginTop: '10px' }}>
        카카오 오픈빌더 스킬 서버가 정상 작동 중입니다.
      </p>
      <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
        <p><strong>API 엔드포인트:</strong></p>
        <code style={{ background: '#e0e0e0', padding: '4px 8px', borderRadius: '4px' }}>
          POST /api/chatbot
        </code>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
          이 URL을 카카오 오픈빌더 스킬에 등록하세요.
        </p>
      </div>
    </div>
  );
}
