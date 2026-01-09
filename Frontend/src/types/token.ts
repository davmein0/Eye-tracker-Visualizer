type Span = {
  'line': number;
  'col': number;
};

export type Token = {
  'type': string;
  'text': string;
  'start': Span;
  'end': Span;
  'token_id': string;
};