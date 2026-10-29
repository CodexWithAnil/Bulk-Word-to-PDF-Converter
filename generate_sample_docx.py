"""
Generates clean sample Word (.docx) files for testing bulk conversion.
"""
import os
import sys
import pythoncom
import win32com.client

def create_sample_docx(filepath, title, body_paragraphs):
    pythoncom.CoInitialize()
    word = None
    doc = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        doc = word.Documents.Add()
        
        # Add title
        title_range = doc.Paragraphs.Add().Range
        title_range.Text = title + "\n"
        title_range.Font.Name = "Arial"
        title_range.Font.Size = 18
        title_range.Font.Bold = True
        
        # Add paragraphs
        for p in body_paragraphs:
            pr = doc.Paragraphs.Add().Range
            pr.Text = p + "\n"
            pr.Font.Name = "Calibri"
            pr.Font.Size = 11
            pr.Font.Bold = False
            
        doc.SaveAs2(os.path.abspath(filepath), 16) # 16 = wdFormatXMLDocument
        return True
    except Exception as e:
        print("Error creating docx:", e)
        return False
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

if __name__ == "__main__":
    os.makedirs("sample_docs", exist_ok=True)
    for i in range(1, 6):
        fn = f"sample_docs/Sample_Work_Document_{i}.docx"
        title = f"Daily Office Report #{i} - CodexWithAnil"
        paragraphs = [
            f"This is sample document #{i} for testing bulk Word to PDF conversion.",
            "Features tested: Multi-paragraph alignment, standard fonts, table and formatting preservation.",
            "Converted automatically using CodexWithAnil Bulk Word to PDF suite."
        ]
        create_sample_docx(fn, title, paragraphs)
        print(f"Created: {fn}")
