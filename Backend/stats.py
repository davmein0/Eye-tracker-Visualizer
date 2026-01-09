

def compute_stats(token_index):
    attention = {
        "fixation_count": len(token_index['fixations']),
        "total_dwell_ms": sum(f['duration_ms'] for f in token_index['fixations'])
    }
    return attention