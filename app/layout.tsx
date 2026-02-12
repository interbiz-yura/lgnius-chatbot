export const metadata = {
  title: 'LG 구독 챗봇 API',
  description: '카카오 오픈빌더 스킬 서버',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
