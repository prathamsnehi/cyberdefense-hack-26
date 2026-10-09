// Stub until WS-D's src/senso.ts lands. Same exports; never calls Senso.
export async function addLesson(_title: string, _text: string): Promise<void> {}
export async function searchLessons(_query: string): Promise<string> { return "(senso disabled)"; }
