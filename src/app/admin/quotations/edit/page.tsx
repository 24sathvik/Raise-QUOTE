import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminQuotationEditRedirectPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const id = searchParams.edit || searchParams.id || searchParams.quotationId || searchParams.editId
  if (id) {
    redirect(`/?edit=${encodeURIComponent(id)}`)
  }
  redirect('/admin/quotations')
}
