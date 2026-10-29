"""
CodexWithAnil — Standalone Folder Batch Word to PDF Converter
Converts all .docx and .doc files in any selected folder.
"""
import os
import sys
import glob
import time
import pythoncom
import win32com.client

from convert_service import preprocess_docx

def convert_folder(target_dir):
    abs_dir = os.path.abspath(target_dir)
    if not os.path.isdir(abs_dir):
        print(f"Directory nahi mili: {abs_dir}")
        return

    patterns = [os.path.join(abs_dir, "*.docx"), os.path.join(abs_dir, "*.doc")]
    word_files = []
    for pat in patterns:
        word_files.extend(glob.glob(pat))

    # Exclude temporary Word lock files starting with ~$
    word_files = [f for f in word_files if not os.path.basename(f).startswith("~$")]

    if not word_files:
        print(f"\nIs folder me koi Word file (.docx ya .doc) nahi mili:\n{abs_dir}")
        return

    print("=" * 60)
    print(f"  CodexWithAnil — Batch Word to PDF Converter")
    print(f"  Folder: {abs_dir}")
    print(f"  Found: {len(word_files)} Word files")
    print("=" * 60)

    t0 = time.time()
    pythoncom.CoInitialize()
    word = None

    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        word.ScreenUpdating = False

        success_count = 0
        for i, in_path in enumerate(word_files, start=1):
            base_name = os.path.splitext(in_path)[0]
            out_pdf = base_name + ".pdf"
            fname = os.path.basename(in_path)
            
            try:
                print(f"[{i}/{len(word_files)}] Converting: {fname}...", end="", flush=True)
                preprocess_docx(os.path.abspath(in_path))
                doc = word.Documents.Open(os.path.abspath(in_path), ReadOnly=True, ConfirmConversions=False)
                doc.SaveAs2(os.path.abspath(out_pdf), FileFormat=17) # 17 = wdFormatPDF
                doc.Close(False)

                # Enhance borders (double page border + red footer box)
                try:
                    js_code = (
                        "const fs=require('fs'); "
                        "const {enhancePdfWithBorders}=require('./js/pdfPostProcessor.js'); "
                        "(async()=>{ "
                        "const p=process.argv[1]; const d=process.argv[2]; "
                        "const b=await enhancePdfWithBorders(fs.readFileSync(p), fs.existsSync(d)?fs.readFileSync(d):null); "
                        "fs.writeFileSync(p, b); "
                        "})();"
                    )
                    import subprocess
                    subprocess.run(["node", "-e", js_code, os.path.abspath(out_pdf), os.path.abspath(in_path)], check=False)
                except Exception:
                    pass

                success_count += 1
                print(" -> [DONE]")
            except Exception as ex:
                print(f" -> [ERROR: {ex}]")

        total_time = time.time() - t0
        print("\n" + "=" * 60)
        print(f"  Conversion Complete!")
        print(f"  Successfully Converted: {success_count} / {len(word_files)} files")
        print(f"  Time Taken: {total_time:.2f} seconds")
        print("=" * 60)

    except Exception as e:
        print("Word automation error:", e)
    finally:
        if word is not None:
            try:
                word.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()

if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else "."
    convert_folder(folder)
