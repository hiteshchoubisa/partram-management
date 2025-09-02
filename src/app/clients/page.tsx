import ManagementLayout from "../../components/ManagementLayout";
import ClientsTable from "./ClientsTable";

export default function ClientsPage() {
  return (
    <ManagementLayout title="Clients">
      <ClientsTable />
    </ManagementLayout>
  );
}
