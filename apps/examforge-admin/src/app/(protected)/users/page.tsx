import { Suspense } from "react";
import { UsersPage } from "@/features/admin-management/pages/users.page";
export default function Page() {
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
