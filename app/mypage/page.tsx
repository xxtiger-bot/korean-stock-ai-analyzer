import { MyPagePageClient } from "@/components/mypage-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MyPage() {
  return <MyPagePageClient />;
}
