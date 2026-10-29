"""
CodexWithAnil — Word to PDF Conversion Service
Uses Microsoft Word COM (via win32com) for 100% perfect layout fidelity.
Supports both .docx and .doc formats.
"""

import os
import sys
import json
import base64
import zipfile
import io
import re
import pythoncom
import win32com.client

def preprocess_docx(in_path):
    """
    Ensures empty paragraphs with borders (like dotDash line below 'SOLVED ASSIGNMENT')
    and bottom margins are properly formatted before Word converts to PDF.
    """
    if not in_path.lower().endswith('.docx'):
        return in_path

    try:
        with open(in_path, 'rb') as f:
            docx_bytes = f.read()

        zin = zipfile.ZipFile(io.BytesIO(docx_bytes))
        changed = False
        zout_buf = io.BytesIO()
        zout = zipfile.ZipFile(zout_buf, 'w', compression=zipfile.ZIP_DEFLATED)

        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == 'word/document.xml':
                content = data.decode('utf-8')
                # 1. Fix empty paragraph with dotDash border: insert space run so Word doesn't skip it
                new_content = re.sub(
                    r'(<w:pBdr><w:bottom w:val="dotDash"[^>]*/>.*?</w:pPr>)(</w:p>)',
                    r'\1<w:r><w:rPr><w:sz w:val="12"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>\2',
                    content
                )
                # 2. Adjust bottom margin from 1440 to 1850 so body content never touches footer box
                if 'SOLVED ASSIGNMENT' in content or 'openedu' in content:
                    new_content = re.sub(r'w:bottom="1440"', 'w:bottom="1850"', new_content)

                if new_content != content:
                    data = new_content.encode('utf-8')
                    changed = True
            zout.writestr(item, data)

        zin.close()
        zout.close()

        if changed:
            with open(in_path, 'wb') as f:
                f.write(zout_buf.getvalue())
    except Exception as e:
        print('Preprocess docx warning:', e, file=sys.stderr)

    return in_path

def convert_single_file(input_path, output_path):
    """Converts a single .docx or .doc file to .pdf"""
    pythoncom.CoInitialize()
    word = None
    doc = None
    try:
        abs_in = os.path.abspath(input_path)
        abs_out = os.path.abspath(output_path)

        preprocess_docx(abs_in)

        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        word.ScreenUpdating = False

        doc = word.Documents.Open(abs_in, ReadOnly=True, ConfirmConversions=False)
        doc.SaveAs2(abs_out, FileFormat=17) # 17 = wdFormatPDF
        return True, abs_out
    except Exception as e:
        return False, str(e)
    finally:
        if doc is not None:
            try:
                doc.Close(False)
            except Exception:
                pass
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

def convert_batch_files(file_pairs):
    """
    file_pairs is a list of (input_path, output_path).
    Keeps Word open across all files for ultra-fast conversion (e.g. 50+ files in seconds).
    """
    pythoncom.CoInitialize()
    word = None
    results = []
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        word.ScreenUpdating = False

        for in_path, out_path in file_pairs:
            try:
                abs_in = os.path.abspath(in_path)
                abs_out = os.path.abspath(out_path)

                preprocess_docx(abs_in)

                doc = word.Documents.Open(abs_in, ReadOnly=True, ConfirmConversions=False)
                doc.SaveAs2(abs_out, FileFormat=17)
                doc.Close(False)
                results.append({"file": in_path, "success": True, "output": abs_out})
            except Exception as ex:
                results.append({"file": in_path, "success": False, "error": str(ex)})

        return results
    except Exception as e:
        return [{"file": p[0], "success": False, "error": str(e)} for p in file_pairs]
    finally:
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "ready", "version": "1.0"}))
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd == "--single" and len(sys.argv) >= 4:
        in_file = sys.argv[2]
        out_file = sys.argv[3]
        ok, res = convert_single_file(in_file, out_file)
        print(json.dumps({"success": ok, "result": res}))
    elif cmd == "--json-batch" and len(sys.argv) >= 3:
        batch_spec_path = sys.argv[2]
        with open(batch_spec_path, 'r', encoding='utf-8') as f:
            pairs = json.load(f)
        res = convert_batch_files(pairs)
        print(json.dumps(res))
    else:
        print(json.dumps({"error": "Invalid arguments"}))
