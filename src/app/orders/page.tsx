import ManagementLayout from "../../components/ManagementLayout";
import OrdersTable from "./OrdersTable";

export default function OrdersPage() {
  return (
    <ManagementLayout title="Orders">
      <OrdersTable />
    </ManagementLayout>
  );
}