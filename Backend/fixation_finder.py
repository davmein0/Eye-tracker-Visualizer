# import xml.etree.ElementTree as ET
# import numpy as np
#
#
# def parse_eyetracking(filepath='data/eye_tracking.xml'):
#     tree = ET.parse('data/eye_tracking.xml')
#     root = tree.getroot()
#     gazes = []
#     print(gazes)
#
#     for gaze in root.find('gazes'):
#         loc = gaze.find('ast_structure')
#         t = int(gaze.attrib['timestamp'])
#         print(loc, t)
#
# def main():
#     parse_eyetracking()
#
# if __name__ == '__main__':
#     main()

# python
import xml.etree.ElementTree as ET
import math
import sys
from typing import Optional
import hashlib

def parse_eye_tracking(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    gazes = []
    last_ast = None
    for gaze in root.findall('.//gaze'):
        ts = gaze.get('timestamp')
        if ts is None:
            continue
        ts = int(ts)
        # prefer averaged eyes if both valid
        lx = gaze.find('./left_eye')
        rx = gaze.find('./right_eye')
        def read_eye(e):
            if e is None:
                return None, None, 0.0
            x = e.get('gaze_point_x')
            y = e.get('gaze_point_y')
            valid = e.get('gaze_validity')
            try:
                return float(x), float(y), float(valid)
            except:
                return None, None, 0.0
        lx_x, lx_y, lv = read_eye(lx)
        rx_x, rx_y, rv = read_eye(rx)
        x = None; y = None; validity = 0.0
        if lv >= 1.0 and rv >= 1.0 and lx_x is not None and rx_x is not None:
            x = (lx_x + rx_x) / 2.0
            y = (lx_y + rx_y) / 2.0
            validity = 1.0
        elif lv >= 1.0 and lx_x is not None:
            x, y, validity = lx_x, lx_y, 1.0
        elif rv >= 1.0 and rx_x is not None:
            x, y, validity = rx_x, rx_y, 1.0
        else:
            # skip invalid gaze
            continue
        # parse location (if present)
        loc_el = gaze.find('./location')
        location = None
        if loc_el is not None:
            try:
                location = {
                    'path': loc_el.get('path'),
                    'line': int(loc_el.get('line')) if loc_el.get('line') is not None else None,
                    'column': int(loc_el.get('column')) if loc_el.get('column') is not None else None,
                    'x': int(loc_el.get('x')) if loc_el.get('x') is not None else None,
                    'y': int(loc_el.get('y')) if loc_el.get('y') is not None else None,
                }
            except:
                location = None
        # parse AST structure (if present)
        ast_el = gaze.find('./ast_structure')
        ast = None
        if ast_el is not None:
            token = ast_el.get('token')
            a_type = ast_el.get('type')
            remark = ast_el.get('remark')
            # When remark indicates same as last, levels may be absent
            levels = []
            for lvl in ast_el.findall('./level'):
                levels.append({
                    'start': lvl.get('start'),
                    'end': lvl.get('end'),
                    'tag': lvl.get('tag'),
                })
            if (
                (not levels)
                and remark
                and 'Same' in remark
                and last_ast
                and last_ast.get('token') == token
                and last_ast.get('type') == a_type
            ):
                levels = last_ast.get('levels') or []

            file_id = make_file_id(xml_path)

            ast = {
                'token': token,
                'type': a_type,
                'levels': levels,
                'value': token,
            }

            token_id = make_token_id(file_id, ast)
            if token_id:
                ast['token_id'] = token_id

            last_ast = ast
        gazes.append({'t': ts, 'x': x, 'y': y, 'location': location, 'ast': ast})
    gazes.sort(key=lambda g: g['t'])
    return gazes


def make_file_id(path: Optional[str]) -> str:
    if not path:
        return "unknown"
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:6]

def parse_line_col(s):
    if not s or ':' not in s:
        return None, None
    line, col = s.split(":")
    return int(line), int(col)

def ast_span(ast):
    if not ast or not ast.get("levels"):
        return None, None
    leaf = ast["levels"][-1]

    s_line, s_col = parse_line_col(leaf.get("start"))
    e_line, e_col = parse_line_col(leaf.get("end"))
    if None in (s_line, s_col, e_line, e_col):
        return None
    return (s_line, s_col, e_line, e_col)

def make_token_id(file_id, ast):
    span = ast_span(ast)
    if not span:
        print("No start or end")
        return None
    s_line, s_col, e_line, e_col = span
    return f"{file_id}:{s_line}:{s_col}-{e_line}:{e_col}"

def group_fixations(gazes, max_gap_ms=75):
    """Group gazes with same last token as one group."""
    fixations = []
    cur = None

    for g in gazes:
        ast = g.get("ast")
        if ast is None:
            continue # skip whitespace / no token
        tid = ast.get("token_id")

        if fixations and fixations[-1]:
            index = fixations[-1]["index"] + 1
        else:
            index = 1

        if tid is None:
            continue # skip whitespace / no token
        if cur is None:
            cur = {
                "index": index,
                "token_id": tid,
                "start_time": g["t"],
                "end_time": g["t"],
                "samples": [g],
            }
            continue

        if (
                tid == cur["token_id"]
                and g["t"] - cur["end_time"] <= max_gap_ms
        ):
            cur["end_time"] = g["t"]
            cur["samples"].append(g)
        else:
            fixations.append(cur)

            index = fixations[-1]["index"] + 1
            cur = {
                "index": index,
                "token_id": tid,
                "start_time": g["t"],
                "end_time": g["t"],
                "samples": [g],
            }

    if cur:
        fixations.append(cur)

    return fixations

def finalize_fixation(f):
    xs = [g["x"] for g in f["samples"]]
    ys = [g["y"] for g in f["samples"]]

    if f['samples'][0]['ast']['token'] is None:
        value = "N/A"
    elif f['samples'][0]['ast']['token'] == "\n":
        value = "Newline"
    else:
        value = f['samples'][0]['ast']['token']

    return {
        "index": f["index"],
        "token_id": f["token_id"],
        "start_time": f["start_time"],
        "end_time": f["end_time"],
        "duration_ms": f["end_time"] - f["start_time"],
        "centroid_x": sum(xs) / len(xs),
        "centroid_y": sum(ys) / len(ys),
        "num_samples": len(xs),
        "value": value
    }



def summarize_tokens(tokens):
    summary = {}
    for t in tokens:
        token_type = t["type"]
        summary[token_type] = summary.get(token_type, 0) + 1
    return summary

def compute_fixations(
        xml_path: str,
        max_gap_ms: int = 75,
):
    gazes = parse_eye_tracking(xml_path)
    groups = group_fixations(gazes, max_gap_ms=max_gap_ms)

    fixations = [
        finalize_fixation(f)
        for f in groups
    ]

    return fixations


def run(xml_path, vt=0.1, min_dur=80):
    """
    Run the entire fixation and saccade detection pipeline.

    Given an XML file from EyeLink, parse the gaze samples, find fixations using the I-VT algorithm,
    and then create saccades as transitions between successive fixations.

    Finally, print a concise summary of the results.

        Parameters:
        - xml_path (str): path to EyeLink XML file.
        - vt (float): velocity threshold for I-VT algorithm. Default is 0.1.
        - min_dur (int): minimum duration of fixation in milliseconds. Default is 80.

        Returns:
        - None
    """
    gazes = parse_eye_tracking(xml_path)
    groups = group_fixations(gazes, max_gap_ms=1000)
    fixations = []
    for fix in groups:
        token_id = fix.get("token_id")
        start_time, end_time = fix.get("start_time"), fix.get("end_time")
        print(f"Index: {fix['index']}, Token ID: {token_id}, Start Time: {start_time}, End Time: {end_time}, Duration (ms): {end_time - start_time}")
        print(f"Number of gazes: {len(fix['samples'])}, Value: {fix['samples'][0]['ast']['token']}")

        fixations.append(finalize_fixation(fix))

    return fixations

    # print(fixations)
        #print(fix)
    # for gaze in gazes:
    #     print(gaze)
    # fixs = find_fixations_ivt(gazes, velocity_threshold=float(vt), min_duration_ms=int(min_dur))
    # sacs = find_saccades_from_fixations(fixs, gazes)
    # # print concise summary
    # print(f'Parsed {len(gazes)} gaze samples, found {len(fixs)} fixations, {len(sacs)} saccades')
    # for i, f in enumerate(fixs):
    #     ast_count = len(f.get('ast_tokens') or [])
    #     print(f'FIX {i}: {f["start_time"]}-{f["end_time"]} ms dur={f["duration_ms"]} ms centroid=({f["centroid_x"]:.4f},{f["centroid_y"]:.4f}) samples={f["num_samples"]} ast_tokens={ast_count}')
    # for i, s in enumerate(sacs):
    #     ast_count = len(s.get('ast_tokens') or [])
    #     print(f'SAC  {i}: {s["start_time"]}-{s["end_time"]} ms dur={s["duration_ms"]} ms amp={s["amplitude"]:.4f} peak_v={s["peak_velocity"]:.2f} ast_tokens={ast_count}')
    #     print(f'AST tokens: {s["ast_tokens"]}')

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '../data/eye_tracking.xml'
    vt = sys.argv[2] if len(sys.argv) > 2 else 0.1
    md = sys.argv[3] if len(sys.argv) > 3 else 80
    run(path, vt, md)



"""Previous functions"""
def distance(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])

def find_fixations_ivt(gazes, velocity_threshold=0.1, min_duration_ms=80):
    """
    I-VT algorithm:
    - compute velocity between consecutive samples
    - mark samples with velocity <= velocity_threshold as 'fixation' samples
    - group contiguous fixation samples and keep groups with duration >= min_duration_ms
    Coordinates assumed normalized [0..1]; velocity threshold is in normalized units/sec.
    """
    if not gazes:
        return []
    # compute velocities (units per second)
    vel = [0.0]  # first sample has no previous
    for i in range(1, len(gazes)):
        dt_ms = gazes[i]['t'] - gazes[i-1]['t']
        if dt_ms <= 0:
            v = 0.0
        else:
            d = distance(gazes[i], gazes[i-1])
            v = (d / dt_ms) * 1000.0
        vel.append(v)
    # label fixation samples
    is_fix = [v <= velocity_threshold for v in vel]
    fixations = []
    i = 0
    n = len(gazes)
    while i < n:
        if not is_fix[i]:
            i += 1
            continue
        # start a fixation run
        start_idx = i
        end_idx = i
        while end_idx + 1 < n and is_fix[end_idx + 1]:
            end_idx += 1
        start_t = gazes[start_idx]['t']
        end_t = gazes[end_idx]['t']
        duration = end_t - start_t
        if duration >= min_duration_ms:
            # compute centroid
            sx = sy = 0.0
            count = 0
            for j in range(start_idx, end_idx + 1):
                sx += gazes[j]['x']
                sy += gazes[j]['y']
                count += 1
            centroid = {'x': sx / count, 'y': sy / count}
            # aggregate AST tokens for this fixation window
            ast_tokens = []
            for j in range(start_idx, end_idx + 1):
                g_ast = gazes[j].get('ast')
                if g_ast is not None:
                    ast_tokens.append({
                        'token': g_ast.get('token') if isinstance(g_ast, dict) else None,
                        'type': g_ast.get('type') if isinstance(g_ast, dict) else None,
                        'tags': [lvl.get('tag') for lvl in (g_ast.get('levels') or [])] if isinstance(g_ast, dict) else [],
                        'value': g_ast.get('value') if isinstance(g_ast, dict) else None,
                    })
            fixations.append({
                'start_time': start_t,
                'end_time': end_t,
                'duration_ms': duration,
                'centroid_x': centroid['x'],
                'centroid_y': centroid['y'],
                'num_samples': count,
                'start_idx': start_idx,
                'end_idx': end_idx,
                'ast_tokens': ast_tokens,
                'token_summary': summarize_tokens(ast_tokens)
            })

        i = end_idx + 1
    return fixations


def find_saccades_from_fixations(fixations, gazes):
    """
    Create saccades as transitions between successive fixations.
    Each saccade gets start_time, end_time, duration_ms, amplitude (norm units), peak_velocity (approx).
    ** Should include AST parameters, such as
    """
    saccades = []
    for k in range(len(fixations) - 1):
        f1 = fixations[k]
        f2 = fixations[k+1]
        # saccade starts at f1 end_idx and ends at f2 start_idx
        s_idx = f1['end_idx']
        e_idx = f2['start_idx']
        if s_idx >= e_idx:
            continue
        start_t = gazes[s_idx]['t']
        end_t = gazes[e_idx]['t']
        duration = end_t - start_t
        amp = distance(gazes[s_idx], gazes[e_idx])
        # approximate peak velocity as max pairwise velocity within saccade interval
        peak_v = 0.0
        for i in range(s_idx + 1, e_idx + 1):
            dt_ms = gazes[i]['t'] - gazes[i-1]['t']
            if dt_ms <= 0:
                continue
            v = (distance(gazes[i], gazes[i-1]) / dt_ms) * 1000.0
            if v > peak_v:
                peak_v = v
        # aggregate AST tokens observed during the saccade interval
        ast_tokens = []
        for j in range(s_idx, e_idx + 1):
            g_ast = gazes[j].get('ast')
            if g_ast is not None:
                ast_tokens.append({
                    'token': g_ast.get('token') if isinstance(g_ast, dict) else None,
                    'type': g_ast.get('type') if isinstance(g_ast, dict) else None,
                    'tags': [lvl.get('tag') for lvl in (g_ast.get('levels') or [])] if isinstance(g_ast, dict) else [],
                    'value': g_ast.get('value') if isinstance(g_ast, dict) else None,
                })
        saccades.append({
            'start_time': start_t,
            'end_time': end_t,
            'duration_ms': duration,
            'amplitude': amp,
            'peak_velocity': peak_v,
            'from_idx': s_idx,
            'to_idx': e_idx,
            'ast_tokens': ast_tokens
        })
    return saccades

def merge_fixations(fixations):
    merged = []
    current = None

    def same_token(a, b):
        if len(a) != len(b):
            return False
        return all(t1["value"] == t2["value"] for t1, t2 in zip(a, b))

    for fix in fixations:
        if current is None:
            current = fix
            continue

        if same_token(current["ast_tokens"], fix["ast_tokens"]):
            current["end_time"] = fix["end_time"]
            current["duration_ms"] = current["end_time"] - current["start_time"]
            current["end_idx"] = fix["end_idx"]
        else:
            merged.append(current)
            current = fix

    if current:
        merged.append(current)

    return merged


def summarize_fixations(fixations):
    merged_fix = merge_fixations(fixations)

    # number of fixations
    num_fix = len(merged_fix)
    # number of saccades
    num_sacc = max(0, num_fix - 1)

    # fixation durations per token
    token_times = {}
    fixation_records = []

    for fix in merged_fix:
        token_value = fix["ast_tokens"][0]["value"]   # simplify to one token
        duration = fix["duration_ms"]

        token_times[token_value] = token_times.get(token_value, 0) + duration

        fixation_records.append({
            "token": token_value,
            "duration": duration,
            "start": fix["start_time"],
            "end": fix["end_time"],
        })

    return num_fix, num_sacc, token_times, fixation_records