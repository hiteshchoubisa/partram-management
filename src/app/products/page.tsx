import ManagementLayout from "../../components/ManagementLayout";
import ProductsTable from "./ProductsTable";

export const metadata = {
  title: "Products - Patram Management",
};

export default function ProductsPage() {
  return (
    <ManagementLayout title="Products">
      <ProductsTable />
    </ManagementLayout>
  );
}