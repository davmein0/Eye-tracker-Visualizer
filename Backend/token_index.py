
"""
Token Index Definition:
token_index: Dict[token_id, {
    "token_id": str,
    "text": str,
    "start": (line, col),
    "end": (line, col),
    "type": str,
    "fixations": List[Fixation]
}]
"""
from fixation_finder import parse_eye_tracking, group_fixations, finalize_fixation
from tokenize_code import extract_tokens

def build_token_index(tokens):
    index = {}
    for t in tokens:
        index[t["token_id"]] = {
            **t,
            "fixations": []
        }
    return index

def attach_fixations_to_tokens(token_index, fixations):
    for f in fixations:
        tid = f["token_id"]
        if tid in token_index:
            token_index[tid]["fixations"].append(f)




def run(xml_path, code_path, code_string, language):
    gazes = parse_eye_tracking(xml_path)
    fixation_groups = group_fixations(gazes)
    fixations = [finalize_fixation(f) for f in fixation_groups]

    tokens = extract_tokens(code_string, language, code_path)
    token_index = build_token_index(tokens)

    attach_fixations_to_tokens(token_index, fixations)

    # Debug: this fails if
    # 1. spans don't match,
    # 2. token_id is unstable, or
    # 3. language parsing mismatch.
    # assert all(
    #     f["token_id"] in token_index
    #     for f in fixations
    # )

    for token in token_index.values():
        print(token)

    print(f"Number of fixations: {len(fixations)}\n")

    for fixation in fixations[:5]:
        print(fixation)

    return {
        "tokens": list(token_index.values()),
        "fixations": fixations
    }

if __name__ == '__main__':
    code_str = """
def add(a, b):
    return a + b
    
def make_file_id(path: str) -> str:
    if not path:
        return "unknown"

    normalized = str(Path(path).resolve()).lower()
    # print(normalized)
    file_id = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:8]
    return file_id
    """
    xml_path = "..\data\eye_tracking.xml"
    language = "python"
    code_path = "tokenize_code.py"
    output = run(xml_path, code_str, code_path, language)

    #print(output)