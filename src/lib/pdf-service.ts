import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface PDFData {
  quotation: any
  items: any[]
  settings: any
  user: any
  selectedTerms?: { title: string; text: string }[]
  currency?: 'INR' | 'USD'
  validityData?: { validityDate?: string; validityDays?: number }
}

export const generateQuotationPDF = async ({ quotation, items, settings, user, selectedTerms, currency = 'INR', validityData }: PDFData) => {

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const footerHeight = 20 // Space reserved for footer
  const contentBottomLimit = pageHeight - footerHeight - 5

  const currencySymbol = currency === 'INR' ? 'Rs.' : '$'
  const currencyLabel = currency === 'INR' ? 'INR' : 'USD'

  // Helper to draw border (used on every new page)
  const drawPageBorder = () => {
    // Outer Blue Border
    doc.setDrawColor(0, 82, 156)
    doc.setLineWidth(1.2)
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10)

    // Inner Orange Border
    doc.setDrawColor(255, 102, 0)
    doc.setLineWidth(0.8)
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14)

    // Footer contact box
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margin + 10, pageHeight - 20, pageWidth - (margin * 2) - 20, 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.text("Write us: info@raiselabequip.com / sales@raiselabequip.com | Contact: +91 91777 70365", pageWidth / 2, pageHeight - 14.5, { align: "center" })
  }

  // Helper to draw header (used on every new page)
  const drawHeader = (logoBase64: string) => {
    // Logo on top-left
    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", margin, 12, 70, 25)
    }

    // Address on top-right
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0, 82, 156) // Raise Blue
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

  // Pre-load quotation logo
  let logoBase64 = ""
  try {
    logoBase64 = await getBase64ImageFromURL('/quotation-logo.jpg')
  } catch (e) {
    console.warn("Could not load quotation logo", e)
  }

  // Pre-load item images
  const itemImages: Record<string, { base64: string; isWide: boolean; width: number; height: number }> = {}
  const imagePromises = items
    .filter(item => item.image_url)
    .map(async (item) => {
      try {
        const { base64, width, height } = await getBase64ImageWithDimensions(item.image_url!)
        const isWide = width > height * 1.3
        itemImages[item.id] = { base64, isWide, width, height }
      } catch (e) {
        console.warn(`Could not load item image for ${item.id}`, e)
      }
    })

  await Promise.all(imagePromises)

  // -- Start Generating Pages --
  drawPageBorder()
  drawHeader(logoBase64)

  let currentY = 50
  let isFirstPage = true

  // Helper function to check if we need a new page
  const checkAddPage = (neededHeight: number) => {
    if (currentY + neededHeight > contentBottomLimit - 10 && currentY >= 70) {
      doc.addPage()
      drawPageBorder()
      drawHeader(logoBase64)
      currentY = 50 // Reset Y position for new page
      return true
    }
    return false
  }

  // Helper: estimate total height of the features + image block (wide format)
  const estimateWideBlockHeight = (imageData: { base64: string; width: number; height: number } | undefined, features: string[]): number => {
    let height = 0
    if (imageData?.base64) {
      const maxWidth = pageWidth - (margin * 2)
      const maxHeight = 70
      const ratio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height)
      height += imageData.height * ratio + 8 // exactly 8mm gap
    }
    height += 16 // "FEATURES:" header + spacing
    doc.setFontSize(9)
    features.forEach((f: string) => {
      const splitFeature = doc.splitTextToSize(f, pageWidth - (margin * 2) - 10)
      height += splitFeature.length * 4.5
    })
    height += 5 // trailing space
    return height
  }

  // Helper: estimate commercial table height
  const estimateCommercialTableHeight = (descContent: string, addons: any[]): number => {
    const descColWidth = pageWidth - (margin * 2) - 15 - 15 - 50 // minus s.no, qty, price cols
    doc.setFontSize(10)
    const descLines = doc.splitTextToSize(descContent, descColWidth).length
    const rowHeight = Math.max(descLines * 5 + 8, 15)
    return 10 + rowHeight + 20 // header + row + padding buffer
  }

  items.forEach((item, index) => {
    if (index > 0) {
      doc.addPage()
      drawPageBorder()
      drawHeader(logoBase64)
      currentY = 50
    }

    // "To" block - ONLY on first page
    if (isFirstPage) {
      const validityDate = validityData?.validityDate
        ? new Date(validityData.validityDate)
        : (quotation.validity_date
          ? new Date(quotation.validity_date)
          : new Date(quotation.created_at || Date.now()));

      if (isNaN(validityDate.getTime())) {
        const d = new Date(quotation.created_at || Date.now())
        d.setDate(d.getDate() + 30)
        validityDate.setTime(d.getTime())
      }

      const toAddress = `To\n${quotation.customer_name}${quotation.customer_address ? '\n' + quotation.customer_address : ''}`;
      const quoteNo = quotation.quotation_number;
      const dateStr = new Date(quotation.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const validStr = validityDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

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

    // Technical & Commercial Offer Title
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

    // Description section
    checkAddPage(20)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Description:", margin, currentY)
    currentY += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    const splitDesc = doc.splitTextToSize(item.description || "", pageWidth - (margin * 2))

    if (currentY + (splitDesc.length * 5) > contentBottomLimit - 10 && currentY > 70) {
      doc.addPage();
      drawPageBorder();
      drawHeader(logoBase64);
      currentY = 50;
    }
    doc.text(splitDesc, margin, currentY)
    currentY += (splitDesc.length * 4.5) + 5

    const imageData = itemImages[item.id]
    const imageFormat = item.image_format || 'wide'
    const features = item.features && item.features.length > 0 ? item.features : [
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

    // --- FORMAT 1: WIDE (Image BELOW Description, Then Features) ---
    // FORMAT 1: WIDE
    if (imageFormat === 'wide') {

      // Check ONLY if the image fits — not image + all features combined
      if (imageData?.base64) {
        const maxWidth = pageWidth - (margin * 2) - 10
        const maxHeight = 70
        const ratio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height)
        const imgHeight = imageData.height * ratio

        // Only add new page if image genuinely doesn't fit AND we're not near the top
        if (currentY + imgHeight > contentBottomLimit - 10 && currentY > 70) {
          doc.addPage()
          drawPageBorder()
          drawHeader(logoBase64)
          currentY = 50
        }

        const newWidth = imageData.width * ratio
        const x = (pageWidth - newWidth) / 2
        doc.addImage(imageData.base64, "PNG", x, currentY, newWidth, imgHeight)
        currentY += imgHeight + 8
      }

      // Features flow naturally with per-bullet page checks
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("FEATURES:", margin, currentY)
      currentY += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      features.forEach((f: string) => {
        const splitFeature = doc.splitTextToSize(f, pageWidth - (margin * 2) - 10)
        const featureHeight = splitFeature.length * 4.5
        checkAddPage(featureHeight + 2)
        doc.text("•", margin + 3, currentY)
        doc.text(splitFeature, margin + 8, currentY)
        currentY += featureHeight
      })
      currentY += 5
    }

    // --- FORMAT 2: TALL (Features Left, Image Right) ---
    else {
      checkAddPage(25) // Basic space for section trigger check

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("FEATURES:", margin, currentY)
      currentY += 6

      const featureStartY = currentY
      const contentWidth = pageWidth - (margin * 2)
      const featureWidth = contentWidth * 0.55

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      // Calculate features block height first for pagination check
      let featuresBlockHeight = 0
      features.forEach((f: string) => {
        const split = doc.splitTextToSize(f, featureWidth - 5)
        featuresBlockHeight += split.length * 4.5
      })

      // Try image height as well to wrap appropriately
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

      // Re-assign start Y in case checkAddPage jumped to next page
      const currentFeatureStartY = currentY

      features.forEach((f: string) => {
        doc.text("•", margin + 3, currentY)
        const splitFeature = doc.splitTextToSize(f, featureWidth - 5)
        doc.text(splitFeature, margin + 8, currentY)
        currentY += splitFeature.length * 4.5
      })

      const featuresEndY = currentY;

      let imageEndY = currentFeatureStartY;
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

    // Specification Section
    if (item.specs && item.specs.length > 0) {
      checkAddPage(20)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Specifications:", margin, currentY)
      currentY += 6
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      item.specs.forEach((s: { key: string; value: string }) => {
        checkAddPage(6)

        doc.text("•", margin + 3, currentY)
        doc.setFont("helvetica", "bold")
        doc.text(s.key, margin + 8, currentY)
        doc.setFont("helvetica", "normal")
        doc.text(s.value.startsWith(":") ? s.value : `: ${s.value}`, margin + 55, currentY)
        currentY += 5
      })
      currentY += 8
    }

    // Commercial Offer Table
    // FIX: Estimate table height properly and move to new page if it won't fit,
    // so the table never gets split and never overlaps the footer.
    const unitPrice = item.price + (item.selectedAddons?.reduce((s: number, a: any) => s + a.price, 0) || 0)

    let descContent = item.name
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      descContent += "\n\nStandard Accessories:"
      item.selectedAddons.forEach((addon: any) => {
        descContent += `\n• ${addon.name}`
      })
    }

    // Estimate the table row height based on description content lines
    const descColWidth = pageWidth - (margin * 2) - 15 - 15 - 50
    doc.setFontSize(10)
    const descLineCount = doc.splitTextToSize(descContent, descColWidth).length
    const estimatedRowHeight = Math.max(descLineCount * 5 + 8, 15)
    const estimatedTableHeight = 14 + estimatedRowHeight + 6 // header + row + buffer

    // "Commercial Offer:" label height (11) + table itself
    const totalCommercialHeight = 17 + estimatedTableHeight

    // Always start commercial offer on a new page if it doesn't fully fit
    checkAddPage(totalCommercialHeight)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Commercial Offer:", margin, currentY)
    currentY += 6

    autoTable(doc, {
      startY: currentY,
      head: [["S.No", "Description", "Qty", `Price (${currencyLabel})`]],
      body: [[
        { content: "01", styles: { halign: "center", valign: "middle", fontSize: 10 } },
        { content: descContent, styles: { halign: "left", valign: "middle", fontSize: 10, cellPadding: 4 } },
        { content: "1", styles: { halign: "center", valign: "middle", fontSize: 10 } },
        { content: `${currencySymbol} ${unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/-`, styles: { halign: "right", fontStyle: "bold", valign: "middle", fontSize: 11, cellPadding: 4 } }
      ]],
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
      // FIX: Set bottom margin so autoTable never draws into the footer area
      margin: { left: margin, right: margin, bottom: footerHeight + 8 }
    })

    currentY = (doc as any).lastAutoTable.finalY + 10
  })

  // Terms & Conditions Page
  doc.addPage()
  drawPageBorder()
  drawHeader(logoBase64)
  currentY = 55

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

  const termsToDisplay = selectedTerms && selectedTerms.length > 0 ? selectedTerms : defaultTerms;

  termsToDisplay.forEach((t) => {
    const cleanTitle = t.title.replace(/^\d+\.\s*/, '')
    const fullText = `${cleanTitle}: ${t.text}`

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    const splitT = doc.splitTextToSize(fullText, pageWidth - (margin * 2) - 8)

    // Calculate actual rendered height
    const lineHeight = 5
    const termHeight = splitT.length * lineHeight

    // Add new page if it won't fit
    checkAddPage(termHeight + 6)

    doc.text("•", margin, currentY)
    doc.text(splitT, margin + 5, currentY)

    // Advance by actual height + fixed equal gap after every bullet
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

  // --- Final Pass: Add correct page numbers to ALL pages ---
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" })
  }

  const pdfName = `${quotation.quotation_number}_Quotation.pdf`
  doc.save(pdfName)

  return doc.output("blob")
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