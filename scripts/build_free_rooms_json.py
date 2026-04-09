import json
import re
from datetime import datetime, UTC
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMETABLE_JSON = ROOT / 'lib' / 'timetable-data.json'
FREE_ROOMS_JSON = ROOT / 'lib' / 'free-rooms-data.json'
UNIQUE_ROOMS_JSON = ROOT / 'lib' / 'unique-room-names.json'

DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']


def clean_room(room):
    value = str(room or '').strip()
    if not value or value.lower() in {'main', 'none', 'null'}:
        return ''
    if value.lower() == 'online':
        return ''

    # Trim common malformed tails from upstream data.
    value = re.sub(r'\s*\(2K\d{2}[^)]*\).*$', '', value, flags=re.IGNORECASE).strip()
    value = re.sub(r'\s+Dr\.?\s+.*$', '', value, flags=re.IGNORECASE).strip()
    value = re.sub(r'\s{2,}', ' ', value)

    # Keep only plausible physical room/lab/hall names.
    if not re.search(r'(\bCR-?|\bLab\b|\bHall\b|\bBlock\b|\bIAEC\b|\bSMRIMMS\b|\bSeminar\b|\bLecture\b|\bMRC\b|\bComputing\b)', value, re.IGNORECASE):
        return ''

    # Canonicalize CR-based rooms by numeric code only.
    # Examples:
    #   CR-01-UG Block -> CR-01
    #   cr-01-acad     -> CR-01
    #   CR- 21 RIMMS   -> CR-21
    cr_match = re.search(r'\bCR\s*-?\s*0*(\d{1,3})\b', value, re.IGNORECASE)
    if cr_match:
        number = int(cr_match.group(1))
        return f'CR-{number:02d}'

    return value


def time_key(time_text: str):
    text = str(time_text or '').strip()
    start = text.split('-')[0].strip() if '-' in text else text

    m = re.match(r'^(\d{1,2}):(\d{2})$', start)
    if m:
        h = int(m.group(1))
        mm = int(m.group(2))
        return h * 60 + mm

    m = re.match(r'^(\d{3,4})$', start)
    if m:
        digits = m.group(1)
        if len(digits) == 3:
            h = int(digits[0])
            mm = int(digits[1:])
        else:
            h = int(digits[:2])
            mm = int(digits[2:])
        return h * 60 + mm

    return 10**9


def ordered_days(day_keys):
    present = [d for d in DAY_ORDER if d in day_keys]
    extras = sorted([d for d in day_keys if d not in DAY_ORDER])
    return present + extras


def build():
    data = json.loads(TIMETABLE_JSON.read_text(encoding='utf-8'))

    all_unique_rooms = set()
    departments_out = {}
    rooms_by_department = {}

    for dept_name, majors in data.items():
        dept_rooms = set()
        dept_day_time_occupied = {}
        dept_day_times = {}

        for major in majors.values():
            for year in major.values():
                for section in year.values():
                    for day, slots in section.items():
                        dept_day_time_occupied.setdefault(day, {})
                        dept_day_times.setdefault(day, set())

                        for slot in slots:
                            room = clean_room(slot.get('room'))
                            time = str(slot.get('time') or '').strip()

                            if not time:
                                continue

                            dept_day_times[day].add(time)

                            if room:
                                dept_rooms.add(room)
                                all_unique_rooms.add(room)
                                dept_day_time_occupied[day].setdefault(time, set()).add(room)

        dept_rooms_sorted = sorted(dept_rooms)
        rooms_by_department[dept_name] = dept_rooms_sorted

        days_out = {}
        for day in ordered_days(dept_day_times.keys()):
            times_sorted = sorted(dept_day_times.get(day, set()), key=time_key)
            times_out = {}

            for t in times_sorted:
                occupied = dept_day_time_occupied.get(day, {}).get(t, set())
                free_rooms = sorted([r for r in dept_rooms if r not in occupied])
                times_out[t] = free_rooms

            if times_sorted:
                whole_day_free = sorted(
                    [
                        room
                        for room in dept_rooms
                        if all(room in set(times_out.get(t, [])) for t in times_sorted)
                    ]
                )
            else:
                whole_day_free = dept_rooms_sorted

            days_out[day] = {
                'wholeDay': whole_day_free,
                'times': times_out,
            }

        departments_out[dept_name] = {
            'rooms': dept_rooms_sorted,
            'days': days_out,
        }

    now_iso = datetime.now(UTC).isoformat().replace('+00:00', 'Z')

    free_rooms_data = {
        'generatedAt': now_iso,
        'source': 'lib/timetable-data.json',
        'departments': departments_out,
    }

    unique_rooms_data = {
        'generatedAt': now_iso,
        'source': 'lib/timetable-data.json',
        'uniqueRooms': sorted(all_unique_rooms),
        'byDepartment': rooms_by_department,
    }

    FREE_ROOMS_JSON.write_text(json.dumps(free_rooms_data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    UNIQUE_ROOMS_JSON.write_text(json.dumps(unique_rooms_data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    print(f'Wrote: {FREE_ROOMS_JSON}')
    print(f'Wrote: {UNIQUE_ROOMS_JSON}')


if __name__ == '__main__':
    build()
