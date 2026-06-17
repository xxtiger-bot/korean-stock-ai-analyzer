export function isAdminPagesEnabled() {
  return (
    process.env.ENABLE_ADMIN_PAGES === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_PAGES === "true"
  );
}

export function getAdminDisabledCopy() {
  return {
    title: "관리자 페이지가 비활성화되었습니다.",
    description: "운영자 전용 기능입니다."
  };
}
