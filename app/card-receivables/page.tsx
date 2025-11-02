import { CardReceivables } from "@/components/card-receivables"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function CardReceivablesPage() {
  return (
    <AuthenticatedLayout>
      <CardReceivables />
    </AuthenticatedLayout>
  )
}
