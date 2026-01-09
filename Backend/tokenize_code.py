# tokenize_code.py
from tree_sitter import Node
from tree_sitter_languages import get_language, get_parser
import hashlib
from pathlib import Path
from fixation_finder import make_file_id

def extract_code_string(file_path: str):
    with open(file_path, "r", encoding='utf-8', errors='replace') as f:
        return f.read()

def extract_tokens(code: str, language_name: str, file_path: str):
    language = get_language(language_name)
    parser = get_parser(language_name)

    tree = parser.parse(code.encode("utf8"))
    root = tree.root_node

    file_id = make_file_id(file_path)

    tokens = []
    _walk(root, code, tokens)

    # Add token_id AFTER walk
    for t in tokens:
        t["token_id"] = make_token_id(file_id, t)


    return tokens


def _walk(node: Node, code: str, tokens: list):
    """
    Collect *leaf* nodes (actual tokens).
    """
    if node.child_count == 0:
        text = code[node.start_byte : node.end_byte]
        if text.strip():  # skip whitespace
            tokens.append({
                "type": node.type,
                "text": text,
                "start": {
                    "line": node.start_point[0] + 1,
                    "column": node.start_point[1] + 1,
                },
                "end": {
                    "line": node.end_point[0] + 1,
                    "column": node.end_point[1] + 1,
                },
            })
        return

    for child in node.children:
        _walk(child, code, tokens)

def make_token_id(file_id, token):
    span = f"{token['start']['line']}:{token['start']['column']}-" \
           f"{token['end']['line']}:{token['end']['column']}"
    raw = f"{file_id}:{span}"
    #encoded = hashlib.sha1(raw.encode()).hexdigest()[:12]
    return raw

if __name__ == '__main__':
    code = extract_code_string("tokenize_code.py")
#     code = """
# def add(a, b):
#     return a + b
#
# def make_file_id(path: str) -> str:
#     if not path:
#         return "unknown"
#
#     normalized = str(Path(path).resolve()).lower()
#     # print(normalized)
#     file_id = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:8]
#     return file_id
# """
    tokens = extract_tokens(code, "python", "tokenize_code.py")
    for t in tokens:
        print(t)


# Use one in fixation_finder.py
# def make_file_id(path: str) -> str:
#     if not path:
#         return "unknown"
#
#     normalized = str(Path(path).resolve()).lower()
#     # print(normalized)
#     file_id = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:8]
#     return file_id
