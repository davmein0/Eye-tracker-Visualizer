# server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
import os
import logging

# import functions from your uploaded fixation_finder.py
# make sure fixation_finder.py is in the same folder or in PYTHONPATH
from fixation_finder import parse_eye_tracking, find_fixations_ivt, group_fixations,\
    find_saccades_from_fixations, summarize_fixations, merge_fixations, compute_fixations, make_file_id
from tokenize_code import extract_tokens, extract_code_string
from token_index import build_token_index, attach_fixations_to_tokens

app = FastAPI()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Allow your local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FixationOut(BaseModel):
    start_time: int
    end_time: int
    duration_ms: int
    centroid_x: float   # normalized [0..1]
    centroid_y: float   # normalized [0..1]
    num_samples: int
    ast_tokens: List[Dict[str, Any]]
    start_idx: int
    end_idx: int
    token_summary: Dict[str, Any]

class FixationRequest(BaseModel):
    xml_path: str
    code_path: str
    language: str
    max_gap_ms: int = 75

# class Token_Group(BaseModel):
#     token: str
#     gazes: List[Dict[str, Any]]

@app.get("/api/metadata")
def metadata():
    """
    Return simple IDE/screen metadata so the frontend can map normalized coords to pixels.
    Reads <environment> from ide_tracking.xml.
    """
    if not os.path.exists(IDE_XML):
        raise HTTPException(status_code=404, detail="ide_tracking.xml not found")
    tree = ET.parse(IDE_XML)
    root = tree.getroot()
    env = root.find('environment')
    if env is None:
        raise HTTPException(status_code=500, detail="No <environment> in ide_tracking.xml")
    # parse values, provide defaults
    try:
        screen_size = env.get('screen_size')  # expecting "(w,h)"
        # parse "(1382,864)"
        if screen_size and screen_size.startswith("("):
            screen_size = screen_size.strip("()")
            sw, sh = screen_size.split(",")
            screen_w = int(sw)
            screen_h = int(sh)
        else:
            screen_w = int(env.get('screen_w') or 0)
            screen_h = int(env.get('screen_h') or 0)

        scale_x = float(env.get('scale_x') or 1.0)
        scale_y = float(env.get('scale_y') or 1.0)
        ide_name = env.get('ide_name') or "IDE"
        project_path = env.get('project_path') or None

        return {
            "screen_width": screen_w,
            "screen_height": screen_h,
            "scale_x": scale_x,
            "scale_y": scale_y,
            "ide_name": ide_name,
            "project_path": project_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed parse: {e}")

# @app.get("/api/fixations", response_model=List[FixationOut])
# def get_fixations(vt: float = 0.1, min_dur: int = 80):
#     """
#     Parse the eye_tracking.xml, compute fixations (IVT), and return them as JSON.
#     Coordinates are normalized in [0..1] as produced by parse_eye_tracking().
#     """
#     if not os.path.exists(EYE_XML):
#         raise HTTPException(status_code=404, detail="eye_tracking.xml not found")
#     gazes = parse_eye_tracking(EYE_XML)
#     fixs = find_fixations_ivt(gazes, velocity_threshold=float(vt), min_duration_ms=int(min_dur))
#     # standardize keys/field names
#     # merge fixation tokens when repeated:
#
#     out = []
#     for f in fixs:
#         out.append({
#             "start_time": int(f["start_time"]),
#             "end_time": int(f["end_time"]),
#             "duration_ms": int(f["duration_ms"]),
#             "centroid_x": float(f["centroid_x"]),
#             "centroid_y": float(f["centroid_y"]),
#             "num_samples": int(f["num_samples"]),
#             "ast_tokens": f.get("ast_tokens") or [],
#             "start_idx": int(f.get("start_idx", -1)),
#             "end_idx": int(f.get("end_idx", -1)),
#             "token summary": f.get("token_summary", "N/A")
#         })
#     return out
#
# @app.get("/api/token_groups", )
# def get_token_groups():
#     if not os.path.exists(EYE_XML):
#         raise HTTPException(status_code=404, detail="eye_tracking.xml not found")
#     gazes = parse_eye_tracking(EYE_XML)
#     groups = group_fixations(gazes)
#     out = []
#     # for g in groups:
#     #     out.append({
#     #
#     #     }
#
#         # )
#     return groups

@app.post("/api/fixations")
def get_fixations(req: FixationRequest):
    file_id = make_file_id(req.code_path)
    code_string = extract_code_string(req.code_path)
    file = {
        "file_id": file_id,
        "path": req.code_path,
        "language": req.language,
        "code": code_string
    }
    fixations = compute_fixations(req.xml_path)

    tokens = extract_tokens(code_string, req.language, req.code_path)
    token_index = build_token_index(tokens)

    attach_fixations_to_tokens(token_index, fixations)
    return {
        "file": file,
        "code_str": code_string,
        "tokens": list(token_index.values()),
        "fixations": fixations
    }
    fixations = compute_fixations(req.xml_path)
    return {
        "num_fixations": len(fixations),
        "fixations": fixations
    }

if __name__ == "__main__":
    # run uvicorn: uvicorn server:app --reload
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
