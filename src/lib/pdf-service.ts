import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface PDFData {
  quotation: any
  items: any[]
  settings: any
  user: any
  selectedTerms?: { title: string; text: string }[]
  currency?: 'INR' | 'USD'
  validityData?: { validityDate?: string; validityDays?: number; issueDate?: string }
  note?: string
}

export const generateQuotationPDF = async ({
  quotation,
  items,
  settings,
  user,
  selectedTerms,
  currency = 'INR',
  validityData,
  note
}: PDFData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const footerHeight = 20
  const contentBottomLimit = pageHeight - footerHeight - 5

  const currencySymbol = currency === 'INR' ? 'Rs.' : '$'
  const currencyLabel = currency === 'INR' ? 'INR' : 'USD'
  const locale = currency === 'USD' ? 'en-US' : 'en-IN'
  const fractionDigits = currency === 'USD' ? 2 : 0

  const drawPageBorder = () => {
    doc.setDrawColor(0, 82, 156)
    doc.setLineWidth(1.2)
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10)
    doc.setDrawColor(255, 102, 0)
    doc.setLineWidth(0.8)
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margin + 10, pageHeight - 20, pageWidth - (margin * 2) - 20, 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.text(
      "Write us: info@raiselabequip.com / sales@raiselabequip.com | Contact: +91 91777 70365",
      pageWidth / 2,
      pageHeight - 14.5,
      { align: "center" }
    )
  }

  const drawHeader = (logoBase64: string) => {
    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", margin, 12, 70, 25)
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0, 82, 156)
    doc.text("RAISE LAB EQUIPMENT", pageWidth - margin, 18, { align: "right" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60)
    const address = "C-6, B1, Industrial Park, Moula Ali,\nHyderabad, Secunderabad,\nTelangana 500040"
    doc.text(address, pageWidth - margin, 24, { align: "right", lineHeightFactor: 1.4 })
    doc.setDrawColor(0, 82, 156)
    doc.setLineWidth(0.5)
    doc.line(margin, 42, pageWidth - margin, 42)
    doc.setDrawColor(255, 102, 0)
    doc.setLineWidth(0.3)
    doc.line(margin, 43, pageWidth - margin, 43)
  }

  let logoBase64 = ""
  try {
    logoBase64 = await getBase64ImageFromURL('/quotation-logo.jpg')
  } catch (e) {
    console.warn("Could not load quotation logo", e)
  }

  const itemImages: Record<string, { base64: string; width: number; height: number }> = {}
  const imagePromises = items
    .filter(item => item.image_url)
    .map(async (item) => {
      try {
        const data = await getBase64ImageWithDimensions(item.image_url!)
        itemImages[item.id] = data
      } catch (e) {
        console.warn(`Could not load item image for ${item.id}`, e)
      }
    })

  await Promise.all(imagePromises)

  drawPageBorder()
  drawHeader(logoBase64)

  let currentY = 50
  let isFirstPage = true

  const checkAddPage = (neededHeight: number) => {
    if (currentY + neededHeight > contentBottomLimit - 10 && currentY >= 70) {
      doc.addPage()
      drawPageBorder()
      drawHeader(logoBase64)
      currentY = 50
      return true
    }
    return false
  }

  items.forEach((item, index) => {
    if (index > 0) {
      doc.addPage()
      drawPageBorder()
      drawHeader(logoBase64)
      currentY = 50
    }

    if (isFirstPage) {
      const validityDate = validityData?.validityDate
        ? new Date(validityData.validityDate)
        : (quotation.validity_date
          ? new Date(quotation.validity_date)
          : new Date(quotation.created_at || Date.now()))

      if (isNaN(validityDate.getTime())) {
        const d = new Date(quotation.created_at || Date.now())
        d.setDate(d.getDate() + 30)
        validityDate.setTime(d.getTime())
      }

      const toAddress = `To\n${quotation.customer_name || ''}${quotation.customer_company ? '\n' + quotation.customer_company : ''}${quotation.customer_address ? '\n' + quotation.customer_address : ''}`
      const rawNumber = (quotation.quotation_number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
      const revisionNum = quotation.revision_number ? Number(quotation.revision_number) : 0
      const quoteNo = revisionNum > 0 ? `${rawNumber}(${revisionNum})` : rawNumber

      const issueDateRaw = validityData?.issueDate || quotation.created_at || Date.now()
      const issueDateObj = new Date(issueDateRaw)
      const dateStr = !isNaN(issueDateObj.getTime())
        ? issueDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
      const validStr = validityDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')

      autoTable(doc, {
        startY: currentY,
        body: [[
          {
            content: toAddress,
            styles: { fontStyle: "bold", fontSize: 10, valign: "top", cellPadding: 5 }
          },
          {
            content: `Quote No :  ${quoteNo}\nDate         :  ${dateStr}\nValidity    :  ${validStr}`,
            styles: { fontSize: 10, valign: "middle", cellPadding: 6, fontStyle: "bold" }
          }
        ]],
        theme: "grid",
        bodyStyles: {
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          minCellHeight: 30,
        },
        columnStyles: {
          0: { cellWidth: pageWidth - (margin * 2) - 80, halign: "left" },
          1: { cellWidth: 80, halign: "left" }
        },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - (margin * 2)
      })
      currentY = (doc as any).lastAutoTable.finalY + 12
      isFirstPage = false
    }

    checkAddPage(20)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(0, 82, 156)
    doc.text("Technical & Commercial Offer", pageWidth / 2, currentY, { align: "center" })
    currentY += 7
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`For ${item.name}`, pageWidth / 2, currentY, { align: "center" })
    currentY += 12

    // Description section with normalized text flow
    const rawDesc = item.description || ""
    const paragraphs = rawDesc.split(/\n\s*\n/)
    const normalizedDesc = paragraphs
      .map((p: string) => p.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n')

    checkAddPage(20)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Description:", margin, currentY)
    currentY += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const splitDesc = doc.splitTextToSize(normalizedDesc, pageWidth - (margin * 2))

    if (currentY + (splitDesc.length * 5) > contentBottomLimit - 10 && currentY > 70) {
      doc.addPage()
      drawPageBorder()
      drawHeader(logoBase64)
      currentY = 50
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Description (Contd.):", margin, currentY)
      currentY += 6
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
    }

    doc.text(splitDesc, margin, currentY)
    currentY += (splitDesc.length * 4.5) + 6

    // Image & Features rendering
    const imageData = itemImages[item.id]
    const imageFormat = item.image_format || 'tall'
    const features: string[] = item.features && item.features.length > 0 ? item.features : [
      "Accurate method for determining the strength of antibiotic material",
      "Microprocessor based design",
      "Average of Vertical diameter & Horizontal diameter of inhibited zone",
      "Magnified image of inhibited zone is clearly visible on the prism Screen",
      "Calibration facility with certified coins",
      "Inbuilt thermal printer",
      "Parallel printer port & RS 232 port for taking Test Printer Report",
      "Password protection for Real Time Clock",
      "Membrane Keypad for easy operation",
      "Complies to cGMP (MOC-stainless steel -304 & Stainless Steel-316)",
      "IQ/OQ Documentation"
    ]

    if (imageFormat === 'wide') {
      if (imageData?.base64) {
        const maxWidth = pageWidth - (margin * 2) - 20
        const maxHeight = 50
        const ratio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height)
        const imgWidth = imageData.width * ratio
        const imgHeight = imageData.height * ratio

        if (currentY + imgHeight > contentBottomLimit - 10 && currentY > 70) {
          doc.addPage()
          drawPageBorder()
          drawHeader(logoBase64)
          currentY = 50
        }

        const x = (pageWidth - imgWidth) / 2
        doc.addImage(imageData.base64, "JPEG", x, currentY, imgWidth, imgHeight)
        currentY += imgHeight + 8
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("FEATURES:", margin, currentY)
      currentY += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      features.forEach((f: string) => {
        const cleanFeature = f.replace(/^[•\-\*]\s*/, '').trim()
        const splitFeature = doc.splitTextToSize(cleanFeature, pageWidth - (margin * 2) - 10)
        const featureHeight = splitFeature.length * 4.5
        checkAddPage(featureHeight + 2)
        doc.text("•", margin + 3, currentY)
        doc.text(splitFeature, margin + 8, currentY)
        currentY += featureHeight
      })
      currentY += 5
    } else {
      checkAddPage(25)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("FEATURES:", margin, currentY)
      currentY += 6

      const contentWidth = pageWidth - (margin * 2)
      const featureWidth = contentWidth * 0.55

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      let featuresBlockHeight = 0
      features.forEach((f: string) => {
        const cleanFeature = f.replace(/^[•\-\*]\s*/, '').trim()
        const split = doc.splitTextToSize(cleanFeature, featureWidth - 5)
        featuresBlockHeight += split.length * 4.5
      })

      let maxImgHeight = 0
      if (imageData?.base64) {
        const maxImgWidth = contentWidth * 0.40
        const maxHeightConstraint = 80
        const ratio = Math.min(maxImgWidth / imageData.width, maxHeightConstraint / imageData.height)
        maxImgHeight = imageData.height * ratio
      }

      const totalTallHeight = Math.max(featuresBlockHeight, maxImgHeight) + 10
      if (totalTallHeight <= contentBottomLimit - 50) {
        checkAddPage(totalTallHeight)
      }

      const currentFeatureStartY = currentY

      features.forEach((f: string) => {
        const cleanFeature = f.replace(/^[•\-\*]\s*/, '').trim()
        doc.text("•", margin + 3, currentY)
        const splitFeature = doc.splitTextToSize(cleanFeature, featureWidth - 5)
        doc.text(splitFeature, margin + 8, currentY)
        currentY += splitFeature.length * 4.5
      })

      const featuresEndY = currentY

      let imageEndY = currentFeatureStartY
      if (imageData?.base64) {
        const maxImgWidth = contentWidth * 0.40
        const maxHeightConstraint = 80
        const ratio = Math.min(maxImgWidth / imageData.width, maxHeightConstraint / imageData.height)
        const newWidth = imageData.width * ratio
        const newHeight = imageData.height * ratio
        const imgX = pageWidth - margin - newWidth
        doc.addImage(imageData.base64, "JPEG", imgX, currentFeatureStartY, newWidth, newHeight)
        imageEndY = currentFeatureStartY + newHeight
      }

      currentY = Math.max(featuresEndY, imageEndY) + 8
    }

    // Specifications Section with Dynamic Colon Alignment and Margin Overflow Prevention
    const rawSpecs = item.specs
    let specList: { key: string; value: string }[] = []
    if (Array.isArray(rawSpecs)) {
      specList = rawSpecs.map((s: any) => {
        if (typeof s === 'string') {
          const parts = s.split(':')
          return { key: parts[0]?.trim() || '', value: parts.slice(1).join(':')?.trim() || '' }
        }
        return { key: s.key || s.name || '', value: s.value || '' }
      }).filter(s => s.key || s.value)
    } else if (rawSpecs && typeof rawSpecs === 'object') {
      specList = Object.entries(rawSpecs).map(([k, v]) => ({ key: k, value: String(v) })).filter(s => s.key || s.value)
    }

    if (specList.length > 0) {
      checkAddPage(20)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(0)
      doc.text("Specifications:", margin, currentY)
      currentY += 6
      doc.setFontSize(9)

      // Calculate colon position dynamically based on longest spec key
      let colonX = margin + 55
      doc.setFont("helvetica", "bold")
      specList.forEach((s) => {
        const cleanK = (s.key || '').replace(/:\s*$/, '').trim()
        const kWidth = doc.getTextWidth(cleanK)
        if (margin + 8 + kWidth + 4 > colonX) {
          colonX = Math.min(margin + 8 + kWidth + 4, margin + 70)
        }
      })

      const keyColWidth = colonX - (margin + 8) - 2
      const valueStartX = colonX + 3.5
      const maxValueWidth = (pageWidth - margin) - valueStartX

      specList.forEach((s) => {
        const cleanKey = (s.key || '').replace(/:\s*$/, '').trim()
        const cleanValue = (s.value || '').replace(/^:\s*/, '').trim()

        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        const splitKey = doc.splitTextToSize(cleanKey, keyColWidth)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        const splitValue = doc.splitTextToSize(cleanValue, maxValueWidth)

        const lineCount = Math.max(splitKey.length, splitValue.length, 1)
        const itemHeight = lineCount * 4.5

        checkAddPage(itemHeight + 2)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(0)
        doc.text("•", margin + 3, currentY)

        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.text(splitKey, margin + 8, currentY)

        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text(":", colonX, currentY)
        doc.text(splitValue, valueStartX, currentY)

        currentY += itemHeight + 1.5
      })
      currentY += 6
    }

    // Commercial Offer Table
    const unitPrice = item.price + (item.selectedAddons?.reduce((s: number, a: any) => s + a.price, 0) || 0)

    let descContent = item.name
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      descContent += "\n\nStandard Accessories:"
      item.selectedAddons.forEach((addon: any) => {
        descContent += `\n• ${addon.name}`
      })
    }

    const descColWidth = pageWidth - (margin * 2) - 15 - 15 - 50
    doc.setFontSize(10)
    const descLineCount = doc.splitTextToSize(descContent, descColWidth).length
    const estimatedRowHeight = Math.max(descLineCount * 5 + 8, 15)
    const estimatedTableHeight = 14 + estimatedRowHeight + 6
    const totalCommercialHeight = 17 + estimatedTableHeight

    checkAddPage(totalCommercialHeight)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Commercial Offer:", margin, currentY)
    currentY += 6

    const tableBody: any[] = []

    // Primary item row
    tableBody.push([
      { content: "01", styles: { halign: "center", valign: "middle", fontSize: 10 } },
      { content: descContent, styles: { halign: "left", valign: "middle", fontSize: 10, cellPadding: 4 } },
      { content: "1", styles: { halign: "center", valign: "middle", fontSize: 10 } },
      { content: `${currencySymbol} ${unitPrice.toLocaleString(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 })}/-`, styles: { halign: "right", fontStyle: "bold", valign: "middle", fontSize: 11, cellPadding: 4 } }
    ])

    // Extra line items with serial numbers and bold styling
    if (item.selectedLineItems && item.selectedLineItems.length > 0) {
      item.selectedLineItems.forEach((li: any, liIndex: number) => {
        const serialNo = String(liIndex + 2).padStart(2, '0')
        tableBody.push([
          { content: serialNo, styles: { halign: "center", valign: "middle", fontSize: 10, fontStyle: "bold" } },
          { content: li.description, styles: { halign: "left", valign: "middle", fontSize: 10, fontStyle: "bold", cellPadding: 4 } },
          { content: "1", styles: { halign: "center", valign: "middle", fontSize: 10, fontStyle: "bold" } },
          { content: li.price > 0 ? `${currencySymbol} ${Number(li.price).toLocaleString(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 })}/-` : 'Included', styles: { halign: "right", fontStyle: "bold", valign: "middle", fontSize: 10 } }
        ])
      })
    }

    autoTable(doc, {
      startY: currentY,
      head: [["S.No", "Description", "Qty", `Price (${currencyLabel})`]],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [0, 82, 156],
        textColor: [255, 255, 255],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        fontStyle: "bold",
        halign: "center" as "center",
        fontSize: 10
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 50, halign: "right" }
      },
      margin: { left: margin, right: margin, bottom: footerHeight + 8 }
    })

    currentY = (doc as any).lastAutoTable.finalY + 10
  })

  // Terms & Conditions Page
  doc.addPage()
  drawPageBorder()
  drawHeader(logoBase64)
  currentY = 55

  if (note && note.trim() !== '') {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Note:", margin, currentY)
    currentY += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const splitNote = doc.splitTextToSize(note.trim(), pageWidth - (margin * 2))
    
    if (currentY + (splitNote.length * 5) > contentBottomLimit - 10) {
      doc.addPage()
      drawPageBorder()
      drawHeader(logoBase64)
      currentY = 50
    }

    doc.text(splitNote, margin, currentY)
    currentY += (splitNote.length * 5) + 10
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Terms And Conditions:", margin, currentY)
  currentY += 10

  const defaultTerms = [
    { title: "Packaging & Forwarding", text: "Extra As Applicable" },
    { title: "Freight", text: "To Pay / Extra as applicable" },
    { title: "DELIVERY", text: "We deliver the order in 3-4 Weeks from the date of receipt of purchase order" },
    { title: "INSTALLATION", text: "Fees extra as applicable" },
    { title: "PAYMENT", text: "100% payment at the time of proforma invoice prior to dispatch." },
    { title: "WARRANTY", text: "One year warranty from the date of dispatch" },
    { title: "GOVERNING LAW", text: "These Terms and Conditions and any action related hereto shall be governed, controlled, interpreted and defined by and under the laws of the State of Telangana" },
    { title: "MODIFICATION", text: "Any modification of these Terms and Conditions shall be valid only if it is in writing and signed by the authorized representatives of both Supplier and Customer." }
  ]

  const termsToDisplay = selectedTerms && selectedTerms.length > 0 ? selectedTerms : defaultTerms

  termsToDisplay.forEach((t) => {
    const cleanTitle = t.title.replace(/^\d+\.\s*/, '')
    const fullText = `${cleanTitle}: ${t.text}`

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    const splitT = doc.splitTextToSize(fullText, pageWidth - (margin * 2) - 8)
    const lineHeight = 5
    const termHeight = splitT.length * lineHeight

    checkAddPage(termHeight + 6)

    doc.text("•", margin, currentY)
    doc.text(splitT, margin + 5, currentY)
    currentY += termHeight + 4
  })

  // Signatures
  checkAddPage(40)
  currentY += 15
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(`From ${settings?.company_name || "Raise Lab Equipment"}`, pageWidth - margin, currentY, { align: "right" })
  currentY += 6
  doc.text(user?.full_name?.toUpperCase() || "SALES TEAM", pageWidth - margin, currentY, { align: "right" })
  currentY += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  if (user?.phone) {
    doc.text(`Contact: ${user.phone}`, pageWidth - margin, currentY, { align: "right" })
  } else {
    doc.text("Contact: +91 91777 70365", pageWidth - margin, currentY, { align: "right" })
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  const rawNumber = (quotation.quotation_number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
  const revisionNum = quotation.revision_number ? Number(quotation.revision_number) : 0
  const pdfName = revisionNum > 0
    ? `${rawNumber}_Quotation(${revisionNum}).pdf`
    : `${rawNumber}_Quotation.pdf`

  // Direct programmatic anchor download ensuring 100% reliable .pdf extension across all browsers
  const pdfBlob = doc.output("blob")
  const blobWithMime = new Blob([pdfBlob], { type: "application/pdf" })
  
  if (typeof window !== 'undefined') {
    const blobUrl = window.URL.createObjectURL(blobWithMime)
    const downloadLink = document.createElement("a")
    downloadLink.href = blobUrl
    downloadLink.download = pdfName
    document.body.appendChild(downloadLink)
    downloadLink.click()
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl)
      if (downloadLink.parentNode) {
        document.body.removeChild(downloadLink)
      }
    }, 1500)
  }

  return blobWithMime
}

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.setAttribute("crossOrigin", "anonymous")
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const maxWidth = 800
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      const dataURL = canvas.toDataURL("image/jpeg", 0.85)
      resolve(dataURL)
    }
    img.onerror = (error) => {
      reject(error)
    }
    img.src = url
  })
}

const getBase64ImageWithDimensions = (url: string): Promise<{ base64: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.setAttribute("crossOrigin", "anonymous")
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const maxWidth = 800
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      const dataURL = canvas.toDataURL("image/jpeg", 0.85)
      resolve({ base64: dataURL, width: img.width, height: img.height })
    }
    img.onerror = (error) => {
      reject(error)
    }
    img.src = url
  })
}