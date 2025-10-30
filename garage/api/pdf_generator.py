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
        
        # Get customer and vehicle data safely
        customer_name = safe_get(order, 'customer_name', 'name_customer')
        vehicle_plate = safe_get(order, 'vehicle_plate', 'license_plate', 'plate_number')
        vehicle_brand = safe_get(order, 'vehicle_brand', 'brand', 'make')
        vehicle_model = safe_get(order, 'vehicle_model', 'model')
        
        # Jika ada link ke customer, ambil data lengkap
        customer_link = safe_get(order, 'customer', 'customer_id')
        if customer_link:
            try:
                customer_doc = frappe.get_doc("Garage Customer", customer_link)
                customer_name = safe_get(customer_doc, 'customer_name', 'name') or customer_name
            except:
                pass
        
        # Jika ada link ke vehicle, ambil data lengkap
        vehicle_link = safe_get(order, 'vehicle', 'vehicle_id')
        if vehicle_link:
            try:
                vehicle_doc = frappe.get_doc("Garage Vehicle", vehicle_link)
                vehicle_plate = safe_get(vehicle_doc, 'license_plate', 'plate_number') or vehicle_plate
                vehicle_brand = safe_get(vehicle_doc, 'make', 'brand') or vehicle_brand
                vehicle_model = safe_get(vehicle_doc, 'model') or vehicle_model
            except:
                pass
        
        # Get parts dari child table (coba berbagai nama)
        required_parts = []
        for attr_name in ['parts', 'required_parts', 'items', 'order_parts', 'service_parts']:
            parts_data = getattr(order, attr_name, None)
            if parts_data:
                required_parts = parts_data
                break
        
        # Calculate totals
        total_parts = 0
        parts_list = []
        
        for part in required_parts:
            # Get quantity
            qty = 0
            for qty_attr in ['qty', 'quantity', 'amount_qty']:
                qty_val = getattr(part, qty_attr, None)
                if qty_val:
                    qty = float(qty_val)
                    break
            
            # Get rate
            rate = 0
            for rate_attr in ['rate', 'unit_price', 'price', 'unit_rate']:
                rate_val = getattr(part, rate_attr, None)
                if rate_val:
                    rate = float(rate_val)
                    break
            
            # Get amount
            amount = 0
            for amount_attr in ['amount', 'total', 'total_amount']:
                amount_val = getattr(part, amount_attr, None)
                if amount_val:
                    amount = float(amount_val)
                    break
            
            # Calculate if amount is 0
            if amount == 0 and qty > 0 and rate > 0:
                amount = qty * rate
            
            total_parts += amount
            
            # Get item code
            item_code = safe_get(part, 'item_code', 'part_code', 'code', 'sku')
            
            # Get description
            description = safe_get(
                part, 
                'description', 
                'item_name', 
                'part_name', 
                'name',
                'item_description'
            )
            
            # Get UOM
            uom = safe_get(part, 'uom', 'unit', 'unit_of_measure') or 'Unit'
            
            parts_list.append({
                'item_code': item_code or '-',
                'description': description or '-',
                'qty': qty,
                'uom': uom,
                'rate': rate,
                'amount': amount
            })
        
        # Get service fee
        service_fee = 0
        for fee_attr in ['estimated_service_fee', 'service_fee', 'labor_cost', 'service_charge']:
            fee_val = getattr(order, fee_attr, None)
            if fee_val:
                service_fee = float(fee_val)
                break
        
        # Get total estimated amount
        dpp = 0
        for total_attr in ['total_estimated_amount', 'total_amount', 'grand_total', 'total']:
            total_val = getattr(order, total_attr, None)
            if total_val:
                dpp = float(total_val)
                break
        
        # Calculate if DPP is 0
        if dpp == 0:
            dpp = total_parts + service_fee
        
        ppn = dpp * 0.11
        pph = dpp * 0.025
        total_with_tax = dpp + ppn + pph
        
        # Get notes
        notes = safe_get(
            order, 
            'notes', 
            'service_notes', 
            'inspection_summary',
            'remarks',
            'description'
        ) or '-'
        
        # Get mechanic
        assigned_mechanic = safe_get(
            order, 
            'assigned_mechanic_name',
            'mechanic_in_charge_name',
            'assigned_mechanic',
            'mechanic_name',
            'technician_name'
        ) or '-'
        
        # Get service type
        service_type = safe_get(
            order,
            'service_order_type',
            'service_type',
            'order_type'
        ) or '-'
        
        # Get priority
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
        
        # Generate PDF options
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
        
        # Create PDF filename
        pdf_filename = f"Estimasi_Service_{order.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Get site path
        site_path = frappe.get_site_path()
        private_files_path = os.path.join(site_path, 'private', 'files')
        
        # Ensure directory exists
        if not os.path.exists(private_files_path):
            os.makedirs(private_files_path)
        
        pdf_path = os.path.join(private_files_path, pdf_filename)
        
        # Generate PDF using pdfkit
        try:
            pdfkit.from_string(html_content, pdf_path, options=pdf_options)
        except Exception as e:
            frappe.log_error(f"PDF generation error: {str(e)}", "PDF Generator")
            # Fallback: save as HTML if PDF fails
            html_filename = pdf_filename.replace('.pdf', '.html')
            html_path = os.path.join(private_files_path, html_filename)
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Return HTML file instead
            file_url = f'/private/files/{html_filename}'
            existing_file = frappe.db.exists('File', {'file_url': file_url})
            if not existing_file:
                file_doc = frappe.get_doc({
                    'doctype': 'File',
                    'file_name': html_filename,
                    'is_private': 1,
                    'file_url': file_url,
                    'folder': 'Home',
                    'attached_to_doctype': 'Garage Service Order',
                    'attached_to_name': order.name
                })
                file_doc.insert(ignore_permissions=True)
                frappe.db.commit()
            
            return {
                'success': True,
                'file_url': file_url,
                'file_name': html_filename,
                'message': f'PDF generation failed, HTML saved instead: {str(e)}'
            }
        
        # Create File document
        file_url = f'/private/files/{pdf_filename}'
        
        # Check if file already exists
        existing_file = frappe.db.exists('File', {'file_url': file_url})
        if existing_file:
            file_doc = frappe.get_doc('File', existing_file)
        else:
            file_doc = frappe.get_doc({
                'doctype': 'File',
                'file_name': pdf_filename,
                'is_private': 1,
                'file_url': file_url,
                'folder': 'Home',
                'attached_to_doctype': 'Garage Service Order',
                'attached_to_name': order.name
            })
            file_doc.insert(ignore_permissions=True)
            frappe.db.commit()
        
        return {
            'success': True,
            'file_url': file_url,
            'file_name': pdf_filename,
            'message': 'PDF generated successfully'
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "PDF Generation Error")
        frappe.throw(_("Error generating PDF: {0}").format(str(e)))


def get_pdf_template():
    """HTML template - sama seperti sebelumnya"""
    return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 20mm; size: A4; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', 'Helvetica', sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0066FF; padding-bottom: 15px; }
        .header h1 { font-size: 24pt; color: #0066FF; margin-bottom: 5px; font-weight: 700; }
        .header p { font-size: 10pt; color: #666; }
        .document-title { text-align: center; font-size: 18pt; font-weight: 700; margin: 20px 0; color: #1A2332; text-transform: uppercase; letter-spacing: 1px; }
        .info-section { margin-bottom: 25px; }
        .info-grid { display: table; width: 100%; border-collapse: collapse; }
        .info-row { display: table-row; }
        .info-label { display: table-cell; width: 180px; padding: 8px 10px; font-weight: 600; color: #5E6C84; background: #F5F7FA; border: 1px solid #E9ECF1; }
        .info-value { display: table-cell; padding: 8px 15px; color: #1A2332; border: 1px solid #E9ECF1; }
        .section-title { font-size: 14pt; font-weight: 700; color: #1A2332; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #0066FF; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table thead { background: #0066FF; color: white; }
        table th { padding: 12px 10px; text-align: left; font-weight: 600; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; }
        table td { padding: 10px; border: 1px solid #E9ECF1; font-size: 10pt; }
        table tbody tr:nth-child(even) { background: #F9FAFB; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .amount { font-weight: 600; color: #1A2332; }
        .summary-table { width: 400px; float: right; margin-top: 20px; }
        .summary-table td { padding: 10px 15px; }
        .summary-table .label { font-weight: 600; background: #F5F7FA; color: #5E6C84; }
        .summary-table .total-row { background: #0066FF; color: white; font-weight: 700; font-size: 12pt; }
        .notes-section { clear: both; margin-top: 30px; padding: 15px; background: #F5F7FA; border-left: 4px solid #0066FF; border-radius: 4px; }
        .notes-section strong { display: block; margin-bottom: 8px; color: #1A2332; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #E9ECF1; font-size: 9pt; color: #8896AB; text-align: center; }
        .signature-section { margin-top: 60px; display: table; width: 100%; }
        .signature-box { display: table-cell; width: 33.33%; text-align: center; padding: 10px; }
        .signature-line { margin-top: 60px; border-top: 1px solid #333; padding-top: 5px; font-size: 10pt; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 9pt; font-weight: 600; text-transform: uppercase; }
        .badge-priority-normal { background: #E3F2FD; color: #1565C0; }
        .badge-priority-high { background: #FFF1E6; color: #D35400; }
        .badge-priority-urgent { background: #FFE8E8; color: #C62828; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 BENGKEL GARASI</h1>
        <p>Jl. Raya Industri No. 123, Jakarta Selatan | Telp: (021) 1234-5678 | Email: info@bengkelgarasi.com</p>
    </div>
    
    <div class="document-title">ESTIMASI SERVICE KENDARAAN</div>
    
    <div class="info-section">
        <div class="info-grid">
            <div class="info-row"><div class="info-label">No. Order</div><div class="info-value"><strong>{{ order_id }}</strong></div></div>
            <div class="info-row"><div class="info-label">Tanggal</div><div class="info-value">{{ date }}</div></div>
            <div class="info-row"><div class="info-label">Nama Customer</div><div class="info-value">{{ customer_name }}</div></div>
            <div class="info-row"><div class="info-label">No. Polisi Kendaraan</div><div class="info-value"><strong>{{ vehicle_plate }}</strong></div></div>
            <div class="info-row"><div class="info-label">Merek/Model</div><div class="info-value">{{ vehicle_brand }} {{ vehicle_model }}</div></div>
            <div class="info-row"><div class="info-label">Mekanik Ditugaskan</div><div class="info-value">{{ assigned_mechanic }}</div></div>
            <div class="info-row"><div class="info-label">Jenis Service</div><div class="info-value">{{ service_type }}</div></div>
            <div class="info-row"><div class="info-label">Prioritas</div><div class="info-value"><span class="badge badge-priority-{{ priority|lower }}">{{ priority }}</span></div></div>
        </div>
    </div>
    
    <div class="section-title">Rincian Sparepart & Bahan</div>
    
    <table>
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 20%;">Kode Item</th>
                <th style="width: 35%;">Deskripsi</th>
                <th style="width: 8%;" class="text-center">Qty</th>
                <th style="width: 8%;" class="text-center">UOM</th>
                <th style="width: 12%;" class="text-right">Harga Satuan</th>
                <th style="width: 12%;" class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            {% for part in required_parts %}
            <tr>
                <td class="text-center">{{ loop.index }}</td>
                <td>{{ part.item_code }}</td>
                <td>{{ part.description }}</td>
                <td class="text-center">{{ "%.0f"|format(part.qty) }}</td>
                <td class="text-center">{{ part.uom }}</td>
                <td class="text-right amount">{{ format_currency(part.rate) }}</td>
                <td class="text-right amount">{{ format_currency(part.amount) }}</td>
            </tr>
            {% endfor %}
            {% if not required_parts %}
            <tr>
                <td colspan="7" class="text-center" style="font-style: italic; color: #999;">Belum ada sparepart atau bahan yang dibutuhkan</td>
            </tr>
            {% endif %}
        </tbody>
    </table>
    
    <table class="summary-table">
        <tr><td class="label">Subtotal Sparepart & Bahan</td><td class="text-right amount">{{ format_currency(total_parts) }}</td></tr>
        <tr><td class="label">Biaya Jasa Service</td><td class="text-right amount">{{ format_currency(service_fee) }}</td></tr>
        <tr><td class="label">DPP (Dasar Pengenaan Pajak)</td><td class="text-right amount">{{ format_currency(dpp) }}</td></tr>
        <tr><td class="label">PPN (11%)</td><td class="text-right amount">{{ format_currency(ppn) }}</td></tr>
        <tr><td class="label">PPH (2.5%)</td><td class="text-right amount">{{ format_currency(pph) }}</td></tr>
        <tr class="total-row"><td>TOTAL ESTIMASI</td><td class="text-right">{{ format_currency(total) }}</td></tr>
    </table>
    
    <div style="clear: both;"></div>
    
    {% if notes and notes != '-' %}
    <div class="notes-section"><strong>Catatan:</strong> {{ notes }}</div>
    {% endif %}
    
    <div class="signature-section">
        <div class="signature-box"><div>Disetujui Oleh,</div><div class="signature-line">Customer</div></div>
        <div class="signature-box"><div>Diperiksa Oleh,</div><div class="signature-line">Service Advisor</div></div>
        <div class="signature-box"><div>Dikerjakan Oleh,</div><div class="signature-line">Mekanik</div></div>
    </div>
    
    <div class="footer">
        <p>Dokumen ini digenerate secara otomatis oleh sistem Bengkel Garasi.</p>
        <p>Estimasi ini berlaku 7 hari sejak tanggal penerbitan.</p>
    </div>
</body>
</html>
"""