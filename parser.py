import json
import re
import openpyxl

# Initialize the root structure
timetable = {
    "SEECS": {}
}

# Mapping intake years to standard Year Labels
year_map = {
    "2K25": "1 - Freshman",
    "2K24": "2 - Sophomore",
    "2K23": "3 - Junior",
    "2K22": "4 - Senior"
}

# Column indexes in the Excel grid (0-based)
day_columns = {
    "Monday": 2,
    "Tuesday": 3,
    "Wednesday": 4,
    "Thursday": 5,
    "Friday": 7
}


def is_probable_room(value):
    if not value:
        return False

    text = str(value).strip()
    lowered = text.lower()

    if lowered in {"lab", "main"}:
        return False

    if lowered == "online":
        return True

    room_keywords = ["cr-", "block", "hall", "room", "lab", "mrc", "lh", "iaec", "seminar"]
    return any(keyword in lowered for keyword in room_keywords) or any(ch.isdigit() for ch in text)


def parse_makeup_inline(line_text, time_slot):
    """Parses makeup records with pipe-separated metadata."""
    text = str(line_text or "").strip()
    if not text or not re.search(r'^makeups?\b', text, re.IGNORECASE) or '|' not in text:
        return []

    parts = [part.strip() for part in text.split('|') if part.strip()]

    # Expected shape often looks like:
    # Makeup(s) | 2K25-BSDS-3A | MATH222-Linear Algebra | Teacher | ...
    course = parts[2] if len(parts) >= 3 else text

    room = None

    # For makeup rows, room is text between '@' and next '|'.
    # Example:
    # ... @ 1400-1550 in Lec-Hall PG Block | 2x Mkp for A
    # => room: "1400-1550 in Lec-Hall PG Block"
    at_match = re.search(r'@\s*([^|]+)', text)
    if at_match:
        room = at_match.group(1).strip(' .')
    elif re.search(r'\bonline\b', text, re.IGNORECASE):
        room = "Online"
    else:
        in_room_match = re.search(r'\bin\s+([^|]+?)\s*$', text, re.IGNORECASE)
        if in_room_match:
            guessed_room = in_room_match.group(1).strip(' .')
            if guessed_room:
                room = guessed_room

    if course and not re.match(r'^\s*makeup\s*:', course, re.IGNORECASE):
        # Safety: if any source has '@ ... |' attached to course text, strip it.
        course = re.sub(r'\s*@\s*[^|]+\|?.*$', '', course).strip()
        course = f"Makeup: {course}"

    return [{
        "time": time_slot,
        "course": course,
        "room": room
    }]

def parse_cell(cell_text, time_slot):
    """Parses a cell into class objects, handling multiples in the same slot."""
    classes = []
    if not cell_text: 
        return classes
        
    text = str(cell_text).strip()
    # Skip break times and library periods
    if not text or "Seminar/Workshop/Library Period" in text or "Lunch" in text or "Prayer Break" in text or "Timings" in text:
        return classes
    
    def parse_block(block_text):
        block_classes = []

        # Keep meaningful lines and normalize spacing
        cleaned_lines = []
        for ln in block_text.splitlines():
            s = ln.strip()
            if not s:
                continue
            cleaned_lines.append(s)

        if not cleaned_lines:
            return block_classes

        i = 0
        pending_room = None
        pending_makeup = False
        while i < len(cleaned_lines):
            line = cleaned_lines[i]

            # Parse pipe-style makeup entry as one complete class record
            makeup_inline_classes = parse_makeup_inline(line, time_slot)
            if makeup_inline_classes:
                block_classes.extend(makeup_inline_classes)
                i += 1
                continue

            # Ignore makeup header labels that are metadata only (not a class title)
            if re.search(r'^makeups?\b', line, re.IGNORECASE) and '|' not in line:
                pending_makeup = True
                i += 1
                continue

            # Capture explicit room lines for nearby classes
            room_line_match = re.match(r'^Room\s*:\s*(.+)$', line, re.IGNORECASE)
            if room_line_match:
                room_candidate = room_line_match.group(1).strip()
                if room_candidate:
                    pending_room = room_candidate
                i += 1
                continue

            # Handle shift-only lines like "(PM) (CR-02-UG Block)" that belong to
            # the previous course in the same block.
            pm_with_room = re.fullmatch(r'\((AM|PM)\)\s*\(([^)]+)\)', line, re.IGNORECASE)
            if pm_with_room and block_classes:
                shift, room = pm_with_room.groups()
                shift = shift.upper()
                if f"({shift})" not in block_classes[-1]["course"]:
                    block_classes[-1]["course"] = f"{block_classes[-1]['course']} ({shift})"
                if not block_classes[-1]["room"]:
                    block_classes[-1]["room"] = room.strip()
                i += 1
                continue

            # Handle lines that are only "(PM)" / "(AM)"
            pm_only = re.fullmatch(r'\((AM|PM)\)', line, re.IGNORECASE)
            if pm_only and block_classes:
                shift = pm_only.group(1).upper()
                if f"({shift})" not in block_classes[-1]["course"]:
                    block_classes[-1]["course"] = f"{block_classes[-1]['course']} ({shift})"
                i += 1
                continue

            course_name = line.strip().rstrip('/').strip()
            room_name = None

            # Next line may be an explicit room line
            if i + 1 < len(cleaned_lines):
                next_line = cleaned_lines[i + 1].strip().rstrip('/').strip()
                next_room_line_match = re.match(r'^Room\s*:\s*(.+)$', next_line, re.IGNORECASE)
                if next_room_line_match:
                    room_name = next_room_line_match.group(1).strip()
                    i += 2
                elif re.fullmatch(r'\([^)]+\)', next_line):
                    room_candidate = next_line[1:-1].strip()
                    if is_probable_room(room_candidate):
                        room_name = room_candidate
                        i += 2
                    else:
                        i += 1
                else:
                    # Or room may be at the end of course line
                    match = re.search(r'\(([^)]+)\)\s*$', course_name)
                    if match:
                        room_candidate = match.group(1).strip()
                        if is_probable_room(room_candidate):
                            room_name = room_candidate
                            course_name = course_name[:match.start()].strip()
                    i += 1
            else:
                match = re.search(r'\(([^)]+)\)\s*$', course_name)
                if match:
                    room_candidate = match.group(1).strip()
                    if is_probable_room(room_candidate):
                        room_name = room_candidate
                        course_name = course_name[:match.start()].strip()
                i += 1

            if pending_room and not room_name:
                room_name = pending_room
            pending_room = None

            if re.search(r'\bonline\b', line, re.IGNORECASE):
                room_name = "Online"
            elif room_name and re.search(r'\bonline\b', room_name, re.IGNORECASE):
                room_name = "Online"

            if room_name and room_name.lower() == "main":
                room_name = None

            if course_name:
                if pending_makeup and not re.match(r'^\s*makeup\s*:', course_name, re.IGNORECASE):
                    course_name = f"Makeup: {course_name}"

                block_classes.append({
                    "time": time_slot,
                    "course": course_name,
                    "room": room_name
                })
                pending_makeup = False

        return block_classes

    # First split multiline alternatives like:
    # Multivariable Calculus/
    # Discrete Mathematics ...
    split_blocks = re.split(r'\s*/\s*\n+', text)
    if len(split_blocks) > 1:
        for block in split_blocks:
            block = block.strip()
            if block:
                classes.extend(parse_block(block))
        return classes

    # Parse multiline course/room pairs without slash delimiter
    if '\n' in text:
        classes.extend(parse_block(text))
        return classes

    # Fallback for single-line cells: split alternatives by '/'
    options = text.split('/')
    for option in options:
        option = option.strip()
        if not option:
            continue

        match = re.search(r'\(([^)]+)\)\s*$', option)
        if match:
            room_name = match.group(1).strip()
            course_name = option[:match.start()].strip()
        else:
            room_name = None
            course_name = option.strip()

        if course_name:
            classes.append({
                "time": time_slot,
                "course": course_name,
                "room": room_name
            })
        
    return classes

def main():
    # REPLACE THIS with your actual Excel file name if you didn't rename it
    excel_filename = "timetable.xlsx"  
    
    print(f"Reading {excel_filename} (this might take a few seconds)...")
    
    try:
        # Load the workbook (data_only=True ignores formulas and gets raw text)
        wb = openpyxl.load_workbook(excel_filename, data_only=True)
    except FileNotFoundError:
        print(f"Error: Could not find '{excel_filename}'. Please make sure the name matches perfectly!")
        return
    
    for sheet in wb.worksheets:
        # Extract all rows from the sheet
        rows = list(sheet.iter_rows(values_only=True))
        
        for row_idx, row in enumerate(rows):
            # Check the first column to find the start of a schedule block
            first_cell = str(row[0]).strip() if row and row[0] else ""
            
            # The header of the table starts with "TIME / DAYS"
            if first_cell == "TIME / DAYS":
                
                # The Batch/Major/Section info is usually 1 or 2 rows above the table header
                header_text = ""
                if row_idx > 0: header_text += str(rows[row_idx-1][0] or "")
                if row_idx > 1: header_text += str(rows[row_idx-2][0] or "")
                
                # Regex to extract 2K25, BSCS, and A/B/C... (case-insensitive for 2k25 variants)
                match = re.search(r'(2K2[2-5])-([A-Z]+)-?\d*([A-Z])', header_text, re.IGNORECASE)
                if not match: 
                    continue
                    
                intake_year, major, section = match.groups()
                intake_year = intake_year.upper()
                major = major.upper()
                section = section.upper()
                year_label = year_map.get(intake_year, "Unknown Year")
                
                # Build the required JSON nested structure on the fly
                if major not in timetable["SEECS"]: timetable["SEECS"][major] = {}
                if year_label not in timetable["SEECS"][major]: timetable["SEECS"][major][year_label] = {}
                if section not in timetable["SEECS"][major][year_label]:
                    timetable["SEECS"][major][year_label][section] = {
                        "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": []
                    }
                
                # Parse the time slots below this header
                for offset in range(1, 40): # Scan downwards until the grid ends
                    if row_idx + offset >= len(rows): break
                    
                    r = rows[row_idx + offset]
                    time_val = str(r[0]).strip() if r and r[0] else ""
                    
                    # Stop if we hit the "Course Code" key at the bottom, or the next grid
                    if "Code" in time_val or "TIME / DAYS" in time_val:
                        break
                        
                    # If it's a valid time format (e.g., "0900-0950")
                    if re.match(r'\d{4}-\d{4}', time_val):
                        for day, col_idx in day_columns.items():
                            if col_idx < len(r):
                                cell_val = r[col_idx]
                                classes = parse_cell(cell_val, time_val)
                                timetable["SEECS"][major][year_label][section][day].extend(classes)

    # Save everything to the final JSON file
    with open('timetable.json', 'w', encoding='utf-8') as f:
        json.dump(timetable, f, indent=2, ensure_ascii=False)
        
    print("Done! Check the timetable.json file in your folder.")

if __name__ == "__main__":
    main()