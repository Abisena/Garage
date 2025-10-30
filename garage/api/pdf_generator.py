import frappe
from frappe import _
import pdfkit
from jinja2 import Template
import os
from datetime import datetime

@frappe.whitelist()
def generate_service_estimate_pdf(order_id):
    """Generate PDF estimasi service dari template"""
    
    try:
        # Get order data
        order = frappe.get_doc("Garage Service Order", order_id)
        
        # Format currency helper
        def format_currency(value):
            try:
                return f"Rp {int(value):,}".replace(',', '.')
            except (ValueError, TypeError):
                return "Rp 0"
        
        # Safe get attribute helper
        def safe_get(obj, *attrs):
            """Try multiple attribute names, return first non-empty or empty string"""
            for attr in attrs:
                val = getattr(obj, attr, None)
                if val:
                    return val
            return ''
        
        # Get data (sama seperti sebelumnya)
        customer_name = safe_get(order, 'customer_name', 'name_customer')
        vehicle_plate = safe_get(order, 'vehicle_plate', 'license_plate', 'plate_number')
        vehicle_brand = safe_get(order, 'vehicle_brand', 'brand', 'make')
        vehicle_model = safe_get(order, 'vehicle_model', 'model')
        
        customer_link = safe_get(order, 'customer', 'customer_id')
        if customer_link:
            try:
                customer_doc = frappe.get_doc("Garage Customer", customer_link)
                customer_name = safe_get(customer_doc, 'customer_name', 'name') or customer_name
            except:
                pass
        
        vehicle_link = safe_get(order, 'vehicle', 'vehicle_id')
        if vehicle_link:
            try:
                vehicle_doc = frappe.get_doc("Garage Vehicle", vehicle_link)
                vehicle_plate = safe_get(vehicle_doc, 'license_plate', 'plate_number') or vehicle_plate
                vehicle_brand = safe_get(vehicle_doc, 'make', 'brand') or vehicle_brand
                vehicle_model = safe_get(vehicle_doc, 'model') or vehicle_model
            except:
                pass
        
        required_parts = []
        for attr_name in ['parts', 'required_parts', 'items', 'order_parts', 'service_parts']:
            parts_data = getattr(order, attr_name, None)
            if parts_data:
                required_parts = parts_data
                break
        
        total_parts = 0
        parts_list = []
        
        for part in required_parts:
            qty = 0
            for qty_attr in ['qty', 'quantity', 'amount_qty']:
                qty_val = getattr(part, qty_attr, None)
                if qty_val:
                    qty = float(qty_val)
                    break
            
            rate = 0
            for rate_attr in ['rate', 'unit_price', 'price', 'unit_rate']:
                rate_val = getattr(part, rate_attr, None)
                if rate_val:
                    rate = float(rate_val)
                    break
            
            amount = 0
            for amount_attr in ['amount', 'total', 'total_amount']:
                amount_val = getattr(part, amount_attr, None)
                if amount_val:
                    amount = float(amount_val)
                    break
            
            if amount == 0 and qty > 0 and rate > 0:
                amount = qty * rate
            
            total_parts += amount
            
            item_code = safe_get(part, 'item_code', 'part_code', 'code', 'sku')
            description = safe_get(part, 'description', 'item_name', 'part_name', 'name', 'item_description')
            uom = safe_get(part, 'uom', 'unit', 'unit_of_measure') or 'Unit'
            
            parts_list.append({
                'item_code': item_code or '-',
                'description': description or '-',
                'qty': qty,
                'uom': uom,
                'rate': rate,
                'amount': amount
            })
        
        service_fee = 0
        for fee_attr in ['estimated_service_fee', 'service_fee', 'labor_cost', 'service_charge']:
            fee_val = getattr(order, fee_attr, None)
            if fee_val:
                service_fee = float(fee_val)
                break
        
        dpp = 0
        for total_attr in ['total_estimated_amount', 'total_amount', 'grand_total', 'total']:
            total_val = getattr(order, total_attr, None)
            if total_val:
                dpp = float(total_val)
                break
        
        if dpp == 0:
            dpp = total_parts + service_fee
        
        ppn = dpp * 0.11
        pph = dpp * 0.025
        total_with_tax = dpp + ppn + pph
        
        notes = safe_get(order, 'notes', 'service_notes', 'inspection_summary', 'remarks', 'description') or '-'
        assigned_mechanic = safe_get(order, 'assigned_mechanic_name', 'mechanic_in_charge_name', 'assigned_mechanic', 'mechanic_name', 'technician_name') or '-'
        service_type = safe_get(order, 'service_order_type', 'service_type', 'order_type') or '-'
        priority = safe_get(order, 'priority', 'priority_level') or 'Normal'
        
        data = {
            'order_id': order.name,
            'date': datetime.now().strftime('%d %B %Y'),
            'customer_name': customer_name or '-',
            'vehicle_plate': vehicle_plate or '-',
            'vehicle_brand': vehicle_brand or '-',
            'vehicle_model': vehicle_model or '-',
            'assigned_mechanic': assigned_mechanic,
            'service_type': service_type,
            'priority': priority,
            'required_parts': parts_list,
            'total_parts': total_parts,
            'service_fee': service_fee,
            'dpp': dpp,
            'ppn': ppn,
            'pph': pph,
            'total': total_with_tax,
            'notes': notes,
            'format_currency': format_currency
        }
        
        # Load HTML template
        html_template = get_pdf_template()
        template = Template(html_template)
        html_content = template.render(**data)
        
        # PDF options
        pdf_options = {
            'page-size': 'A4',
            'margin-top': '20mm',
            'margin-right': '20mm',
            'margin-bottom': '20mm',
            'margin-left': '20mm',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None,
            'quiet': ''
        }
        
        # Create filename
        pdf_filename = f"Estimasi_Service_{order.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Get temp path for PDF generation
        import tempfile
        temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_pdf_path = temp_pdf.name
        temp_pdf.close()
        
        # Generate PDF
        try:
            pdfkit.from_string(html_content, temp_pdf_path, options=pdf_options)
            
            # Read PDF content
            with open(temp_pdf_path, 'rb') as f:
                pdf_content = f.read()
            
            # Delete temp file
            os.unlink(temp_pdf_path)
            
        except Exception as e:
            frappe.log_error(f"PDF generation error: {str(e)}", "PDF Generator")
            
            # Fallback: create HTML file instead
            html_filename = pdf_filename.replace('.pdf', '.html')
            
            # Save using Frappe File API
            file_doc = frappe.get_doc({
                'doctype': 'File',
                'file_name': html_filename,
                'is_private': 0,  # ← PUBLIC agar bisa di-download
                'content': html_content,
                'folder': 'Home',
                'attached_to_doctype': 'Garage Service Order',
                'attached_to_name': order.name
            })
            file_doc.save(ignore_permissions=True)
            frappe.db.commit()
            
            return {
                'success': True,
                'file_url': file_doc.file_url,
                'file_name': html_filename,
                'message': f'PDF generation failed, HTML saved: {str(e)}'
            }
        
        # Save PDF using Frappe File API
        file_doc = frappe.get_doc({
            'doctype': 'File',
            'file_name': pdf_filename,
            'is_private': 0,  # ← CRITICAL: PUBLIC agar bisa di-download
            'content': pdf_content,
            'folder': 'Home',
            'attached_to_doctype': 'Garage Service Order',
            'attached_to_name': order.name
        })
        file_doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            'success': True,
            'file_url': file_doc.file_url,
            'file_name': pdf_filename,
            'message': 'PDF generated successfully'
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PDF Generation Error")
        frappe.throw(_("Error generating PDF: {0}").format(str(e)))


def get_pdf_template():
    """HTML template matching the formal DOCX layout"""
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 15mm 20mm 15mm 20mm;
            size: A4;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
        }
        
        /* Header Section */
        .letterhead {
            border-bottom: 3px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .letterhead-content {
            display: table;
            width: 100%;
        }
        
        .letterhead-logo {
            display: table-cell;
            width: 80px;
            vertical-align: middle;
            padding-right: 15px;
        }
        
        .letterhead-logo img {
            width: 70px;
            height: 70px;
        }
        
        .letterhead-text {
            display: table-cell;
            vertical-align: middle;
        }
        
        .letterhead-text h1 {
            font-size: 18pt;
            font-weight: 700;
            color: #000;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .letterhead-text p {
            font-size: 9pt;
            line-height: 1.3;
            color: #333;
        }
        
        /* Document Title */
        .document-title {
            text-align: center;
            font-size: 14pt;
            font-weight: 700;
            text-transform: uppercase;
            margin: 25px 0 20px 0;
            letter-spacing: 2px;
        }
        
        .document-subtitle {
            text-align: center;
            font-size: 10pt;
            margin-bottom: 20px;
            color: #666;
        }
        
        /* Info Table */
        .info-table {
            width: 100%;
            margin-bottom: 20px;
            border-collapse: collapse;
        }
        
        .info-table td {
            padding: 6px 10px;
            font-size: 10pt;
            border: 1px solid #000;
        }
        
        .info-table .label {
            width: 35%;
            font-weight: 600;
            background: #f0f0f0;
        }
        
        .info-table .value {
            width: 65%;
        }
        
        /* Section Headers */
        .section-header {
            font-size: 11pt;
            font-weight: 700;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
        }
        
        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0 20px 0;
        }
        
        .items-table th {
            background: #333;
            color: #fff;
            padding: 8px 6px;
            font-size: 9pt;
            font-weight: 600;
            text-align: center;
            border: 1px solid #000;
            text-transform: uppercase;
        }
        
        .items-table td {
            padding: 6px;
            font-size: 9pt;
            border: 1px solid #000;
            text-align: center;
        }
        
        .items-table .text-left {
            text-align: left;
        }
        
        .items-table .text-right {
            text-align: right;
        }
        
        .items-table tbody tr:nth-child(even) {
            background: #fafafa;
        }
        
        /* Summary Table */
        .summary-section {
            margin-top: 20px;
            page-break-inside: avoid;
        }
        
        .summary-table {
            width: 100%;
            max-width: 450px;
            margin-left: auto;
            border-collapse: collapse;
        }
        
        .summary-table td {
            padding: 8px 12px;
            border: 1px solid #000;
            font-size: 10pt;
        }
        
        .summary-table .label-cell {
            width: 60%;
            font-weight: 600;
            background: #f0f0f0;
        }
        
        .summary-table .value-cell {
            width: 40%;
            text-align: right;
            font-weight: 600;
        }
        
        .summary-table .total-row td {
            background: #333;
            color: #fff;
            font-weight: 700;
            font-size: 11pt;
        }
        
        /* Notes Section */
        .notes-section {
            margin: 25px 0;
            padding: 12px;
            border: 1px solid #000;
            background: #fafafa;
        }
        
        .notes-section strong {
            display: block;
            font-size: 10pt;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .notes-section p {
            font-size: 9pt;
            line-height: 1.5;
        }
        
        /* Signature Section */
        .signature-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        
        .signature-grid {
            display: table;
            width: 100%;
            margin-top: 30px;
        }
        
        .signature-box {
            display: table-cell;
            width: 33.33%;
            text-align: center;
            padding: 0 10px;
        }
        
        .signature-label {
            font-size: 10pt;
            font-weight: 600;
            margin-bottom: 50px;
        }
        
        .signature-line {
            border-top: 1px solid #000;
            padding-top: 5px;
            font-size: 9pt;
        }
        
        .signature-name {
            font-weight: 600;
            margin-top: 3px;
        }
        
        /* Footer */
        .document-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #000;
            font-size: 8pt;
            text-align: center;
            color: #666;
        }
        
        /* Page Break Control */
        .page-break-avoid {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <!-- Letterhead -->
    <div class="letterhead">
        <div class="letterhead-content">
            <div class="letterhead-logo">
                <!-- Logo placeholder - bisa diganti dengan base64 image -->
                <div style="width: 70px; height: 70px; border: 2px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24pt; font-weight: bold; color: #333;">🔧</div>
            </div>
            <div class="letterhead-text">
                <h1>BENGKEL GARASI</h1>
                <p>Jalan Raya Industri No. 123, Kawasan Industri MM2100<br>
                Cikarang Barat, Bekasi 17520, Jawa Barat, Indonesia<br>
                Telp: (021) 8998-7654 | Email: service@bengkelgarasi.co.id | www.bengkelgarasi.co.id</p>
            </div>
        </div>
    </div>
    
    <!-- Document Title -->
    <div class="document-title">ESTIMASI BIAYA PERBAIKAN KENDARAAN</div>
    <div class="document-subtitle">No. Dokumen: {{ order_id }}</div>
    
    <!-- Customer & Vehicle Information -->
    <table class="info-table">
        <tr>
            <td class="label">Tanggal Estimasi</td>
            <td class="value">{{ date }}</td>
        </tr>
        <tr>
            <td class="label">Nama Pelanggan</td>
            <td class="value">{{ customer_name }}</td>
        </tr>
        <tr>
            <td class="label">Nomor Polisi</td>
            <td class="value">{{ vehicle_plate }}</td>
        </tr>
        <tr>
            <td class="label">Merk / Model Kendaraan</td>
            <td class="value">{{ vehicle_brand }} {{ vehicle_model }}</td>
        </tr>
        <tr>
            <td class="label">Jenis Pekerjaan</td>
            <td class="value">{{ service_type }}</td>
        </tr>
        <tr>
            <td class="label">Tingkat Prioritas</td>
            <td class="value">{{ priority }}</td>
        </tr>
        <tr>
            <td class="label">Mekanik Penanggung Jawab</td>
            <td class="value">{{ assigned_mechanic }}</td>
        </tr>
    </table>
    
    <!-- Items Breakdown -->
    <div class="section-header">Rincian Biaya Sparepart dan Material</div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 15%;">Kode Item</th>
                <th style="width: 35%;">Deskripsi / Nama Item</th>
                <th style="width: 8%;">Qty</th>
                <th style="width: 8%;">Satuan</th>
                <th style="width: 14%;">Harga Satuan</th>
                <th style="width: 15%;">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            {% if required_parts and required_parts|length > 0 %}
                {% for part in required_parts %}
                <tr>
                    <td>{{ loop.index }}</td>
                    <td>{{ part.item_code }}</td>
                    <td class="text-left">{{ part.description }}</td>
                    <td>{{ "%.0f"|format(part.qty) }}</td>
                    <td>{{ part.uom }}</td>
                    <td class="text-right">{{ format_currency(part.rate) }}</td>
                    <td class="text-right">{{ format_currency(part.amount) }}</td>
                </tr>
                {% endfor %}
            {% else %}
                <tr>
                    <td colspan="7" style="text-align: center; font-style: italic; padding: 15px; color: #999;">
                        Tidak ada sparepart atau material yang dibutuhkan untuk pekerjaan ini
                    </td>
                </tr>
            {% endif %}
        </tbody>
    </table>
    
    <!-- Summary Section -->
    <div class="summary-section page-break-avoid">
        <table class="summary-table">
            <tr>
                <td class="label-cell">Subtotal Sparepart & Material</td>
                <td class="value-cell">{{ format_currency(total_parts) }}</td>
            </tr>
            <tr>
                <td class="label-cell">Biaya Jasa Service / Tenaga Kerja</td>
                <td class="value-cell">{{ format_currency(service_fee) }}</td>
            </tr>
            <tr>
                <td class="label-cell">DPP (Dasar Pengenaan Pajak)</td>
                <td class="value-cell">{{ format_currency(dpp) }}</td>
            </tr>
            <tr>
                <td class="label-cell">PPN 11%</td>
                <td class="value-cell">{{ format_currency(ppn) }}</td>
            </tr>
            <tr>
                <td class="label-cell">PPh Pasal 23 (2,5%)</td>
                <td class="value-cell">{{ format_currency(pph) }}</td>
            </tr>
            <tr class="total-row">
                <td class="label-cell">TOTAL ESTIMASI BIAYA</td>
                <td class="value-cell">{{ format_currency(total) }}</td>
            </tr>
        </table>
    </div>
    
    <!-- Notes Section -->
    {% if notes and notes != '-' %}
    <div class="notes-section page-break-avoid">
        <strong>Catatan Penting:</strong>
        <p>{{ notes }}</p>
    </div>
    {% endif %}
    
    <!-- Terms & Conditions -->
    <div class="notes-section page-break-avoid">
        <strong>Syarat dan Ketentuan:</strong>
        <p>
            1. Estimasi biaya ini berlaku selama 7 (tujuh) hari kalender sejak tanggal penerbitan.<br>
            2. Harga dapat berubah sewaktu-waktu sesuai dengan kondisi pasar dan ketersediaan sparepart.<br>
            3. Biaya tambahan dapat timbul apabila ditemukan kerusakan lain saat proses perbaikan.<br>
            4. Pembayaran dapat dilakukan secara tunai, transfer bank, atau kartu kredit/debit.<br>
            5. Kendaraan yang telah selesai diperbaiki wajib diambil maksimal 3 hari sejak pemberitahuan.
        </p>
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section page-break-avoid">
        <div class="signature-grid">
            <div class="signature-box">
                <div class="signature-label">Disetujui Oleh,<br>Pelanggan</div>
                <div class="signature-line">
                    <div style="height: 60px;"></div>
                    <div class="signature-name">({{ customer_name }})</div>
                    <div>Tanggal: _______________</div>
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-label">Diperiksa Oleh,<br>Service Advisor</div>
                <div class="signature-line">
                    <div style="height: 60px;"></div>
                    <div class="signature-name">(_____________________)</div>
                    <div>Tanggal: _______________</div>
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-label">Dikerjakan Oleh,<br>Kepala Mekanik</div>
                <div class="signature-line">
                    <div style="height: 60px;"></div>
                    <div class="signature-name">({{ assigned_mechanic }})</div>
                    <div>Tanggal: _______________</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Footer -->
    <div class="document-footer">
        <p>Dokumen ini digenerate secara otomatis oleh Sistem Manajemen Bengkel Garasi</p>
        <p>Dicetak pada: {{ date }} | Halaman 1 dari 1</p>
    </div>
</body>
</html>
"""