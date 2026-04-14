import json
import sys

def parse():
    for enc in ['utf-16', 'utf-16le', 'utf-8-sig', 'utf-8']:
        try:
            with open('graphify-out/.graphify_detect.json', encoding=enc) as f:
                d = json.load(f)
                return d
        except Exception as e:
            continue
    return None

d = parse()
if d is None:
    print("Error: Could not decode detection JSON with any encoded attempt")
    sys.exit(1)

print("Total Files:", d.get("total_files", 0))
print("Total Words:", d.get("total_words", 0))
files = d.get("files", {})
print("Code:", len(files.get("code", [])))
print("Docs:", len(files.get("docs", [])))
print("Papers:", len(files.get("papers", [])))
print("Images:", len(files.get("images", [])))
print("Video:", len(files.get("video", [])))
