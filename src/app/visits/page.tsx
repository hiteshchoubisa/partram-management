import ManagementLayout from "../../components/ManagementLayout";
import VisitsTable from "./VisitsTable";

export default function VisitsPage() {
  return (
    <ManagementLayout title="Visits">
      <VisitsTable />
    </ManagementLayout>
  );
}