"use client";
import ManagementLayout from "../../components/ManagementLayout";

import UsersTable from "./UsersTable";

export default function UsersPage() {
  return ( <ManagementLayout title="Visits" subtitle="Track client visits and outcomes">
  <UsersTable />
</ManagementLayout>
  );
}