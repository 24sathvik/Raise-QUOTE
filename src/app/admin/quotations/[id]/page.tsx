import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminQuotationByIdPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (params?.id) {
    redirect(`/?edit=${encodeURIComponent(params.id)}`)
  }
  redirect('/admin/quotations')
}
