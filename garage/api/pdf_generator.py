import frappe
from frappe import _
import pdfkit
from jinja2 import Template
import os
from datetime import datetime

from garage.utils.service_estimate import format_service_order_document_number

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
        
        # Get data
        customer_name = safe_get(order, 'customer_name', 'name_customer')
        vehicle_plate = safe_get(order, 'vehicle_plate', 'license_plate', 'plate_number')
        vehicle_brand = safe_get(order, 'vehicle_brand', 'brand', 'make')
        vehicle_model = safe_get(order, 'vehicle_model', 'model')
        
        customer_link = safe_get(order, 'customer', 'customer_id')
        if customer_link:
            try:
                customer_doc = frappe.get_doc("Customer", customer_link)
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

        branch_name = 'Bengkel Garasi'
        branch_code = ''
        branch_address = '-'
        branch_contact = '-'
        branch_ref = safe_get(order, 'branch')
        if branch_ref:
            try:
                branch_doc = frappe.get_doc("Garage Branch", branch_ref)
            except Exception:
                branch_doc = None
            if branch_doc:
                branch_name = (getattr(branch_doc, 'branch_name', None) or getattr(branch_doc, 'name', None) or 'Bengkel Garasi').strip() or 'Bengkel Garasi'
                branch_code = (getattr(branch_doc, 'branch_code', None) or getattr(branch_doc, 'name', None) or '').strip().upper()
                address_parts = []
                for field in ('address_line1', 'address_line2', 'city'):
                    value = (getattr(branch_doc, field, None) or '').strip()
                    if value:
                        address_parts.append(value)
                branch_address = ', '.join(address_parts) if address_parts else '-'
                contact_parts = []
                phone_value = (getattr(branch_doc, 'phone', None) or '').strip()
                email_value = (getattr(branch_doc, 'email', None) or '').strip()
                if phone_value:
                    contact_parts.append(f"Telp: {phone_value}")
                if email_value:
                    contact_parts.append(f"Email: {email_value}")
                branch_contact = ' | '.join(contact_parts) if contact_parts else '-'

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
            'document_number': format_service_order_document_number(order),
            'date': datetime.now().strftime('%d %B %Y'),
            'customer_name': customer_name or '-',
            'vehicle_plate': vehicle_plate or '-',
            'vehicle_brand': vehicle_brand or '-',
            'vehicle_model': vehicle_model or '-',
            'assigned_mechanic': assigned_mechanic,
            'service_type': service_type,
            'priority': priority,
            'branch_name': branch_name,
            'branch_code': branch_code,
            'branch_address': branch_address,
            'branch_contact': branch_contact,
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
            'page-size': 'A5',
            'margin-top': '10mm',
            'margin-right': '10mm',
            'margin-bottom': '10mm',
            'margin-left': '12mm',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None,
            'quiet': ''
        }
        
        # ========================================
        # CREATE FILENAME - FORMAT BARU
        # ========================================
        # Get customer name untuk filename
        customer_name_for_file = customer_name or 'Customer'
        
        # Clean customer name (remove special characters, spaces to dash)
        import re
        customer_name_clean = re.sub(r'[^\w\s-]', '', customer_name_for_file)  # Remove special chars
        customer_name_clean = re.sub(r'[-\s]+', '-', customer_name_clean)      # Replace spaces/dashes with single dash
        customer_name_clean = customer_name_clean.strip('-')[:30]              # Trim and limit length

        # Get order number (extract digits from order.name)
        # Example: SO-00054 -> 00054
        order_number = ''.join(filter(str.isdigit, order.name)).zfill(5)  # Pad with zeros to 5 digits

        # Get current year
        current_year = datetime.now().strftime('%Y')

        # Determine branch token for filename
        branch_token_source = branch_code or ((order.name or '').split('-', 1)[0] if order.name else '')
        branch_token = re.sub(r'[^A-Z0-9]', '', branch_token_source.upper()) or 'BRANCH'

        # Format: SPK-BRANCH-2025-00054-Joya.pdf
        pdf_filename = f"SPK-{branch_token}-{current_year}-{order_number}-{customer_name_clean}.pdf"
        html_filename = f"SPK-{branch_token}-{current_year}-{order_number}-{customer_name_clean}.html"

        frappe.logger().info(f"PDF filename: {pdf_filename}")
        # ========================================
        
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
            # Save using Frappe File API
            file_doc = frappe.get_doc({
                'doctype': 'File',
                'file_name': html_filename,
                'is_private': 0,
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
            'is_private': 0,
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
            margin: 10mm 12mm 12mm 12mm;
            size: A5;
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
                <h1>{{ branch_name }}</h1>
                <p>{{ branch_address }}<br>
                {{ branch_contact }}</p>
            </div>
        </div>
    </div>
    
    <!-- Document Title -->
    <div class="document-title">ESTIMASI BIAYA PERBAIKAN KENDARAAN</div>
    <div class="document-subtitle">No. Dokumen: {{ document_number or order_id }}{% if branch_code %} — Cabang {{ branch_code }}{% endif %}</div>
    
    <!-- Customer & Vehicle Information -->
    <table class="info-table">
        <tr>
            <td class="label">Cabang</td>
            <td class="value">{{ branch_name }}{% if branch_code %} ({{ branch_code }}){% endif %}</td>
        </tr>
        <tr>
            <td class="label">Alamat Cabang</td>
            <td class="value">{{ branch_address }}</td>
        </tr>
        <tr>
            <td class="label">Kontak Cabang</td>
            <td class="value">{{ branch_contact }}</td>
        </tr>
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